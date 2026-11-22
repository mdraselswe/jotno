import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";

const PR = schema.products;
const O = schema.orders;
const SM = schema.stockMovements;

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/** Thrown inside a transaction when a line is no longer in stock (rolls everything back). */
/**
 * The customer has sent a TrxID that an admin hasn't checked yet. Cancelling
 * now would drop money that may already have arrived, so the payment must be
 * approved (then refunded) or rejected first.
 */
export class PaymentInReview extends Error {
  constructor(public orderId: string) {
    super("payment in review");
  }
}

export class OutOfStock extends Error {
  constructor(public productId: string) {
    super("out of stock");
  }
}

/**
 * Takes the stock for an order's lines at the moment it is placed, so two
 * people can't buy the last bag. Must run inside the order's transaction.
 */
export async function reserveStock(
  tx: Tx,
  lines: { productId: string; qty: number }[],
  orderId: string,
  actorId: string,
) {
  for (const l of lines) {
    const [row] = await tx
      .update(PR)
      .set({ stock: sql`${PR.stock} - ${l.qty}` })
      .where(and(eq(PR.id, l.productId), eq(PR.active, true), gte(PR.stock, l.qty)))
      .returning({ id: PR.id });
    if (!row) throw new OutOfStock(l.productId);
  }
  await tx.insert(SM).values(
    lines.map((l) => ({
      productId: l.productId,
      delta: -l.qty,
      reason: "order",
      refId: orderId,
      createdBy: actorId,
    })),
  );
}

async function putBack(tx: Tx, orderId: string, reason: "cancel" | "return", actorId: string | null) {
  const items = await tx
    .select({ productId: schema.orderItems.productId, qty: schema.orderItems.qty })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const lines = items.filter((i): i is { productId: string; qty: number } => i.productId !== null);
  for (const l of lines) {
    await tx
      .update(PR)
      .set({ stock: sql`${PR.stock} + ${l.qty}` })
      .where(eq(PR.id, l.productId));
  }
  if (lines.length > 0) {
    await tx.insert(SM).values(
      lines.map((l) => ({
        productId: l.productId,
        delta: l.qty,
        reason,
        refId: orderId,
        createdBy: actorId,
      })),
    );
  }
}

/** Statuses an order can still be cancelled from (nothing has left the warehouse). */
export const CANCELLABLE = ["pending_payment", "placed", "paid", "processing"] as const;

/**
 * Cancels an order that hasn't shipped and puts its stock back. Payments still
 * waiting on it are cancelled too. Returns the order when it moved, null when
 * it was already past cancelling (or already cancelled). Throws PaymentInReview
 * while a TrxID is waiting for an admin. Refunding a paid order is the caller's
 * job (refundPlatform).
 */
export async function releaseOrder(orderId: string, reason: string, actorId: string | null) {
  return db().transaction(async (tx) => {
    const [inReview] = await tx
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.purpose, "order"),
          eq(schema.payments.refId, orderId),
          eq(schema.payments.status, "review"),
        ),
      )
      .limit(1);
    if (inReview) throw new PaymentInReview(orderId);
    const [o] = await tx
      .update(O)
      .set({ status: "cancelled", cancelReason: reason.slice(0, 300), cancelledAt: new Date() })
      .where(and(eq(O.id, orderId), inArray(O.status, [...CANCELLABLE])))
      .returning();
    if (!o) return null;
    await putBack(tx, orderId, "cancel", actorId);
    await tx
      .update(schema.payments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(schema.payments.purpose, "order"),
          eq(schema.payments.refId, orderId),
          eq(schema.payments.status, "pending"),
        ),
      );
    return o;
  });
}

/** Marks a shipped or delivered order as returned and restocks it. */
export async function returnOrder(orderId: string, reason: string, actorId: string) {
  return db().transaction(async (tx) => {
    const [o] = await tx
      .update(O)
      .set({ status: "returned", cancelReason: reason.slice(0, 300), cancelledAt: new Date() })
      .where(and(eq(O.id, orderId), inArray(O.status, ["shipped", "delivered"])))
      .returning();
    if (!o) return null;
    await putBack(tx, orderId, "return", actorId);
    return o;
  });
}

/** Admin: new stock arrived (+) or a count correction (−). Never below zero. */
export async function adjustStock(productId: string, delta: number, note: string, actorId: string) {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .update(PR)
      .set({ stock: sql`greatest(0, ${PR.stock} + ${delta})` })
      .where(eq(PR.id, productId))
      .returning({ stock: PR.stock });
    if (!row) return null;
    await tx.insert(SM).values({
      productId,
      delta,
      reason: delta > 0 ? "restock" : "adjust",
      note: note.slice(0, 200) || null,
      createdBy: actorId,
    });
    await audit(actorId, "stock.adjust", "product", productId, { delta });
    return row.stock;
  });
}
