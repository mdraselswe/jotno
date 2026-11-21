import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { business } from "@/config";
import { refundConsult } from "@/features/payments/server";
import { db, schema } from "@/infrastructure/db";

const C = schema.consults;

/**
 * Every few minutes (cron): refund chats the vet never answered in time, and
 * close chats whose time is over. Each step is idempotent.
 */
export async function runConsultJobs(): Promise<{ refunded: number; closed: number }> {
  const window = business.consult.replyWindowMinutes;
  const silent = await db()
    .select({ id: C.id })
    .from(C)
    .where(
      and(
        eq(C.status, "active"),
        isNull(C.firstReplyAt),
        sql`${C.openedAt} <= now() - make_interval(mins => ${window})`,
      ),
    )
    .limit(50);
  let refunded = 0;
  for (const c of silent) {
    if (await refundConsult(c.id, "vet_no_reply", null)) refunded += 1;
  }

  const over = await db()
    .update(C)
    .set({ status: "closed", closedAt: new Date(), closeReason: "time" })
    .where(and(eq(C.status, "active"), lte(C.closesAt, new Date()), sql`${C.firstReplyAt} is not null`))
    .returning({ id: C.id });
  if (over.length > 0) {
    await db()
      .insert(schema.messages)
      .values(over.map((c) => ({ consultId: c.id, senderId: null, body: "system:closed" })));
  }
  // Pending payments older than a day are abandoned checkouts.
  await db()
    .update(C)
    .set({ status: "cancelled" })
    .where(and(eq(C.status, "pending_payment"), sql`${C.createdAt} < now() - interval '1 day'`));
  return { refunded, closed: over.length };
}
