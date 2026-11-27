import "server-only";
import { eq } from "drizzle-orm";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { formatter, translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { localeHref } from "@/lib/locale-href";
import { appointmentsToRemind } from "./queries";

const A = schema.appointments;

/**
 * Every run of `frequent`: remind owners, once, about confirmed visits in the
 * next `business.appointment.reminderHours` hours, in their own language.
 * Unpaid holds are released by the payments job (expireUnpaid).
 */
export async function runAppointmentJobs(): Promise<{ reminded: number }> {
  let reminded = 0;
  for (const a of await appointmentsToRemind(business.appointment.reminderHours)) {
    const t = translator(a.locale);
    const time = formatter(a.locale).date(a.startsAt, { hour: "numeric", minute: "2-digit" });
    await notify(a.ownerId, "appointment.reminder", {
      title: t("remind.visitTitle", { vet: a.vetName, time }),
      body: t("remind.visitBody"),
      url: localeHref(a.locale, ROUTES.appointments),
      tag: `appt-${a.id}`,
    });
    await db().update(A).set({ remindedAt: new Date() }).where(eq(A.id, a.id));
    reminded += 1;
  }

  return { reminded };
}
