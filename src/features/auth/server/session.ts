import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { cache } from "react";
import { serverEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { db, schema } from "@/infrastructure/db";
import { supabaseAdmin, supabaseServer } from "@/infrastructure/supabase/server";
import { localeHref } from "@/lib/locale-href";

export type Role = "owner" | "vet" | "admin";

export interface Viewer {
  id: string;
  email: string | null;
  role: Role;
  fullName: string | null;
  phone: string | null;
  avatarPath: string | null;
  onboarded: boolean;
  locale: string;
  homeDistrictId: number | null;
  homeAreaId: number | null;
}

/**
 * The signed-in person for this request, or null. The JWT is verified
 * (getClaims), then the profile is read from the database: the role there is
 * the truth, never a value from the browser.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [profile] = await db()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, claims.sub))
    .limit(1);
  if (!profile) return null;

  // First admins come from ADMIN_EMAILS (no admin exists to promote them).
  const email =
    (profile.email ?? (typeof claims.email === "string" ? claims.email : null))?.toLowerCase() ?? null;
  if (email && profile.role !== "admin" && serverEnv().ADMIN_EMAILS.includes(email)) {
    await setRole(profile.id, "admin");
    profile.role = "admin";
  }

  return {
    id: profile.id,
    email,
    role: profile.role,
    fullName: profile.fullName,
    phone: profile.phone,
    avatarPath: profile.avatarPath,
    onboarded: profile.onboarded,
    locale: profile.locale,
    homeDistrictId: profile.homeDistrictId,
    homeAreaId: profile.homeAreaId,
  };
});

/** Signed in, or off to the sign-in page (and back to `next` afterwards). */
export async function requireViewer(locale: string, next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(next)}` as Route);
  }
  if (!viewer.onboarded) {
    redirect(`${localeHref(locale, ROUTES.onboarding)}/?next=${encodeURIComponent(next)}` as Route);
  }
  return viewer;
}

/** Signed in with one of the roles, otherwise home. Admins pass every check. */
export async function requireRole(roles: Role[], locale: string, next: string): Promise<Viewer> {
  const viewer = await requireViewer(locale, next);
  if (viewer.role !== "admin" && !roles.includes(viewer.role)) redirect(localeHref(locale, ROUTES.home));
  return viewer;
}

/**
 * For Server Actions: the viewer or null (actions return an error instead of
 * redirecting, so forms can show it).
 */
export async function actionViewer(roles?: Role[]): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  if (roles && viewer.role !== "admin" && !roles.includes(viewer.role)) return null;
  return viewer;
}

/**
 * Changes a role in the profile and in the JWT's app_metadata (so the header
 * and proxy can show the right menu without a database call).
 */
export async function setRole(userId: string, role: Role): Promise<void> {
  await db().update(schema.profiles).set({ role }).where(eq(schema.profiles.id, userId));
  await supabaseAdmin()
    .auth.admin.updateUserById(userId, { app_metadata: { role } })
    .catch(() => undefined);
}
