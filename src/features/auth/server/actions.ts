"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { site } from "@/config";
import { publicEnv } from "@/config/env";
import { DEFAULT_LOCALE } from "@/config/locale";
import { ROUTES } from "@/config/routes";
import { db, schema } from "@/infrastructure/db";
import { clientIp, rateLimit } from "@/infrastructure/db/helpers";
import { ownsUpload } from "@/features/uploads/server";
import { mediaUrl, storage } from "@/infrastructure/storage";
import { supabaseAdmin, supabaseServer } from "@/infrastructure/supabase/server";
import type { MessageKey } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { safeNext } from "../next-path";
import { phoneSchema } from "../phone";
import { getViewer, setRole } from "./session";

export type AuthResult = { ok: true } | { ok: false; error: MessageKey };

const emailSchema = z.email().max(200);

/** /auth/callback on the origin the person is using (falls back to the site URL). */
async function callbackUrl(locale: string, next?: string | null): Promise<string> {
  const origin = (await headers()).get("origin") ?? site.url;
  const url = new URL("/auth/callback/", /^https?:\/\//.test(origin) ? origin : site.url);
  url.searchParams.set("locale", locale);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export async function sendCode(
  email: string,
  locale = DEFAULT_LOCALE,
  next?: string | null,
): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: "auth.emailInvalid" };
  const ip = await clientIp();
  const allowed =
    (await rateLimit(`otp:email:${parsed.data}`, 5, 15 * 60)) &&
    (await rateLimit(`otp:ip:${ip}`, 20, 15 * 60));
  if (!allowed) return { ok: false, error: "common.tooMany" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    // The email shows the 6-digit code; where the template only has a link
    // (Supabase's default), the link signs in through /auth/callback instead.
    options: { shouldCreateUser: true, emailRedirectTo: await callbackUrl(locale, next) },
  });
  if (error) return { ok: false, error: error.status === 429 ? "common.tooMany" : "common.genericError" };
  return { ok: true };
}

export async function verifyCode(
  locale: string,
  email: string,
  code: string,
  next: string | null,
): Promise<{ ok: true; url: string } | { ok: false; error: MessageKey }> {
  const token = code.replace(/\D/g, "");
  if (token.length !== 6) return { ok: false, error: "auth.codeInvalid" };
  const ip = await clientIp();
  const address = email.trim().toLowerCase();
  // Per email as well as per IP: guessing one person's code from many IPs stays capped.
  if (
    !(await rateLimit(`verify:email:${address}`, 10, 15 * 60)) ||
    !(await rateLimit(`verify:${ip}`, 30, 15 * 60))
  )
    return { ok: false, error: "common.tooMany" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    email: address,
    token,
    type: "email",
  });
  if (error) return { ok: false, error: "auth.codeInvalid" };
  // The browser loads the page itself: a soft redirect would keep the header's
  // Supabase client (which read the cookies at page load) signed out.
  return { ok: true, url: safeNext(next, localeHref(locale, ROUTES.account), locale) };
}

/** Seeded demo accounts (supabase/seeds/02_demo.sql); their shared password is public there. */
const DEMO_ACCOUNTS = {
  owner: "owner@demo.jotno.test",
  vet: "nusrat@demo.jotno.test",
  admin: "admin@demo.jotno.test",
} as const;
const DEMO_PASSWORD = "jotno-demo-password";

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

/** Demo site only: sign in as a seeded account with one click. */
export async function demoSignIn(
  locale: string,
  role: DemoRole,
): Promise<{ ok: true; url: string } | { ok: false; error: MessageKey }> {
  if (!publicEnv.NEXT_PUBLIC_DEMO || !publicEnv.NEXT_PUBLIC_DEMO_LOGIN || !Object.hasOwn(DEMO_ACCOUNTS, role))
    return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`demo:${await clientIp()}`, 30, 15 * 60)))
    return { ok: false, error: "common.tooMany" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role],
    password: DEMO_PASSWORD,
  });
  if (error) return { ok: false, error: "common.genericError" };
  const home = role === "admin" ? ROUTES.admin : role === "vet" ? ROUTES.dashboard : ROUTES.account;
  return { ok: true, url: localeHref(locale, home) };
}

export async function signOut(locale: string): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(localeHref(locale, ROUTES.home));
}

const onboardingSchema = z.object({
  role: z.enum(["owner", "vet"]),
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema.optional().or(z.literal("")),
  districtId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

export async function completeOnboarding(
  locale: string,
  input: OnboardingInput,
  next: string | null,
): Promise<{ ok: true; url: string } | { ok: false; error: MessageKey }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "phone" ? "common.phoneInvalid" : "onboarding.nameInvalid" };
  }
  const { role, fullName, phone } = parsed.data;
  await db()
    .update(schema.profiles)
    .set({
      fullName,
      phone: phone || null,
      onboarded: true,
      locale,
      homeDistrictId: parsed.data.districtId ?? null,
      homeAreaId: parsed.data.areaId ?? null,
    })
    .where(eq(schema.profiles.id, viewer.id));

  if (role === "vet" && viewer.role === "owner") {
    await setRole(viewer.id, "vet");
    const { ensureDraftProvider } = await import("@/features/providers/server");
    await ensureDraftProvider(
      viewer.id,
      fullName,
      parsed.data.districtId ?? null,
      parsed.data.areaId ?? null,
    );
    redirect(localeHref(locale, ROUTES.vetProfile));
  }
  redirect(safeNext(next, localeHref(locale, role === "vet" ? ROUTES.dashboard : ROUTES.account), locale));
}

const profileSchema = onboardingSchema
  .omit({ role: true })
  .extend({ avatarPath: z.string().max(200).nullable().optional() });

/** Settings page: name, phone, home area and photo. */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<AuthResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "phone" ? "common.phoneInvalid" : "onboarding.nameInvalid" };
  }
  const avatarPath = parsed.data.avatarPath === undefined ? viewer.avatarPath : parsed.data.avatarPath;
  if (avatarPath && avatarPath !== viewer.avatarPath && !ownsUpload(avatarPath, "avatar", viewer.id))
    return { ok: false, error: "common.notAllowed" };
  await db()
    .update(schema.profiles)
    .set({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      homeDistrictId: parsed.data.districtId ?? null,
      homeAreaId: parsed.data.areaId ?? null,
      avatarPath,
    })
    .where(eq(schema.profiles.id, viewer.id));
  if (avatarPath !== viewer.avatarPath) {
    // The header reads the photo from the session, so keep a copy in the account's metadata.
    await supabaseAdmin()
      .auth.admin.updateUserById(viewer.id, { user_metadata: { avatar_path: avatarPath } })
      .catch(() => undefined);
    if (viewer.avatarPath) await storage.remove("media", [viewer.avatarPath]).catch(() => undefined);
  }
  return { ok: true };
}

export interface HeaderProfile {
  name: string | null;
  avatarUrl: string | null;
}

/**
 * The header's picture of the signed-in person, read from the database so it
 * is the real photo even when the session token has none: the photo uploaded
 * on Jotno, else the vet profile photo, else the Google one.
 */
export async function headerProfile(): Promise<HeaderProfile | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  let path = viewer.avatarPath;
  if (!path && viewer.role !== "owner") {
    const [vet] = await db()
      .select({ photo: schema.providers.photoPath })
      .from(schema.providers)
      .where(eq(schema.providers.profileId, viewer.id))
      .limit(1);
    path = vet?.photo ?? null;
  }
  let avatarUrl = mediaUrl(path);
  if (!avatarUrl) {
    const { data } = await (await supabaseServer()).auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const google = meta.avatar_url ?? meta.picture;
    avatarUrl = typeof google === "string" && google.startsWith("https://") ? google : null;
  }
  return { name: viewer.fullName, avatarUrl };
}
