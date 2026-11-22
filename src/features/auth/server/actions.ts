"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES } from "@/config/routes";
import { db, schema } from "@/infrastructure/db";
import { clientIp, rateLimit } from "@/infrastructure/db/helpers";
import { supabaseServer } from "@/infrastructure/supabase/server";
import type { MessageKey } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { safeNext } from "../next-path";
import { phoneSchema } from "../phone";
import { getViewer, setRole } from "./session";

export type AuthResult = { ok: true } | { ok: false; error: MessageKey };

const emailSchema = z.email().max(200);

export async function sendCode(email: string): Promise<AuthResult> {
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
    options: { shouldCreateUser: true },
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
  if (!(await rateLimit(`verify:${ip}`, 30, 15 * 60))) return { ok: false, error: "common.tooMany" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: "email",
  });
  if (error) return { ok: false, error: "auth.codeInvalid" };
  // The browser loads the page itself: a soft redirect would keep the header's
  // Supabase client (which read the cookies at page load) signed out.
  return { ok: true, url: safeNext(next, localeHref(locale, ROUTES.account), locale) };
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

const profileSchema = onboardingSchema.omit({ role: true });

/** Settings page: name, phone and home area. */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<AuthResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "phone" ? "common.phoneInvalid" : "onboarding.nameInvalid" };
  }
  await db()
    .update(schema.profiles)
    .set({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      homeDistrictId: parsed.data.districtId ?? null,
      homeAreaId: parsed.data.areaId ?? null,
    })
    .where(eq(schema.profiles.id, viewer.id));
  return { ok: true };
}
