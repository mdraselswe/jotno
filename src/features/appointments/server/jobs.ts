import "server-only";
import { eq } from "drizzle-orm";
import { ROUTES } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { db, schema } from "@/infrastructure/db";
import { appointmentsToRemind } from "./queries";

const A = schema.appointments;

/**
 * Every few minutes: remind owners about visits in the next 3 hours (once).
 * Unpaid holds are released by the payments job (expireUnpaid).
 */
export async function runAppointmentJobs(): Promise<{ reminded: number }> {
  let reminded = 0;
  for (const a of await appointmentsToRemind(3)) {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Dhaka",
    }).format(a.startsAt);
    await notify(a.ownerId, "appointment.reminder", {
      title: `Visit with ${a.vetName} at ${time}`,
      body: "Bring your pet's vaccine card.",
      url: ROUTES.appointments,
      tag: `appt-${a.id}`,
    });
    await db().update(A).set({ remindedAt: new Date() }).where(eq(A.id, a.id));
    reminded += 1;
  }

  return { reminded };
}
