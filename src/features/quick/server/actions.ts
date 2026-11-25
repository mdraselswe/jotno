"use server";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { business } from "@/config";
import { chatPath, quickRequestPath, ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { commissionFor, paidRows } from "@/features/payments";
import { beginPayment, refundQuickPayment } from "@/features/payments/server";
import { maxPointsFor } from "@/features/referrals";
import { chatCommissionBps, givePointsBack, pointsOf, spendPoints } from "@/features/referrals/server";
import { ownsUpload } from "@/features/uploads/server";
import { translator, type MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { quickCommission, upgradeFee } from "../rules";
import { onDutyCount, openWithCredit, unusedCredit } from "./pool";

const Q = schema.quickRequests;
const C = schema.consults;
export type QuickResult = { ok: true } | { ok: false; error: MessageKey };

const askSchema = z.object({
  patientId: z.uuid().nullable(),
  speciesId: z.number().int().positive().nullable().default(null),
  summary: z.string().trim().min(10).max(1000),
  photos: z.array(z.string()).max(business.quick.photos).default([]),
  usePoints: z.boolean().default(false),
});

/**
 * Owner: asks a quick-help question. Sold only while a vet is on duty. An
 * unused credit (an earlier question nobody answered) pays for it; otherwise
 * the owner pays (points may cover part of Jotno's share).
 */
export async function askQuick(locale: string, input: z.input<typeof askSchema>): Promise<QuickResult> {
  if (!business.quick.enabled) return { ok: false, error: "common.notAllowed" };
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "consult.summaryShort" };
  if (!parsed.data.photos.every((p) => ownsUpload(p, "chat", viewer.id)))
    return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`quick:${viewer.id}`, 6, 3600))) return { ok: false, error: "common.tooMany" };
  if ((await onDutyCount()) === 0) return { ok: false, error: "quick.nobodyOnDuty" };
  if (parsed.data.patientId) {
    const [pet] = await db()
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(and(eq(schema.patients.id, parsed.data.patientId), eq(schema.patients.ownerId, viewer.id)))
      .limit(1);
    if (!pet) return { ok: false, error: "common.notAllowed" };
  }
  const base = {
    ownerId: viewer.id,
    patientId: parsed.data.patientId,
    speciesId: parsed.data.speciesId,
    summary: parsed.data.summary,
    photos: parsed.data.photos,
  };

  const credit = await unusedCredit(viewer.id);
  if (credit) {
    const id = await db().transaction(async (tx) => {
      const [made] = await tx
        .insert(Q)
        .values({
          ...base,
          status: "open",
          openedAt: new Date(),
          fee: credit.fee,
          commission: credit.commission,
          pointsUsed: credit.pointsUsed,
          paymentId: credit.paymentId,
        })
        .returning({ id: Q.id });
      if (!made) return null;
      const used = await tx
        .update(Q)
        .set({ status: "used", creditUsedBy: made.id })
        .where(and(eq(Q.id, credit.id), eq(Q.status, "credited")))
        .returning({ id: Q.id });
      if (used.length === 0) tx.rollback();
      return made.id;
    });
    if (!id) return { ok: false, error: "common.genericError" };
    await openWithCredit(id, locale);
    redirect(localeHref(locale, quickRequestPath(id)));
  }

  const fee = business.quick.fee;
  const commission = quickCommission(fee, business.quick.vetShare);
  const wanted = parsed.data.usePoints
    ? maxPointsFor(commission, business.referral.commissionSpendBps, (await pointsOf(viewer.id)).available)
    : 0;
  const [made] = await db()
    .insert(Q)
    .values({ ...base, fee, commission })
    .returning({ id: Q.id });
  if (!made) return { ok: false, error: "common.genericError" };
  const pointsUsed = wanted > 0 && (await spendPoints(viewer.id, wanted, "quick", made.id)) ? wanted : 0;
  if (pointsUsed > 0) await db().update(Q).set({ pointsUsed }).where(eq(Q.id, made.id));

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "quick",
    refId: made.id,
    amount: fee - pointsUsed * 100,
    productName: "Jotno quick help",
    customer: {
      name: viewer.fullName ?? "Jotno user",
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: viewer.phone ?? "01700000000",
    },
    locale,
  });
  redirect(url as never);
}

const answerSchema = z.object({ body: z.string().trim().min(20).max(4000) });

/**
 * Vet: answers an open quick-help question. The first answer wins: it opens a
 * short quick chat with the owner and the vet earns their share.
 */
export async function answerQuick(locale: string, requestId: string, body: string): Promise<QuickResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const parsed = answerSchema.safeParse({ body });
  if (!parsed.success) return { ok: false, error: "quick.answerShort" };
  if (!(await rateLimit(`quick-answer:${viewer.id}`, 30, 3600)))
    return { ok: false, error: "common.tooMany" };
  const [vet] = await db()
    .select({ id: schema.providers.id, status: schema.providers.status, name: schema.providers.displayName })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, viewer.id))
    .limit(1);
  if (!vet || vet.status !== "verified") return { ok: false, error: "featured.verifiedOnly" };

  const now = new Date();
  const closes = new Date(now.getTime() + business.quick.openMinutes * 60_000);
  const result = await db().transaction(async (tx) => {
    const [r] = await tx
      .update(Q)
      .set({ status: "claimed", providerId: vet.id, claimedAt: now })
      .where(
        and(
          eq(Q.id, requestId),
          eq(Q.status, "open"),
          isNotNull(Q.paymentId),
          sql`${Q.ownerId} <> ${viewer.id}`,
        ),
      )
      .returning();
    if (!r || !r.paymentId) return null;
    const [c] = await tx
      .insert(C)
      .values({
        ownerId: r.ownerId,
        providerId: vet.id,
        patientId: r.patientId,
        kind: "quick",
        status: "active",
        fee: r.fee,
        commission: r.commission,
        pointsUsed: r.pointsUsed,
        summary: r.summary,
        openedAt: now,
        firstReplyAt: now,
        closesAt: closes,
      })
      .returning({ id: C.id });
    if (!c) return null;
    await tx.update(Q).set({ consultId: c.id }).where(eq(Q.id, r.id));
    // The owner's photos first (dated when they asked), then the vet's answer.
    if (r.photos.length > 0)
      await tx.insert(schema.messages).values(
        r.photos.map((imagePath) => ({
          consultId: c.id,
          senderId: r.ownerId,
          imagePath,
          createdAt: r.createdAt,
        })),
      );
    await tx.insert(schema.messages).values([
      { consultId: c.id, senderId: null, body: "system:opened", createdAt: new Date(now.getTime() - 1) },
      { consultId: c.id, senderId: viewer.id, body: parsed.data.body, createdAt: now },
    ]);
    const pointsOff = r.pointsUsed * 100;
    await tx.insert(schema.ledgerEntries).values(
      paidRows({
        fee: r.fee - pointsOff,
        commission: r.commission - pointsOff,
        providerId: vet.id,
        paymentId: r.paymentId,
        refId: c.id,
        availableAt: closes,
        memo: "quick help",
      }),
    );
    await tx
      .update(schema.providers)
      .set({
        consultCount: sql`${schema.providers.consultCount} + 1`,
        lastSeenAt: now,
      })
      .where(eq(schema.providers.id, vet.id));
    return { consultId: c.id, ownerId: r.ownerId };
  });
  if (!result) return { ok: false, error: "quick.taken" };

  const [owner] = await db()
    .select({ locale: schema.profiles.locale })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, result.ownerId))
    .limit(1);
  const ownerLocale = owner?.locale ?? locale;
  const t = translator(ownerLocale);
  await notify(result.ownerId, "quick.answered", {
    title: t("quick.pushAnsweredTitle", { name: vet.name }),
    body: parsed.data.body.slice(0, 120),
    url: localeHref(ownerLocale, chatPath(result.consultId)),
    tag: `consult-${result.consultId}`,
  });
  await audit(viewer.id, "quick.answer", "quick_request", requestId);
  redirect(localeHref(locale, chatPath(result.consultId)));
}

/** Owner: nobody answered in time and they want the money back instead of the free retry. */
export async function takeQuickRefund(locale: string, requestId: string): Promise<QuickResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const [r] = await db()
    .update(Q)
    .set({ status: "refunded" })
    .where(and(eq(Q.id, requestId), eq(Q.ownerId, viewer.id), eq(Q.status, "credited")))
    .returning();
  if (!r?.paymentId) return { ok: false, error: "common.notAllowed" };
  await refundQuickPayment(r.paymentId, "quick_unanswered", viewer.id);
  await givePointsBack(viewer.id, "quick", r.id);
  revalidatePath(localeHref(locale, quickRequestPath(requestId)));
  return { ok: true };
}

/** Owner: turns a quick chat into the same vet's full chat, paying only the difference. */
export async function upgradeQuick(locale: string, consultId: string): Promise<QuickResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const [row] = await db()
    .select({
      c: C,
      vetFee: schema.providers.consultFee,
      vetProfileId: schema.providers.profileId,
      vetName: schema.providers.displayName,
      vetStatus: schema.providers.status,
    })
    .from(C)
    .innerJoin(schema.providers, eq(schema.providers.id, C.providerId))
    .where(and(eq(C.id, consultId), eq(C.ownerId, viewer.id)))
    .limit(1);
  if (!row || row.c.kind !== "quick" || row.c.status === "refunded" || row.vetStatus !== "verified")
    return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`upgrade:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };

  const fee = upgradeFee(row.vetFee, row.c.fee);
  const commission = commissionFor(fee, await chatCommissionBps(viewer.id, row.vetProfileId));
  const [full] = await db()
    .insert(C)
    .values({
      ownerId: viewer.id,
      providerId: row.c.providerId,
      patientId: row.c.patientId,
      fee,
      commission,
      summary: row.c.summary,
      upgradedFrom: row.c.id,
    })
    .returning({ id: C.id });
  if (!full) return { ok: false, error: "common.genericError" };
  const url = await beginPayment({
    userId: viewer.id,
    purpose: "consult",
    refId: full.id,
    amount: fee,
    productName: `Jotno chat consult: ${row.vetName}`,
    customer: {
      name: viewer.fullName ?? "Jotno user",
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: viewer.phone ?? "01700000000",
    },
    locale,
  });
  redirect(url as never);
}

const dutySchema = z
  .object({
    start: z.number().int().min(0).max(1439).nullable(),
    end: z.number().int().min(0).max(1439).nullable(),
  })
  .refine((d) => (d.start === null) === (d.end === null));

/** Vet: the hours they take quick help (Dhaka time); both empty turns it off. */
export async function saveDuty(
  locale: string,
  start: number | null,
  end: number | null,
): Promise<QuickResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const parsed = dutySchema.safeParse({ start, end });
  if (!parsed.success) return { ok: false, error: "quick.dutyInvalid" };
  await db()
    .update(schema.providers)
    .set({ dutyStart: parsed.data.start, dutyEnd: parsed.data.end })
    .where(eq(schema.providers.profileId, viewer.id));
  revalidatePath(localeHref(locale, ROUTES.vetQuick));
  return { ok: true };
}
