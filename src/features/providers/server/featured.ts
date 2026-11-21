"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { business } from "@/config";
import { actionViewer } from "@/features/auth/server";
import { beginPayment } from "@/features/payments/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { rateLimit } from "@/infrastructure/db/helpers";

const F = schema.featuredSlots;
/** Unpaid slots wait here (far future) so they never show until payment lands. */
const PARKED = new Date("2999-01-01T00:00:00Z");

export type FeaturedResult = { ok: true } | { ok: false; error: MessageKey };

/** Vet: buy a featured pack for their own district. */
export async function buyFeatured(locale: string, packIndex: number): Promise<FeaturedResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const pack = business.featured.packs[packIndex];
  if (!pack) return { ok: false, error: "common.genericError" };
  if (!(await rateLimit(`featured:${viewer.id}`, 5, 3600))) return { ok: false, error: "common.tooMany" };

  const [vet] = await db()
    .select({
      id: schema.providers.id,
      status: schema.providers.status,
      districtId: schema.providers.districtId,
      name: schema.providers.displayName,
    })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, viewer.id))
    .limit(1);
  if (!vet || vet.status !== "verified") return { ok: false, error: "featured.verifiedOnly" };
  if (!vet.districtId) return { ok: false, error: "featured.needDistrict" };

  const now = new Date();
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
      startsAt: PARKED,
      endsAt: new Date(PARKED.getTime() + pack.days * 86_400_000),
      source: "self",
      createdBy: viewer.id,
    })
    .returning({ id: F.id });
  if (!slot) return { ok: false, error: "common.genericError" };

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "featured",
    refId: slot.id,
    amount: pack.price,
    productName: `Jotno featured ${pack.days} days: ${vet.name}`,
    customer: {
      name: viewer.fullName ?? vet.name,
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: viewer.phone ?? "01700000000",
    },
    locale,
  });
  redirect(url as never);
}
