import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { chatPath, orderPath, ROUTES } from "@/config/routes";
import { db, schema } from "@/infrastructure/db";

const P = schema.payments;
type Purpose = (typeof P.$inferSelect)["purpose"];

/** Where the payer goes once it's done (or to check on it). */
export function targetPath(purpose: Purpose, refId: string): string {
  switch (purpose) {
    case "consult":
      return chatPath(refId);
    case "appointment":
      return ROUTES.appointments;
    case "featured":
      return ROUTES.vetFeatured;
    case "order":
      return orderPath(refId);
  }
}

export interface PayTarget {
  /** e.g. the vet's name, "Order #1042", "7 days featured". */
  title: string;
  detail: string | null;
}

async function describe(purpose: Purpose, refId: string, locale: string): Promise<PayTarget> {
  const bn = locale === "bn";
  if (purpose === "consult" || purpose === "appointment") {
    const table = purpose === "consult" ? schema.consults : schema.appointments;
    const [row] = await db()
      .select({ name: schema.providers.displayName })
      .from(table)
      .innerJoin(schema.providers, eq(schema.providers.id, table.providerId))
      .where(eq(table.id, refId))
      .limit(1);
    const what =
      purpose === "consult"
        ? bn
          ? "২৪ ঘণ্টার পেইড চ্যাট"
          : "24-hour paid chat"
        : bn
          ? "চেম্বার ভিজিট বুকিং ফি"
          : "Clinic visit booking fee";
    return { title: row?.name ?? "", detail: what };
  }
  if (purpose === "order") {
    const [o] = await db()
      .select({ number: schema.orders.number })
      .from(schema.orders)
      .where(eq(schema.orders.id, refId))
      .limit(1);
    return { title: bn ? `অর্ডার #${o?.number ?? ""}` : `Order #${o?.number ?? ""}`, detail: null };
  }
  const [slot] = await db()
    .select({ startsAt: schema.featuredSlots.startsAt, endsAt: schema.featuredSlots.endsAt })
    .from(schema.featuredSlots)
    .where(eq(schema.featuredSlots.id, refId))
    .limit(1);
  const days = slot ? Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 86_400_000) : 0;
  return { title: bn ? `${days} দিনের ফিচার্ড` : `${days} days featured`, detail: null };
}

/** A payment for its payer (or null), with what it is for. */
export async function paymentForPayer(id: string, userId: string, locale: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db()
    .select()
    .from(P)
    .where(and(eq(P.id, id), eq(P.userId, userId)))
    .limit(1);
  if (!p) return null;
  return { ...p, target: await describe(p.purpose, p.refId, locale), back: targetPath(p.purpose, p.refId) };
}

/** Admin: trx ids waiting to be checked (oldest first) and refunds to send. */
export async function paymentQueues(locale: string) {
  const payer = {
    name: schema.profiles.fullName,
    email: schema.profiles.email,
  };
  const [review, refunds, recent] = await Promise.all([
    db()
      .select({ p: P, payer })
      .from(P)
      .leftJoin(schema.profiles, eq(schema.profiles.id, P.userId))
      .where(eq(P.status, "review"))
      .orderBy(asc(P.submittedAt))
      .limit(100),
    db()
      .select({ p: P, payer })
      .from(P)
      .leftJoin(schema.profiles, eq(schema.profiles.id, P.userId))
      .where(eq(P.status, "refund_due"))
      .orderBy(asc(P.createdAt))
      .limit(100),
    db()
      .select({ p: P, payer })
      .from(P)
      .leftJoin(schema.profiles, eq(schema.profiles.id, P.userId))
      .where(inArray(P.status, ["paid", "refunded"]))
      .orderBy(desc(P.reviewedAt), desc(P.paidAt))
      .limit(30),
  ]);
  const withTarget = (rows: typeof review) =>
    Promise.all(
      rows.map(async (r) => ({
        ...r.p,
        payer: r.payer,
        target: await describe(r.p.purpose, r.p.refId, locale),
        back: targetPath(r.p.purpose, r.p.refId),
      })),
    );
  return {
    review: await withTarget(review),
    refunds: await withTarget(refunds),
    recent: await withTarget(recent),
  };
}

export type QueuedPayment = Awaited<ReturnType<typeof paymentQueues>>["review"][number];
