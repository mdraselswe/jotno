import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { business } from "@/config";
import { publicEnv } from "@/config/env";
import { chatPath, orderPath, payPath, ROUTES } from "@/config/routes";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { releaseOrder } from "@/features/shop/server";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { payments as gateway, usesGateway, type VerifiedPayment } from "@/infrastructure/payments";
import { localeHref } from "@/lib/locale-href";
import { paidRows, platformRefundRows, platformRows, refundRows, type LedgerRow } from "../ledger";

const P = schema.payments;
export type PaymentRow = typeof P.$inferSelect;
type Purpose = PaymentRow["purpose"];
type Status = PaymentRow["status"];

/** https://host of this request (works on workers.dev, a custom domain and localhost). */
export async function requestOrigin(): Promise<string> {
  if (publicEnv.NEXT_PUBLIC_SITE_URL) return publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Creates a pending payment and returns where to send the browser: our own
 * pay page (bKash/Nagad send money + trx id, or cash on delivery) or, when a
 * gateway is configured, the gateway checkout.
 */
export async function beginPayment(input: {
  userId: string;
  purpose: Purpose;
  refId: string;
  amount: number;
  productName: string;
  customer: { name: string; email: string; phone: string };
  locale: string;
}): Promise<string> {
  const manual = !usesGateway();
  const [row] = await db()
    .insert(P)
    .values({
      userId: input.userId,
      purpose: input.purpose,
      refId: input.refId,
      amount: input.amount,
      gateway: manual ? "manual" : gateway().name,
    })
    .returning({ id: P.id });
  if (!row) throw new Error("Could not create payment");
  if (manual) return localeHref(input.locale, payPath(row.id));

  const origin = await requestOrigin();
  const ret = (result: string) => `${origin}/api/pay/return/?result=${result}&locale=${input.locale}`;
  const session = await gateway().createCheckout({
    paymentId: row.id,
    amount: input.amount,
    productName: input.productName,
    customer: input.customer,
    successUrl: ret("success"),
    failUrl: ret("fail"),
    cancelUrl: ret("cancel"),
    ipnUrl: `${origin}/api/pay/ipn/`,
  });
  await db().update(P).set({ sessionKey: session.sessionKey }).where(eq(P.id, row.id));
  return session.redirectUrl;
}

async function writeLedger(rows: LedgerRow[]) {
  if (rows.length === 0) return;
  await db()
    .insert(schema.ledgerEntries)
    .values(rows.map((r) => ({ ...r })));
}

export interface SettleResult {
  paymentId: string | null;
  purpose: Purpose | null;
  refId: string | null;
  status: "paid" | "failed" | "cancelled" | "unknown";
}

/**
 * Moves a payment to paid exactly once (only from one of `from`) and applies
 * it: opens the chat, confirms the booking, starts the featured listing or
 * moves the order on. Returns false when another call got there first.
 */
export async function markPaid(
  payment: PaymentRow,
  opts: {
    from: Status[];
    locale: string;
    reviewedBy?: string | null;
    gatewayTxId?: string;
    raw?: Record<string, unknown>;
  },
): Promise<boolean> {
  const now = new Date();
  const updated = await db()
    .update(P)
    .set({
      status: "paid",
      paidAt: now,
      ...(opts.gatewayTxId ? { gatewayTxId: opts.gatewayTxId } : {}),
      ...(opts.raw ? { raw: opts.raw } : {}),
      ...(opts.reviewedBy ? { reviewedBy: opts.reviewedBy, reviewedAt: now } : {}),
    })
    .where(and(eq(P.id, payment.id), inArray(P.status, opts.from)))
    .returning({ id: P.id })
    .catch(() => []);
  if (updated.length === 0) return false;
  await applyPaid(payment, opts.locale);
  await audit(opts.reviewedBy ?? payment.userId, "payment.paid", "payment", payment.id, {
    purpose: payment.purpose,
    amount: payment.amount,
  });
  return true;
}

/**
 * Verifies a gateway callback with the gateway and applies it once.
 * Safe to call many times for the same payment (return URL + IPN + retries).
 */
export async function settlePayment(fields: Record<string, string>, locale: string): Promise<SettleResult> {
  let verified: VerifiedPayment;
  try {
    verified = await gateway().verify(fields);
  } catch {
    return { paymentId: null, purpose: null, refId: null, status: "unknown" };
  }
  const [payment] = await db().select().from(P).where(eq(P.id, verified.paymentId)).limit(1);
  if (!payment) return { paymentId: null, purpose: null, refId: null, status: "unknown" };
  const base = { paymentId: payment.id, purpose: payment.purpose, refId: payment.refId };

  if (payment.status === "paid") return { ...base, status: "paid" };
  if (payment.status !== "pending")
    return { ...base, status: payment.status === "cancelled" ? "cancelled" : "failed" };

  if (verified.status !== "paid") {
    await db()
      .update(P)
      .set({ status: verified.status, raw: verified.raw })
      .where(and(eq(P.id, payment.id), eq(P.status, "pending")));
    await cancelTarget(payment.purpose, payment.refId);
    return { ...base, status: verified.status };
  }

  // Amount must match exactly what we asked for.
  if (verified.amount !== payment.amount) {
    await db().update(P).set({ status: "failed", raw: verified.raw }).where(eq(P.id, payment.id));
    await audit(null, "payment.amount_mismatch", "payment", payment.id, {
      got: verified.amount,
      want: payment.amount,
    });
    return { ...base, status: "failed" };
  }

  await markPaid(payment, {
    from: ["pending"],
    locale,
    gatewayTxId: verified.gatewayTxId,
    raw: verified.raw,
  });
  return { ...base, status: "paid" };
}

/** Releases what an unpaid payment was holding (chat, booking, order). */
export async function cancelTarget(purpose: Purpose, refId: string) {
  if (purpose === "consult") {
    await db()
      .update(schema.consults)
      .set({ status: "cancelled" })
      .where(and(eq(schema.consults.id, refId), eq(schema.consults.status, "pending_payment")));
  } else if (purpose === "appointment") {
    await db()
      .update(schema.appointments)
      .set({ status: "cancelled" })
      .where(and(eq(schema.appointments.id, refId), eq(schema.appointments.status, "pending_payment")));
  } else if (purpose === "order") {
    await releaseOrder(refId, "payment not completed", null);
  }
}

async function applyPaid(payment: PaymentRow, locale: string) {
  const now = new Date();
  switch (payment.purpose) {
    case "consult": {
      const closes = new Date(now.getTime() + business.consult.openHours * 3_600_000);
      const [c] = await db()
        .update(schema.consults)
        .set({ status: "active", openedAt: now, closesAt: closes })
        .where(eq(schema.consults.id, payment.refId))
        .returning();
      if (!c) return;
      await writeLedger(
        paidRows({
          fee: c.fee,
          commission: c.commission,
          providerId: c.providerId,
          paymentId: payment.id,
          refId: c.id,
          availableAt: closes,
          memo: "consult",
        }),
      );
      await db()
        .update(schema.providers)
        .set({ consultCount: sql`${schema.providers.consultCount} + 1` })
        .where(eq(schema.providers.id, c.providerId));
      await db().insert(schema.messages).values({ consultId: c.id, senderId: null, body: "system:opened" });
      const [vet] = await db()
        .select({ profileId: schema.providers.profileId })
        .from(schema.providers)
        .where(eq(schema.providers.id, c.providerId))
        .limit(1);
      if (vet) {
        await notify(vet.profileId, "consult.new", {
          title: locale === "bn" ? "নতুন পেইড চ্যাট" : "New paid chat",
          body: c.summary.slice(0, 120),
          url: localeHref(locale, chatPath(c.id)),
          tag: `consult-${c.id}`,
        });
      }
      await notify(c.ownerId, "consult.opened", {
        title: locale === "bn" ? "পেমেন্ট যাচাই হয়েছে, চ্যাট খুলেছে" : "Payment confirmed: your chat is open",
        body: locale === "bn" ? "ভেট শিগগিরই উত্তর দেবেন।" : "The vet will reply soon.",
        url: localeHref(locale, chatPath(c.id)),
        tag: `consult-${c.id}`,
      });
      return;
    }
    case "appointment": {
      const [a] = await db()
        .update(schema.appointments)
        .set({ status: "confirmed" })
        .where(eq(schema.appointments.id, payment.refId))
        .returning();
      if (!a) return;
      await writeLedger(
        platformRows({ amount: payment.amount, paymentId: payment.id, refId: a.id, memo: "booking fee" }),
      );
      const [vet] = await db()
        .select({ profileId: schema.providers.profileId })
        .from(schema.providers)
        .where(eq(schema.providers.id, a.providerId))
        .limit(1);
      if (vet) {
        await notify(vet.profileId, "appointment.new", {
          title: locale === "bn" ? "নতুন বুকিং" : "New booking",
          body: a.reason ?? "",
          url: localeHref(locale, ROUTES.vetAppointments),
          tag: `appt-${a.id}`,
        });
      }
      await notify(a.ownerId, "appointment.confirmed", {
        title: locale === "bn" ? "বুকিং নিশ্চিত হয়েছে" : "Your visit is booked",
        body: locale === "bn" ? "পেমেন্ট যাচাই হয়েছে।" : "Payment confirmed.",
        url: localeHref(locale, ROUTES.appointments),
        tag: `appt-${a.id}`,
      });
      return;
    }
    case "featured": {
      // refId is the featured slot created at checkout (inactive until paid: starts in the far future).
      const [slot] = await db()
        .select()
        .from(schema.featuredSlots)
        .where(eq(schema.featuredSlots.id, payment.refId))
        .limit(1);
      if (!slot) return;
      const days = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 86_400_000);
      await db()
        .update(schema.featuredSlots)
        .set({ startsAt: now, endsAt: new Date(now.getTime() + days * 86_400_000), paymentId: payment.id })
        .where(eq(schema.featuredSlots.id, slot.id));
      await writeLedger(
        platformRows({ amount: payment.amount, paymentId: payment.id, refId: slot.id, memo: "featured" }),
      );
      return;
    }
    case "order": {
      // Stock was reserved when the order was placed. Cash on delivery is
      // marked paid at delivery, so only a waiting order moves to "paid".
      const [moved] = await db()
        .update(schema.orders)
        .set({ status: "paid" })
        .where(and(eq(schema.orders.id, payment.refId), eq(schema.orders.status, "pending_payment")))
        .returning({ id: schema.orders.id, userId: schema.orders.userId, number: schema.orders.number });
      await writeLedger(
        platformRows({
          amount: payment.amount,
          paymentId: payment.id,
          refId: payment.refId,
          memo: "shop order",
        }),
      );
      if (moved) {
        await notify(moved.userId, "order.paid", {
          title:
            locale === "bn"
              ? `অর্ডার #${moved.number}: পেমেন্ট নিশ্চিত`
              : `Order #${moved.number}: payment confirmed`,
          body: locale === "bn" ? "আমরা প্যাক করা শুরু করছি।" : "We're packing it now.",
          url: localeHref(locale, orderPath(moved.id)),
          tag: `order-${moved.id}`,
        });
      }
      return;
    }
  }
}

/**
 * Gives a paid payment back. With a gateway the money returns through it;
 * with manual wallets the payment becomes "refund due" and an admin sends it
 * from /admin/payments. Writes the reversing ledger rows either way.
 */
async function refundPayment(
  payment: PaymentRow,
  reason: string,
): Promise<{ ok: boolean; reference?: string }> {
  if (payment.gateway !== "manual" && payment.gateway !== "cod" && usesGateway() && payment.gatewayTxId) {
    const result = await gateway().refund({
      gatewayTxId: payment.gatewayTxId,
      amount: payment.amount,
      reason,
    });
    await db().update(P).set({ status: "refunded", refundedAt: new Date() }).where(eq(P.id, payment.id));
    return result;
  }
  await db().update(P).set({ status: "refund_due", note: reason }).where(eq(P.id, payment.id));
  await notifyAdmins("payment.refund_due", {
    title: "Refund to send",
    body: `${reason} · ৳${(payment.amount + payment.fee) / 100}`,
    url: ROUTES.adminPayments,
    tag: `refund-${payment.id}`,
  });
  return { ok: true, reference: "manual" };
}

/** Full refund of a paid consult (vet silent, admin decision). Idempotent. */
export async function refundConsult(
  consultId: string,
  reason: string,
  actorId: string | null,
): Promise<boolean> {
  const [c] = await db().select().from(schema.consults).where(eq(schema.consults.id, consultId)).limit(1);
  if (!c || c.status !== "active") return false;
  const [payment] = await db()
    .select()
    .from(P)
    .where(and(eq(P.purpose, "consult"), eq(P.refId, consultId), eq(P.status, "paid")))
    .limit(1);
  if (!payment) return false;

  const moved = await db()
    .update(schema.consults)
    .set({ status: "refunded", closedAt: new Date(), closeReason: reason })
    .where(and(eq(schema.consults.id, consultId), eq(schema.consults.status, "active")))
    .returning({ id: schema.consults.id });
  if (moved.length === 0) return false;

  const result = await refundPayment(payment, reason);
  await writeLedger(
    refundRows({
      fee: c.fee,
      commission: c.commission,
      providerId: c.providerId,
      paymentId: payment.id,
      refId: c.id,
      memo: `refund: ${reason}${result.reference ? ` (${result.reference})` : ""}`,
    }),
  );
  await db().insert(schema.messages).values({ consultId: c.id, senderId: null, body: "system:refunded" });
  await audit(actorId, "consult.refund", "consult", c.id, { reason, ok: result.ok });
  await notify(c.ownerId, "consult.refunded", {
    title: "Refund on the way",
    body: reason,
    url: chatPath(c.id),
    tag: `consult-${c.id}`,
  });
  return true;
}

/** Refunds a paid booking fee or shop order (vet cancelled, order cancelled after paying). */
export async function refundPlatform(
  purpose: "appointment" | "order",
  refId: string,
  reason: string,
  actorId: string | null,
): Promise<boolean> {
  const [payment] = await db()
    .select()
    .from(P)
    .where(and(eq(P.purpose, purpose), eq(P.refId, refId), eq(P.status, "paid")))
    .limit(1);
  if (!payment) return false;
  const result = await refundPayment(payment, reason);
  await writeLedger(
    platformRefundRows({ amount: payment.amount, paymentId: payment.id, refId, memo: `refund: ${reason}` }),
  );
  await audit(actorId, `${purpose}.refund`, purpose, refId, { reason, ok: result.ok });
  return true;
}
