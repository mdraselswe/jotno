import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { business } from "@/config";
import { db, schema } from "@/infrastructure/db";
import { freeSlots, nextDays, type OpeningHours } from "../slots";

const A = schema.appointments;
const HELD = ["pending_payment", "confirmed", "completed"] as const;

export async function getHours(providerId: string): Promise<OpeningHours[]> {
  return db()
    .select({
      weekday: schema.availability.weekday,
      startMinute: schema.availability.startMinute,
      endMinute: schema.availability.endMinute,
      slotMinutes: schema.availability.slotMinutes,
    })
    .from(schema.availability)
    .where(eq(schema.availability.providerId, providerId))
    .orderBy(asc(schema.availability.weekday), asc(schema.availability.startMinute));
}

export interface BookingDay {
  day: string;
  slots: string[];
}

/** Free slots for the next `business.appointment.daysAhead` days (ISO start instants). */
export async function bookingDays(providerId: string, now = new Date()): Promise<BookingDay[]> {
  const hours = await getHours(providerId);
  if (hours.length === 0) return [];
  const days = nextDays(now, business.appointment.daysAhead);
  const until = new Date(now.getTime() + (business.appointment.daysAhead + 1) * 86_400_000);
  const taken = await db()
    .select({ startsAt: A.startsAt })
    .from(A)
    .where(
      and(
        eq(A.providerId, providerId),
        inArray(A.status, [...HELD]),
        gte(A.startsAt, now),
        lt(A.startsAt, until),
      ),
    );
  const takenDates = taken.map((r) => r.startsAt);
  return days
    .map((day) => ({
      day,
      slots: freeSlots(day, hours, takenDates, now, business.appointment.leadMinutes).map((s) =>
        s.start.toISOString(),
      ),
    }))
    .filter((d) => d.slots.length > 0);
}

export interface AppointmentItem {
  id: string;
  startsAt: Date;
  status: (typeof A.$inferSelect)["status"];
  reason: string | null;
  visitFee: number;
  bookingFee: number;
  vetName: string;
  vetSlug: string;
  clinic: string | null;
  address: string | null;
  phone: string | null;
  petName: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
}

function select() {
  return db()
    .select({
      id: A.id,
      startsAt: A.startsAt,
      status: A.status,
      reason: A.reason,
      visitFee: A.visitFee,
      bookingFee: A.bookingFee,
      vetName: schema.providers.displayName,
      vetSlug: schema.providers.slug,
      clinic: schema.providers.clinicName,
      address: schema.providers.address,
      phone: schema.providers.phonePublic,
      petName: schema.patients.name,
      ownerName: schema.profiles.fullName,
      ownerPhone: schema.profiles.phone,
    })
    .from(A)
    .innerJoin(schema.providers, eq(schema.providers.id, A.providerId))
    .innerJoin(schema.profiles, eq(schema.profiles.id, A.ownerId))
    .leftJoin(schema.patients, eq(schema.patients.id, A.patientId));
}

export async function listOwnerAppointments(ownerId: string): Promise<AppointmentItem[]> {
  return select()
    .where(and(eq(A.ownerId, ownerId), inArray(A.status, ["confirmed", "completed", "cancelled", "no_show"])))
    .orderBy(desc(A.startsAt))
    .limit(100);
}

export async function listVetAppointments(providerId: string, upcoming: boolean): Promise<AppointmentItem[]> {
  const now = new Date(Date.now() - 2 * 3_600_000);
  return upcoming
    ? select()
        .where(and(eq(A.providerId, providerId), eq(A.status, "confirmed"), gte(A.startsAt, now)))
        .orderBy(asc(A.startsAt))
        .limit(200)
    : select()
        .where(
          and(
            eq(A.providerId, providerId),
            inArray(A.status, ["confirmed", "completed", "cancelled", "no_show"]),
            lt(A.startsAt, now),
          ),
        )
        .orderBy(desc(A.startsAt))
        .limit(100);
}

/** Confirmed visits starting within the next `hours` that have not been reminded. */
export async function appointmentsToRemind(hours = 3) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3_600_000);
  return db()
    .select({
      id: A.id,
      ownerId: A.ownerId,
      startsAt: A.startsAt,
      remindedAt: A.remindedAt,
      vetName: schema.providers.displayName,
      locale: schema.profiles.locale,
    })
    .from(A)
    .innerJoin(schema.providers, eq(schema.providers.id, A.providerId))
    .innerJoin(schema.profiles, eq(schema.profiles.id, A.ownerId))
    .where(and(eq(A.status, "confirmed"), gte(A.startsAt, now), lt(A.startsAt, until)))
    .then((rows) => rows.filter((r) => !r.remindedAt));
}
