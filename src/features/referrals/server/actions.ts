"use server";

import { and, eq, gt, gte, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { atLeast } from "../levels";
import { addDays } from "../points";
import { awardSignup, ensureCode, levelOf, rememberMyCode } from "./referrals";

export type GrowResult = { ok: true } | { ok: false; error: MessageKey };

/** Puts the signed-in person's invite code in the share button's cookie. */
export async function syncMyCode(): Promise<void> {
  const viewer = await actionViewer();
  if (!viewer) return;
  await rememberMyCode(await ensureCode(viewer.id));
}

/** Gold vets: a free featured week once a month (needs a free spot in their district). */
export async function claimGoldFeatured(locale: string): Promise<GrowResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`gold:${viewer.id}`, 5, 3600))) return { ok: false, error: "common.tooMany" };
  const [vet] = await db()
    .select({
      id: schema.providers.id,
      status: schema.providers.status,
      districtId: schema.providers.districtId,
    })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, viewer.id))
    .limit(1);
  if (!vet || vet.status !== "verified") return { ok: false, error: "featured.verifiedOnly" };
  if (!vet.districtId) return { ok: false, error: "featured.needDistrict" };
  if (!atLeast(await levelOf(viewer.id), "gold")) return { ok: false, error: "grow.goldOnly" };

  const F = schema.featuredSlots;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [used] = await db()
    .select({ id: F.id })
    .from(F)
    .where(and(eq(F.providerId, vet.id), eq(F.source, "referral_gold"), gte(F.createdAt, monthStart)))
    .limit(1);
  if (used) return { ok: false, error: "grow.goldUsed" };
  const [{ active } = { active: 0 }] = await db()
    .select({ active: sql<number>`count(*)::int` })
    .from(F)
    .where(and(eq(F.districtId, vet.districtId), gt(F.endsAt, now), sql`${F.startsAt} <= now()`));
  if (Number(active) >= business.featured.maxPerDistrict) return { ok: false, error: "admin.featuredFull" };

  const [slot] = await db()
    .insert(F)
    .values({
      providerId: vet.id,
      districtId: vet.districtId,
      startsAt: now,
      endsAt: addDays(now, business.referral.goldFeaturedDays),
      source: "referral_gold",
      createdBy: viewer.id,
    })
    .returning({ id: F.id });
  await audit(viewer.id, "featured.gold", "featured_slot", slot?.id ?? null);
  revalidatePath(localeHref(locale, ROUTES.vetPromote));
  return { ok: true };
}

/**
 * Admin: flag an invite (its points are taken back) or clear it (points
 * restored, or given now if it was flagged from the start).
 */
export async function setInviteStatus(refereeId: string, status: "ok" | "flagged"): Promise<GrowResult> {
  const viewer = await actionViewer(["admin"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const RF = schema.referrals;
  const P = schema.points;
  const [row] = await db()
    .update(RF)
    .set({ status, flagReason: status === "flagged" ? "admin" : null })
    .where(and(eq(RF.refereeId, refereeId), ne(RF.status, status)))
    .returning();
  if (!row) return { ok: false, error: "common.genericError" };
  const ours = and(
    eq(P.refType, "referral"),
    eq(P.refId, refereeId),
    inArray(P.kind, ["signup", "welcome", "first_paid"]),
  );
  if (status === "flagged") {
    await db().update(P).set({ status: "void" }).where(ours);
  } else {
    const restored = await db()
      .update(P)
      .set({
        status:
          row.activatedAt === null
            ? sql`case when ${P.kind} = 'signup' then 'pending' else 'available' end`
            : "available",
      })
      .where(and(ours, eq(P.status, "void")))
      .returning({ id: P.id });
    const [any] = await db().select({ id: P.id }).from(P).where(ours).limit(1);
    if (restored.length === 0 && !any) await awardSignup(row.referrerId, refereeId);
  }
  await audit(viewer.id, `referral.${status}`, "referral", refereeId);
  revalidatePath(ROUTES.adminReferrals);
  return { ok: true };
}
