"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOrderPath, payPath, ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { availableMethods, trxIdSchema, walletFee, WALLETS } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { targetPath } from "./manual-queries";
import { markPaid } from "./payments";

const P = schema.payments;
const uuid = z.uuid();
export type PayResult = { ok: true } | { ok: false; error: MessageKey };

const submitSchema = z.object({
  method: z.enum(WALLETS),
  payerPhone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/),
  trxId: trxIdSchema,
});

/**
 * Payer: "I sent the money". Records the wallet, the number they sent from and
 * the trx id; an admin checks it against the wallet and approves. The trx id
 * is unique per wallet, so one transfer can't pay for two things.
 */
export async function submitManualPayment(
  locale: string,
  paymentId: string,
  input: z.input<typeof submitSchema>,
): Promise<PayResult> {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(paymentId).success) return { ok: false, error: "common.notAllowed" };
  if (!(await rateLimit(`paysubmit:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "pay.invalid" };

  const [p] = await db()
    .select()
    .from(P)
    .where(and(eq(P.id, paymentId), eq(P.userId, viewer.id)))
    .limit(1);
  if (!p || p.status !== "pending" || p.gateway === "cod") return { ok: false, error: "pay.notOpen" };
  const settings = await getSettings();
  if (!availableMethods(settings, p.purpose, p.amount).includes(parsed.data.method))
    return { ok: false, error: "pay.methodOff" };

  const fee = walletFee(p.amount, settings[parsed.data.method]);
  const moved = await db()
    .update(P)
    .set({
      status: "review",
      gateway: parsed.data.method,
      gatewayTxId: `${parsed.data.method}:${parsed.data.trxId}`,
      payerPhone: parsed.data.payerPhone,
      fee,
      note: null,
      submittedAt: new Date(),
    })
    .where(and(eq(P.id, p.id), eq(P.status, "pending")))
    .returning({ id: P.id })
    .catch(() => null);
  if (moved === null) return { ok: false, error: "pay.trxUsed" };
  if (moved.length === 0) return { ok: false, error: "pay.notOpen" };

  if (p.purpose === "order")
    await db()
      .update(schema.orders)
      .set({ paymentMethod: parsed.data.method })
      .where(eq(schema.orders.id, p.refId));
  await audit(viewer.id, "payment.submitted", "payment", p.id, { method: parsed.data.method });
  await notifyAdmins("payment.review", {
    title: `Check ${parsed.data.method === "bkash" ? "bKash" : "Nagad"} ৳${(p.amount + fee) / 100}`,
    body: `TrxID ${parsed.data.trxId} from ${parsed.data.payerPhone}`,
    url: ROUTES.adminPayments,
    tag: `pay-${p.id}`,
  });
  revalidatePath(localeHref(locale, payPath(p.id)));
  return { ok: true };
}

/** Payer: shop orders only. Places the order as cash on delivery; the team confirms it by phone. */
export async function chooseCashOnDelivery(locale: string, paymentId: string): Promise<PayResult> {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(paymentId).success) return { ok: false, error: "common.notAllowed" };
  const [p] = await db()
    .select()
    .from(P)
    .where(and(eq(P.id, paymentId), eq(P.userId, viewer.id)))
    .limit(1);
  if (!p || p.status !== "pending" || p.purpose !== "order") return { ok: false, error: "pay.notOpen" };
  const settings = await getSettings();
  if (!availableMethods(settings, p.purpose, p.amount).includes("cod"))
    return { ok: false, error: "pay.methodOff" };

  const [order] = await db()
    .update(schema.orders)
    .set({ status: "placed", paymentMethod: "cod" })
    .where(and(eq(schema.orders.id, p.refId), eq(schema.orders.status, "pending_payment")))
    .returning({ number: schema.orders.number });
  if (!order) return { ok: false, error: "pay.notOpen" };
  await db().update(P).set({ gateway: "cod" }).where(eq(P.id, p.id));
  await audit(viewer.id, "order.cod", "order", p.refId);
  await notifyAdmins("order.cod", {
    title: `New cash-on-delivery order #${order.number}`,
    body: `৳${p.amount / 100}. Call to confirm.`,
    url: adminOrderPath(p.refId),
    tag: `order-${p.refId}`,
  });
  revalidatePath(localeHref(locale, payPath(p.id)));
  return { ok: true };
}

async function admin() {
  return actionViewer(["admin"]);
}

/** Admin: the money is in the wallet. Applies the payment (opens the chat, confirms the booking…). */
export async function approvePayment(locale: string, paymentId: string): Promise<PayResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(paymentId).success) return { ok: false, error: "common.notAllowed" };
  const [p] = await db().select().from(P).where(eq(P.id, paymentId)).limit(1);
  if (!p || p.status !== "review") return { ok: false, error: "pay.notOpen" };
  const done = await markPaid(p, { from: ["review"], locale, reviewedBy: me.id });
  if (!done) return { ok: false, error: "pay.notOpen" };
  revalidatePath("/[locale]/admin/payments", "page");
  return { ok: true };
}

/** Admin: couldn't find that transfer. The payer sees why and can send the trx id again. */
export async function rejectPayment(locale: string, paymentId: string, reason: string): Promise<PayResult> {
  const me = await admin();
  const text = reason.trim().slice(0, 200);
  if (!me || !uuid.safeParse(paymentId).success || text.length < 3)
    return { ok: false, error: "admin.reasonHint" };
  const [p] = await db()
    .update(P)
    .set({ status: "pending", gatewayTxId: null, note: text, reviewedBy: me.id, reviewedAt: new Date() })
    .where(and(eq(P.id, paymentId), eq(P.status, "review")))
    .returning();
  if (!p) return { ok: false, error: "pay.notOpen" };
  await audit(me.id, "payment.rejected", "payment", p.id, { reason: text });
  await notify(p.userId, "payment.rejected", {
    title: locale === "bn" ? "পেমেন্ট মেলেনি" : "We couldn't find your payment",
    body: text,
    url: localeHref(locale, payPath(p.id)),
    tag: `pay-${p.id}`,
  });
  revalidatePath("/[locale]/admin/payments", "page");
  return { ok: true };
}

/** Admin: the refund was sent from the wallet (with its trx id). */
export async function markRefundSent(
  locale: string,
  paymentId: string,
  reference: string,
): Promise<PayResult> {
  const me = await admin();
  const ref = reference.trim().slice(0, 40);
  if (!me || !uuid.safeParse(paymentId).success || ref.length < 4) return { ok: false, error: "pay.invalid" };
  const [p] = await db()
    .update(P)
    .set({ status: "refunded", refundRef: ref, refundedAt: new Date() })
    .where(and(eq(P.id, paymentId), eq(P.status, "refund_due")))
    .returning();
  if (!p) return { ok: false, error: "pay.notOpen" };
  await audit(me.id, "payment.refunded", "payment", p.id, { ref });
  await notify(p.userId, "payment.refunded", {
    title: locale === "bn" ? "টাকা ফেরত পাঠানো হয়েছে" : "Refund sent",
    body: `৳${(p.amount + p.fee) / 100} · ${ref}`,
    url: localeHref(locale, targetPath(p.purpose, p.refId)),
    tag: `pay-${p.id}`,
  });
  revalidatePath("/[locale]/admin/payments", "page");
  return { ok: true };
}
