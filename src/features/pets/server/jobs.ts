import "server-only";
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { petPath } from "@/config/routes";
import { addDays, daysBetween, reminderDue, type ReminderStage } from "@/features/health";
import { notify } from "@/features/notifications/server";
import { formatter, translator, type MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { stillCurrent } from "../care";

const H = schema.healthRecords;

const TITLE: Record<ReminderStage, MessageKey> = {
  week: "remind.healthWeek",
  tomorrow: "remind.healthTomorrow",
  today: "remind.healthToday",
};

/**
 * Daily (02:00 UTC, 8 am in Dhaka): push a reminder in the week before a
 * vaccine/deworming/check-up is due, the day before and on the day. A stage a
 * failed run missed goes out on the next run (reminderDue).
 */
export async function runHealthReminders(now = new Date()): Promise<{ reminded: number }> {
  const today = dhakaDay(now);
  const rows = await db()
    .select({
      id: H.id,
      title: H.title,
      kind: H.kind,
      givenOn: H.givenOn,
      dueOn: H.dueOn,
      remindedAt: H.remindedAt,
      petId: schema.patients.id,
      petName: schema.patients.name,
      ownerId: schema.patients.ownerId,
      locale: schema.profiles.locale,
    })
    .from(H)
    .innerJoin(schema.patients, eq(schema.patients.id, H.patientId))
    .innerJoin(schema.profiles, eq(schema.profiles.id, schema.patients.ownerId))
    .where(and(isNotNull(H.dueOn), gte(H.dueOn, today), lte(H.dueOn, addDays(today, 7))))
    .limit(2000);
  // Only the newest record of each vaccine/deworming line counts: last year's
  // shot that this year's replaced must not remind again.
  const petIds = [...new Set(rows.map((r) => r.petId))];
  const history =
    petIds.length === 0
      ? []
      : await db()
          .select({
            id: H.id,
            petId: H.patientId,
            kind: H.kind,
            title: H.title,
            givenOn: H.givenOn,
            dueOn: H.dueOn,
          })
          .from(H)
          .where(inArray(H.patientId, petIds));
  let reminded = 0;
  for (const r of stillCurrent(rows, history)) {
    if (!r.dueOn) continue;
    const stage = reminderDue(r.dueOn, today, r.remindedAt ? dhakaDay(r.remindedAt) : null);
    if (!stage) continue;
    const t = translator(r.locale);
    const n = formatter(r.locale).number(daysBetween(today, r.dueOn));
    await notify(r.ownerId, "health.due", {
      title: t(TITLE[stage], { pet: r.petName, title: r.title, n }),
      body: t("remind.healthBody"),
      url: localeHref(r.locale, petPath(r.petId)),
      tag: `health-${r.id}`,
    });
    await db().update(H).set({ remindedAt: now }).where(eq(H.id, r.id));
    reminded += 1;
  }
  return { reminded };
}
