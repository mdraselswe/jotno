"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { business } from "@/config";
import { publicEnv } from "@/config/env";
import { adminConsultPath, chatPath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { beginPayment } from "@/features/payments/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { storage } from "@/infrastructure/storage";
import { localeHref } from "@/lib/locale-href";
import { commissionFor } from "@/features/payments";
import { canSend } from "../rules";
import { endOpenCalls } from "./call-store";
import { adminCanRead, participant } from "./participant";
import { toChatMessage, type ChatMessage } from "./queries";

const C = schema.consults;
const M = schema.messages;
export type ConsultResult = { ok: true } | { ok: false; error: MessageKey };

const startSchema = z.object({
  patientId: z.uuid().nullable(),
  summary: z.string().trim().min(10).max(1000),
  /** Private chat uploads to show the vet first (paths from requestUpload). */
  photos: z.array(z.string()).max(business.consult.intakePhotos).default([]),
});

/** Creates a consult awaiting payment and sends the owner to the gateway. */
export async function startConsult(
  locale: string,
  providerId: string,
  input: z.input<typeof startSchema>,
): Promise<ConsultResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "consult.summaryShort" };
  if (!parsed.data.photos.every((p) => ownsUpload(p, "chat", viewer.id)))
    return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`consult:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };

  const [vet] = await db()
    .select({
      id: schema.providers.id,
      fee: schema.providers.consultFee,
      status: schema.providers.status,
      profileId: schema.providers.profileId,
      name: schema.providers.displayName,
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

  const [consult] = await db()
    .insert(C)
    .values({
      ownerId: viewer.id,
      providerId: vet.id,
      patientId: parsed.data.patientId,
      fee: vet.fee,
      commission: commissionFor(vet.fee, business.consult.commissionBps),
      summary: parsed.data.summary,
    })
    .returning({ id: C.id });
  if (!consult) return { ok: false, error: "common.genericError" };
  // The photos open the chat, so the vet sees them with the summary.
  if (parsed.data.photos.length > 0)
    await db()
      .insert(schema.messages)
      .values(
        parsed.data.photos.map((imagePath) => ({ consultId: consult.id, senderId: viewer.id, imagePath })),
      );

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "consult",
    refId: consult.id,
    amount: vet.fee,
    productName: `Jotno chat consult: ${vet.name}`,
    customer: {
      name: viewer.fullName ?? "Jotno user",
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: viewer.phone ?? "01700000000",
    },
    locale,
  });
  redirect(url as never);
}

const messageSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  imagePath: z.string().max(200).nullable().optional(),
});

export async function sendMessage(
  locale: string,
  consultId: string,
  input: z.input<typeof messageSchema>,
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: MessageKey }> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success || (!parsed.data.body && !parsed.data.imagePath))
    return { ok: false, error: "common.genericError" };
  const p = await participant(consultId, viewer.id);
  if (!p) return { ok: false, error: "common.notAllowed" };
  if (!canSend(p.c)) return { ok: false, error: "consult.closedNote" };
  if (parsed.data.imagePath && !ownsUpload(parsed.data.imagePath, "chat", viewer.id))
    return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`msg:${viewer.id}`, 120, 600))) return { ok: false, error: "common.tooMany" };

  const [message] = await db()
    .insert(M)
    .values({
      consultId,
      senderId: viewer.id,
      body: parsed.data.body || null,
      imagePath: parsed.data.imagePath ?? null,
    })
    .returning();
  if (!message) return { ok: false, error: "common.genericError" };

  if (p.role === "vet" && !p.c.firstReplyAt) {
    await db()
      .update(C)
      .set({ firstReplyAt: new Date() })
      .where(and(eq(C.id, consultId), isNull(C.firstReplyAt)));
  }
  await db()
    .update(schema.providers)
    .set({ lastSeenAt: new Date() })
    .where(eq(schema.providers.profileId, p.vetProfileId));

  const to = p.role === "vet" ? p.c.ownerId : p.vetProfileId;
  const recent = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(M)
    .where(
      and(
        eq(M.consultId, consultId),
        eq(M.senderId, viewer.id),
        sql`${M.createdAt} > now() - interval '2 minutes'`,
      ),
    );
  // One push per burst of messages, not one per line.
  if (Number(recent[0]?.n ?? 0) <= 1) {
    await notify(to, "consult.message", {
      title: viewer.fullName ?? "Jotno",
      body: parsed.data.body?.slice(0, 120) ?? "📷",
      url: localeHref(locale, chatPath(consultId)),
      tag: `consult-${consultId}`,
    });
  }
  return { ok: true, message: toChatMessage(message) };
}

export async function markRead(consultId: string): Promise<void> {
  const viewer = await actionViewer();
  if (!viewer) return;
  const p = await participant(consultId, viewer.id);
  if (!p) return;
  await db()
    .update(M)
    .set({ readAt: new Date() })
    .where(and(eq(M.consultId, consultId), isNull(M.readAt), ne(M.senderId, viewer.id)));
}

/** Short-lived URL for a chat photo (private bucket), for participants only. */
export async function chatImageUrl(messageId: string): Promise<string | null> {
  const viewer = await actionViewer();
  if (!viewer) return null;
  const [m] = await db()
    .select({ consultId: M.consultId, path: M.imagePath })
    .from(M)
    .where(eq(M.id, messageId))
    .limit(1);
  if (!m?.path) return null;
  const p = await participant(m.consultId, viewer.id);
  // Admins only while they hold a logged reading grant for this consult.
  if (!p && !(viewer.role === "admin" && (await adminCanRead(viewer.id, m.consultId)))) return null;
  return storage.signedUrl(m.path, 600);
}

/** The vet ends the consult early (after answering). */
export async function closeConsult(locale: string, consultId: string): Promise<ConsultResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const p = await participant(consultId, viewer.id);
  if (!p || p.role !== "vet" || p.c.status !== "active" || !p.c.firstReplyAt)
    return { ok: false, error: "common.notAllowed" };
  const now = new Date();
  await db()
    .update(C)
    .set({ status: "closed", closedAt: now, closeReason: "vet" })
    .where(eq(C.id, consultId));
  // The vet's earning becomes available now.
  await db()
    .update(schema.ledgerEntries)
    .set({ availableAt: now })
    .where(and(eq(schema.ledgerEntries.refId, consultId), eq(schema.ledgerEntries.kind, "vet_payable")));
  await endOpenCalls(consultId, "consult_closed");
  await db().insert(M).values({ consultId, senderId: null, body: "system:closed" });
  await notify(p.c.ownerId, "consult.closed", {
    title: locale === "bn" ? "চ্যাট শেষ হয়েছে" : "Chat closed",
    body: locale === "bn" ? "রিভিউ দিয়ে অন্যদের সাহায্য করুন।" : "Leave a review to help others.",
    url: localeHref(locale, chatPath(consultId)),
    tag: `consult-${consultId}`,
  });
  revalidatePath(localeHref(locale, chatPath(consultId)));
  return { ok: true };
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).optional(),
});

export async function leaveReview(
  locale: string,
  consultId: string,
  input: z.input<typeof reviewSchema>,
): Promise<ConsultResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "common.genericError" };
  const p = await participant(consultId, viewer.id);
  if (!p || p.role !== "owner" || !p.c.firstReplyAt || p.c.status === "refunded")
    return { ok: false, error: "common.notAllowed" };
  const inserted = await db()
    .insert(schema.reviews)
    .values({
      consultId,
      ownerId: viewer.id,
      providerId: p.c.providerId,
      rating: parsed.data.rating,
      body: parsed.data.body || null,
    })
    .onConflictDoNothing()
    .returning({ id: schema.reviews.id });
  if (inserted.length > 0) {
    await db()
      .update(schema.providers)
      .set({
        ratingSum: sql`${schema.providers.ratingSum} + ${parsed.data.rating}`,
        ratingCount: sql`${schema.providers.ratingCount} + 1`,
      })
      .where(eq(schema.providers.id, p.c.providerId));
  }
  revalidatePath(localeHref(locale, chatPath(consultId)));
  return { ok: true };
}

const reportSchema = z.object({ reason: z.string().trim().min(10).max(1000) });

/**
 * The owner or the vet reports a problem with this consult (rude, no real
 * advice, payment issue…). The team gets a notification and may then read the
 * conversation, with the reason logged.
 */
export async function reportConsult(consultId: string, reason: string): Promise<ConsultResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = reportSchema.safeParse({ reason });
  if (!parsed.success) return { ok: false, error: "monitor.reportShort" };
  const p = await participant(consultId, viewer.id);
  if (!p) return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`report:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };
  await db()
    .insert(schema.reports)
    .values({ reporterId: viewer.id, entity: "consult", entityId: consultId, reason: parsed.data.reason });
  await audit(viewer.id, "report.create", "consult", consultId, { role: p.role });
  await notifyAdmins("admin.consultReport", {
    title: "Consult reported",
    body: parsed.data.reason.slice(0, 120),
    url: adminConsultPath(consultId),
    tag: `consult-report-${consultId}`,
  });
  return { ok: true };
}
