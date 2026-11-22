import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { cancelTarget } from "./payments";

const P = schema.payments;
type Purpose = (typeof P.$inferSelect)["purpose"];

/**
 * How long a payment may wait for the payer to send money before what it holds
 * is released. Payments whose trx id is with an admin ("review") never expire.
 */
const WAIT_MINUTES: Record<Purpose, number> = {
  appointment: 60,
  consult: 6 * 60,
  order: 24 * 60,
  featured: 2 * 24 * 60,
};

/** Every few minutes: cancel abandoned payments and free their slot, chat or stock. */
export async function expireUnpaid(): Promise<{ expired: number }> {
  let expired = 0;
  for (const [purpose, minutes] of Object.entries(WAIT_MINUTES) as [Purpose, number][]) {
    const rows = await db()
      .update(P)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(P.purpose, purpose),
          eq(P.status, "pending"),
          ne(P.gateway, "cod"),
          sql`coalesce(${P.reviewedAt}, ${P.createdAt}) < now() - make_interval(mins => ${minutes})`,
        ),
      )
      .returning({ purpose: P.purpose, refId: P.refId });
    for (const r of rows) await cancelTarget(r.purpose, r.refId);
    expired += rows.length;
  }
  return { expired };
}
