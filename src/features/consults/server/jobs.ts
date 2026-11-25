import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { business } from "@/config";
import { adminConsultPath, chatPath } from "@/config/routes";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { refundConsult } from "@/features/payments/server";
import { translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { localeHref } from "@/lib/locale-href";
import { nudgeStep } from "../rules";

const C = schema.consults;

/**
 * Every few minutes (cron): refund chats the vet never answered in time, and
 * close chats whose time is over. Each step is idempotent.
 */
export async function runConsultJobs(): Promise<{ nudged: number; refunded: number; closed: number }> {
  const window = business.consult.replyWindowMinutes;
  const nudged = await nudgeSilentVets(window);
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
  return { nudged, refunded, closed: over.length };
}

/**
 * Chats still waiting for the vet's first reply get pushed again: the vet at a
 * third and two thirds of the reply window, the admins at two thirds (so
 * someone can phone the vet). Each step goes out once, remembered in the
 * notifications table.
 */
async function nudgeSilentVets(window: number): Promise<number> {
  const rows = await db()
    .select({
      id: C.id,
      openedAt: C.openedAt,
      vetId: schema.providers.profileId,
      vetName: schema.providers.displayName,
      vetPhone: schema.profiles.phone,
      vetLocale: schema.profiles.locale,
      ownerName: sql<string | null>`(select full_name from profiles o where o.id = ${C.ownerId})`,
    })
    .from(C)
    .innerJoin(schema.providers, eq(schema.providers.id, C.providerId))
    .innerJoin(schema.profiles, eq(schema.profiles.id, schema.providers.profileId))
    .where(and(eq(C.status, "active"), isNull(C.firstReplyAt)))
    .limit(100);
  const now = new Date();
  let nudged = 0;
  for (const r of rows) {
    if (!r.openedAt) continue;
    const step = nudgeStep(r.openedAt, now, window);
    if (step === 0) continue;
    const [sent] = await db()
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, r.vetId),
          eq(schema.notifications.kind, "consult.nudge"),
          sql`${schema.notifications.data}->>'consultId' = ${r.id}`,
          sql`${schema.notifications.data}->>'step' = ${String(step)}`,
        ),
      )
      .limit(1);
    if (sent) continue;
    const left = Math.max(1, Math.ceil((r.openedAt.getTime() + window * 60_000 - now.getTime()) / 60_000));
    const t = translator(r.vetLocale);
    await notify(
      r.vetId,
      "consult.nudge",
      {
        title: t("consult.nudgeTitle", { name: r.ownerName ?? t("consult.nudgeSomeone") }),
        body: t("consult.nudgeBody", { n: left }),
        url: localeHref(r.vetLocale, chatPath(r.id)),
        tag: `consult-${r.id}`,
      },
      { consultId: r.id, step },
    );
    if (step === 2) {
      await notifyAdmins("consult.late", {
        title: "Vet hasn't replied",
        body: `${r.vetName}${r.vetPhone ? ` · ${r.vetPhone}` : ""} · ${left} min left before refund`,
        url: adminConsultPath(r.id),
        tag: `late-${r.id}`,
      });
    }
    nudged += 1;
  }
  return nudged;
}
