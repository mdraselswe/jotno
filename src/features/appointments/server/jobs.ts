import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { ROUTES } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { db, schema } from "@/infrastructure/db";
import { appointmentsToRemind } from "./queries";

const A = schema.appointments;

/**
 * Every few minutes: free slots held by abandoned checkouts (30 min) and
 * remind owners about visits in the next 3 hours (once).
 */
export async function runAppointmentJobs(): Promise<{ released: number; reminded: number }> {
  const released = await db()
    .update(A)
    .set({ status: "cancelled" })
    .where(and(eq(A.status, "pending_payment"), sql`${A.createdAt} < now() - interval '30 minutes'`))
    .returning({ id: A.id });

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

  // Shop orders abandoned at checkout.
  await db()
    .update(schema.orders)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.orders.status, "pending_payment"),
        sql`${schema.orders.createdAt} < now() - interval '1 day'`,
      ),
    );

  return { released: released.length, reminded };
}
