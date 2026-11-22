"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { business } from "@/config";
import { publicEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { beginPayment, refundPlatform } from "@/features/payments/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { dhakaDay, freeSlots, toMinutes } from "../slots";
import { getHours } from "./queries";

const A = schema.appointments;
export type BookingResult = { ok: true } | { ok: false; error: MessageKey };

async function myProviderId(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({ id: schema.providers.id })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, userId))
    .limit(1);
  return row?.id ?? null;
}

const hoursSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
        slotMinutes: z.number().int().min(10).max(120),
      })
      .refine((h) => toMinutes(h.end) > toMinutes(h.start), { message: "end" }),
  )
  .max(42);

/** Vet: replaces the weekly opening hours. */
export async function saveHours(input: z.input<typeof hoursSchema>): Promise<BookingResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const providerId = await myProviderId(viewer.id);
  if (!providerId) return { ok: false, error: "common.notAllowed" };
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "appt.hoursInvalid" };
  await db().transaction(async (tx) => {
    await tx.delete(schema.availability).where(eq(schema.availability.providerId, providerId));
    if (parsed.data.length > 0) {
      await tx.insert(schema.availability).values(
        parsed.data.map((h) => ({
          providerId,
          weekday: h.weekday,
          startMinute: toMinutes(h.start),
          endMinute: toMinutes(h.end),
          slotMinutes: h.slotMinutes,
        })),
      );
    }
  });
  revalidatePath("/[locale]/dashboard/schedule", "page");
  return { ok: true };
}

const bookSchema = z.object({
  start: z.iso.datetime(),
  patientId: z.uuid().nullable(),
  reason: z.string().trim().max(500).optional(),
});

/** Owner: holds a slot and sends them to pay the booking fee. */
export async function bookAppointment(
  locale: string,
  providerId: string,
  input: z.input<typeof bookSchema>,
): Promise<BookingResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "appt.slotGone" };
  if (!(await rateLimit(`book:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };

  const [vet] = await db()
    .select({
      id: schema.providers.id,
      status: schema.providers.status,
      profileId: schema.providers.profileId,
      name: schema.providers.displayName,
      visitFee: schema.providers.visitFee,
      isDemo: schema.providers.isDemo,
    })
    .from(schema.providers)
    .where(eq(schema.providers.id, providerId))
    .limit(1);
  if (!vet || vet.status !== "verified" || vet.profileId === viewer.id)
    return { ok: false, error: "common.notAllowed" };
  // Demo vets are for the preview only: never take real money for them.
  if (vet.isDemo && !publicEnv.NEXT_PUBLIC_DEMO) return { ok: false, error: "common.notAllowed" };

  if (parsed.data.patientId) {
    const [pet] = await db()
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(and(eq(schema.patients.id, parsed.data.patientId), eq(schema.patients.ownerId, viewer.id)))
      .limit(1);
    if (!pet) return { ok: false, error: "common.notAllowed" };
  }

  // The slot must be one we would offer right now.
  const start = new Date(parsed.data.start);
  const hours = await getHours(vet.id);
  const now = new Date();
  const offered = freeSlots(dhakaDay(start), hours, [], now, business.appointment.leadMinutes).find(
    (s) => s.start.getTime() === start.getTime(),
  );
  if (!offered || start.getTime() > now.getTime() + (business.appointment.daysAhead + 1) * 86_400_000) {
    return { ok: false, error: "appt.slotGone" };
  }

  // The partial unique index (provider, starts_at) stops double booking.
  const [appt] = await db()
    .insert(A)
    .values({
      providerId: vet.id,
      ownerId: viewer.id,
      patientId: parsed.data.patientId,
      startsAt: offered.start,
      endsAt: offered.end,
      bookingFee: business.appointment.bookingFee,
      visitFee: vet.visitFee,
      reason: parsed.data.reason || null,
    })
    .returning({ id: A.id })
    .catch(() => []);
  if (!appt) return { ok: false, error: "appt.slotGone" };

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "appointment",
    refId: appt.id,
    amount: business.appointment.bookingFee,
    productName: `Jotno booking: ${vet.name}`,
    customer: {
      name: viewer.fullName ?? "Jotno user",
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: viewer.phone ?? "01700000000",
    },
    locale,
  });
  redirect(url as never);
}

/** Vet: mark a visit done, a no-show, or cancel it (the owner is told; Jotno refunds the booking fee by hand). */
export async function setAppointmentStatus(
  locale: string,
  id: string,
  status: "completed" | "no_show" | "cancelled",
): Promise<BookingResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const providerId = await myProviderId(viewer.id);
  if (!providerId) return { ok: false, error: "common.notAllowed" };
  const [row] = await db()
    .update(A)
    .set({ status })
    .where(and(eq(A.id, id), eq(A.providerId, providerId), eq(A.status, "confirmed")))
    .returning();
  if (!row) return { ok: false, error: "common.notAllowed" };
  await audit(viewer.id, `appointment.${status}`, "appointment", id);
  if (status === "cancelled") {
    await refundPlatform("appointment", id, "vet cancelled the visit", viewer.id);
    await notify(row.ownerId, "appointment.cancelled", {
      title: locale === "bn" ? "ভেট অ্যাপয়েন্টমেন্ট বাতিল করেছেন" : "The vet cancelled your visit",
      body: locale === "bn" ? "বুকিং ফি ফেরত দেওয়া হবে।" : "Your booking fee will be refunded.",
      url: localeHref(locale, ROUTES.appointments),
      tag: `appt-${id}`,
    });
  }
  revalidatePath("/[locale]/dashboard/appointments", "page");
  return { ok: true };
}

/** Owner: cancel a confirmed visit (the booking fee is not refunded). */
export async function cancelMyAppointment(id: string): Promise<BookingResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const [row] = await db()
    .update(A)
    .set({ status: "cancelled" })
    .where(and(eq(A.id, id), eq(A.ownerId, viewer.id), eq(A.status, "confirmed")))
    .returning({ id: A.id, providerId: A.providerId, startsAt: A.startsAt });
  if (!row) return { ok: false, error: "common.notAllowed" };
  await audit(viewer.id, "appointment.owner_cancelled", "appointment", id);
  const [vet] = await db()
    .select({ profileId: schema.providers.profileId })
    .from(schema.providers)
    .where(eq(schema.providers.id, row.providerId))
    .limit(1);
  if (vet) {
    await notify(vet.profileId, "appointment.cancelled", {
      title: "Booking cancelled",
      body: row.startsAt.toISOString(),
      url: ROUTES.vetAppointments,
      tag: `appt-${id}`,
    });
  }
  revalidatePath("/[locale]/account/appointments", "page");
  return { ok: true };
}
