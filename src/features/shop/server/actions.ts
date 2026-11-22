"use server";

import { and, count, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { business } from "@/config";
import { adminOrderPath, orderPath, ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { beginPayment, markPaid, refundPlatform } from "@/features/payments/server";
import { getSettings } from "@/features/settings/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { storage } from "@/infrastructure/storage";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { slugify } from "@/lib/slug";
import {
  couponDiscount,
  deliveryFee,
  normalizeCart,
  stockProblems,
  subtotal,
  type PricedLine,
} from "../cart";
import { customerCanCancel, orderActions, type OrderAction, type OrderStatus } from "../status";
import { productsByIds, usableCoupon, type ProductCard } from "./queries";
import { adjustStock, OutOfStock, PaymentInReview, releaseOrder, reserveStock, returnOrder } from "./stock";

export type ShopResult = { ok: true } | { ok: false; error: MessageKey };
const O = schema.orders;
/** Unpaid or not-yet-confirmed orders one account may have at a time. */
const MAX_OPEN_ORDERS = 3;
const PR = schema.products;
const C = schema.coupons;
const uuid = z.uuid();

const lineSchema = z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(99) })).max(50);

/** Current prices for the cart page (public data). */
export async function priceCart(locale: string, lines: z.input<typeof lineSchema>): Promise<ProductCard[]> {
  const parsed = lineSchema.safeParse(lines);
  if (!parsed.success) return [];
  return productsByIds(
    parsed.data.map((l) => l.productId),
    locale,
  );
}

export type CouponCheck = { ok: true; code: string; discount: number } | { ok: false; error: MessageKey };

/** Cart preview: what a coupon takes off this subtotal. The server checks again at checkout. */
export async function checkCoupon(code: string, sub: number): Promise<CouponCheck> {
  if (!(await rateLimit(`coupon:${code.slice(0, 20)}`, 30, 600)))
    return { ok: false, error: "common.tooMany" };
  const c = await usableCoupon(code);
  if (!c) return { ok: false, error: "shop.couponInvalid" };
  const discount = couponDiscount(Math.max(0, Math.floor(sub)), c);
  if (discount <= 0) return { ok: false, error: "shop.couponMin" };
  return { ok: true, code: c.code, discount };
}

const checkoutSchema = z.object({
  lines: lineSchema.min(1),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?88)?01[3-9]\d{8}$/),
  address: z.string().trim().min(10).max(300),
  districtId: z.number().int().positive(),
  note: z.string().trim().max(300).optional(),
  coupon: z.string().trim().max(20).optional(),
});

/**
 * Owner: creates the order from database prices, takes the stock right away
 * (so nobody else buys the last one) and returns the pay page, where they
 * choose bKash, Nagad or cash on delivery.
 */
export async function checkout(
  locale: string,
  input: z.input<typeof checkoutSchema>,
): Promise<{ ok: true; url: string } | { ok: false; error: MessageKey }> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "shop.invalid" };
  if (!(await rateLimit(`checkout:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };
  // Each order holds stock, so one account can't tie it all up with unpaid orders.
  const [open] = await db()
    .select({ n: count() })
    .from(O)
    .where(and(eq(O.userId, viewer.id), inArray(O.status, ["pending_payment", "placed"])));
  if ((open?.n ?? 0) >= MAX_OPEN_ORDERS) return { ok: false, error: "shop.tooManyOpen" };

  const lines = normalizeCart(parsed.data.lines);
  const products = await productsByIds(
    lines.map((l) => l.productId),
    "en",
  );
  const priced: (PricedLine & { name: string })[] = [];
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    if (!p) return { ok: false, error: "shop.stockChanged" };
    priced.push({ ...l, price: p.price, stock: p.stock, name: p.name });
  }
  if (stockProblems(priced).length > 0) return { ok: false, error: "shop.stockChanged" };

  const settings = await getSettings();
  const sub = subtotal(priced);
  const coupon = parsed.data.coupon ? await usableCoupon(parsed.data.coupon) : null;
  if (parsed.data.coupon && !coupon) return { ok: false, error: "shop.couponInvalid" };
  const discount = coupon ? couponDiscount(sub, coupon) : 0;
  const delivery = deliveryFee(sub - discount, parsed.data.districtId, {
    ...settings.delivery,
    homeDistrictId: business.shop.homeDistrictId,
  });
  const total = sub - discount + delivery;

  let orderId: string;
  try {
    orderId = await db().transaction(async (tx) => {
      const [o] = await tx
        .insert(O)
        .values({
          userId: viewer.id,
          subtotal: sub,
          discount,
          couponCode: coupon?.code ?? null,
          deliveryFee: delivery,
          total,
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          districtId: parsed.data.districtId,
          note: parsed.data.note || null,
        })
        .returning({ id: O.id });
      if (!o) throw new Error("order insert failed");
      await tx.insert(schema.orderItems).values(
        priced.map((l) => ({
          orderId: o.id,
          productId: l.productId,
          name: l.name,
          price: l.price,
          qty: l.qty,
        })),
      );
      await reserveStock(tx, priced, o.id, viewer.id);
      if (coupon) {
        const [used] = await tx
          .update(C)
          .set({ used: sql`${C.used} + 1` })
          .where(and(eq(C.id, coupon.id), or(isNull(C.maxUses), lt(C.used, sql`${C.maxUses}`))))
          .returning({ id: C.id });
        if (!used) throw new OutOfStock("coupon");
      }
      return o.id;
    });
  } catch (error) {
    if (error instanceof OutOfStock)
      return { ok: false, error: error.productId === "coupon" ? "shop.couponInvalid" : "shop.stockChanged" };
    throw error;
  }

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "order",
    refId: orderId,
    amount: total,
    productName: `Jotno shop order (${priced.length} items)`,
    customer: {
      name: parsed.data.name,
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: parsed.data.phone,
    },
    locale,
  });
  // The client empties the cart, then goes to the pay page (or the gateway).
  return { ok: true, url };
}

/** Owner: cancel before packing. A paid order's money goes back through /admin/payments. */
export async function cancelMyOrder(locale: string, id: string): Promise<ShopResult> {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  const [o] = await db()
    .select({ status: O.status, number: O.number })
    .from(O)
    .where(and(eq(O.id, id), eq(O.userId, viewer.id)))
    .limit(1);
  if (!o || !customerCanCancel(o.status)) return { ok: false, error: "shop.cantCancel" };
  const moved = await releaseOrder(id, "cancelled by customer", viewer.id).catch((e: unknown) => {
    if (e instanceof PaymentInReview) return "review" as const;
    throw e;
  });
  if (moved === "review") return { ok: false, error: "shop.paymentInReview" };
  if (!moved) return { ok: false, error: "shop.cantCancel" };
  if (o.status === "paid")
    await refundPlatform("order", id, `order #${o.number} cancelled by customer`, viewer.id);
  await audit(viewer.id, "order.cancel", "order", id);
  await notifyAdmins("order.cancelled", {
    title: `Order #${o.number} cancelled`,
    body: "The customer cancelled it.",
    url: adminOrderPath(id),
    tag: `order-${id}`,
  });
  revalidatePath(localeHref(locale, orderPath(id)));
  return { ok: true };
}

async function admin() {
  return actionViewer(["admin"]);
}

const shipSchema = z.object({
  courier: z.string().trim().min(2).max(60),
  trackingCode: z.string().trim().max(80).optional(),
  trackingUrl: z.union([z.url().max(300), z.literal("")]).optional(),
});

const STATUS_FOR: Record<Exclude<OrderAction, "cancel" | "return">, OrderStatus> = {
  process: "processing",
  ship: "shipped",
  deliver: "delivered",
};

const CUSTOMER_TEXT: Partial<Record<OrderAction, { en: string; bn: string }>> = {
  process: { en: "We're packing your order.", bn: "আপনার অর্ডার প্যাক হচ্ছে।" },
  ship: { en: "Your order is on its way.", bn: "আপনার অর্ডার পথে আছে।" },
  deliver: {
    en: "Delivered. Thank you for shopping with Jotno!",
    bn: "পৌঁছে গেছে। যত্ন থেকে কেনার জন্য ধন্যবাদ!",
  },
  cancel: { en: "Your order was cancelled.", bn: "আপনার অর্ডার বাতিল হয়েছে।" },
  return: { en: "Your return is recorded.", bn: "আপনার রিটার্ন নথিভুক্ত হয়েছে।" },
};

/** Admin: move an order to its next step (see orderActions). */
export async function updateOrder(
  locale: string,
  id: string,
  action: OrderAction,
  data: { courier?: string; trackingCode?: string; trackingUrl?: string; reason?: string } = {},
): Promise<ShopResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  const [o] = await db().select().from(O).where(eq(O.id, id)).limit(1);
  if (!o || !orderActions(o.status).includes(action)) return { ok: false, error: "shop.cantMove" };
  const reason = data.reason?.trim().slice(0, 300) ?? "";

  if (action === "cancel") {
    if (reason.length < 3) return { ok: false, error: "admin.reasonHint" };
    const moved = await releaseOrder(id, reason, me.id).catch((e: unknown) => {
      if (e instanceof PaymentInReview) return "review" as const;
      throw e;
    });
    if (moved === "review") return { ok: false, error: "shop.paymentInReviewAdmin" };
    if (!moved) return { ok: false, error: "shop.cantMove" };
    if (o.status === "paid" || (o.status === "processing" && o.paymentMethod !== "cod"))
      await refundPlatform("order", id, `order #${o.number}: ${reason}`, me.id);
  } else if (action === "return") {
    if (reason.length < 3) return { ok: false, error: "admin.reasonHint" };
    const moved = await returnOrder(id, reason, me.id);
    if (!moved) return { ok: false, error: "shop.cantMove" };
    if (o.paymentMethod !== "cod" || o.status === "delivered")
      await refundPlatform("order", id, `order #${o.number} returned: ${reason}`, me.id);
  } else {
    let extra: Partial<typeof O.$inferInsert> = {};
    if (action === "ship") {
      const ship = shipSchema.safeParse(data);
      if (!ship.success) return { ok: false, error: "shop.shipInvalid" };
      extra = {
        courier: ship.data.courier,
        trackingCode: ship.data.trackingCode || null,
        trackingUrl: ship.data.trackingUrl || null,
        shippedAt: new Date(),
      };
    }
    if (action === "deliver") extra = { deliveredAt: new Date() };
    const [moved] = await db()
      .update(O)
      .set({ status: STATUS_FOR[action], ...extra })
      .where(and(eq(O.id, id), eq(O.status, o.status)))
      .returning({ id: O.id });
    if (!moved) return { ok: false, error: "shop.cantMove" };
    // Cash on delivery: the money arrives with the parcel.
    if (action === "deliver" && o.paymentMethod === "cod") {
      const [cod] = await db()
        .select()
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.purpose, "order"),
            eq(schema.payments.refId, id),
            eq(schema.payments.gateway, "cod"),
            inArray(schema.payments.status, ["pending"]),
          ),
        )
        .limit(1);
      if (cod) await markPaid(cod, { from: ["pending"], locale, reviewedBy: me.id });
    }
  }

  await audit(me.id, `order.${action}`, "order", id, reason ? { reason } : undefined);
  const text = CUSTOMER_TEXT[action];
  if (text) {
    const lang = locale === "bn" ? "bn" : "en";
    await notify(o.userId, `order.${action}`, {
      title: lang === "bn" ? `অর্ডার #${o.number}` : `Order #${o.number}`,
      body:
        text[lang] +
        (action === "ship" && data.trackingCode ? ` (${data.courier} ${data.trackingCode})` : ""),
      url: localeHref(locale, orderPath(id)),
      tag: `order-${id}`,
    });
  }
  revalidatePath("/[locale]/admin/shop", "layout");
  return { ok: true };
}

/** Admin: private note on an order (call notes, address fixes). */
export async function saveOrderNote(id: string, note: string): Promise<ShopResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  await db()
    .update(O)
    .set({ adminNote: note.trim().slice(0, 1000) || null })
    .where(eq(O.id, id));
  return { ok: true };
}

/** Admin: stock arrived (+) or a count correction (−). */
export async function changeStock(productId: string, delta: number, note: string): Promise<ShopResult> {
  const me = await admin();
  if (
    !me ||
    !uuid.safeParse(productId).success ||
    !Number.isInteger(delta) ||
    delta === 0 ||
    Math.abs(delta) > 10_000
  )
    return { ok: false, error: "common.notAllowed" };
  const stock = await adjustStock(productId, delta, note, me.id);
  if (stock === null) return { ok: false, error: "common.notAllowed" };
  revalidatePath("/[locale]/admin/shop", "layout");
  revalidatePath("/[locale]/shop", "layout");
  return { ok: true };
}

const productSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameBn: z.string().trim().min(2).max(120),
  descriptionEn: z.string().trim().max(2000).optional(),
  descriptionBn: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(2).max(40),
  speciesId: z.number().int().positive().nullable(),
  price: z.number().int().min(100).max(10_000_000),
  compareAt: z.number().int().min(0).max(10_000_000).nullable(),
  /** Only used when creating; later changes go through changeStock so they are logged. */
  stock: z.number().int().min(0).max(100_000),
  lowStockAt: z.number().int().min(0).max(10_000),
  sku: z.string().trim().max(40).optional(),
  unit: z.string().trim().max(30).optional(),
  imagePath: z.string().nullable(),
  active: z.boolean(),
});

export type ProductInput = z.input<typeof productSchema>;

/** Admin: create or update a product. */
export async function saveProduct(
  locale: string,
  id: string | null,
  input: ProductInput,
): Promise<ShopResult> {
  const me = await admin();
  if (!me) return { ok: false, error: "common.notAllowed" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "shop.productInvalid" };
  if (parsed.data.imagePath && !ownsUpload(parsed.data.imagePath, "product", me.id)) {
    const [existing] = id
      ? await db().select({ imagePath: PR.imagePath }).from(PR).where(eq(PR.id, id)).limit(1)
      : [];
    if (existing?.imagePath !== parsed.data.imagePath) return { ok: false, error: "common.notAllowed" };
  }
  const { stock, ...rest } = parsed.data;
  const values = {
    ...rest,
    descriptionEn: rest.descriptionEn || null,
    descriptionBn: rest.descriptionBn || null,
    compareAt: rest.compareAt || null,
    sku: rest.sku || null,
    unit: rest.unit || null,
  };
  if (id) {
    const [before] = await db().select({ imagePath: PR.imagePath }).from(PR).where(eq(PR.id, id)).limit(1);
    await db().update(PR).set(values).where(eq(PR.id, id));
    // A replaced photo is no longer used anywhere (orders keep name and price only).
    if (before?.imagePath && before.imagePath !== values.imagePath)
      await storage.remove("media", [before.imagePath]).catch(() => undefined);
    await audit(me.id, "product.update", "product", id);
  } else {
    const [row] = await db()
      .insert(PR)
      .values({
        ...values,
        stock,
        slug: `${slugify(parsed.data.nameEn, "item")}-${Date.now().toString(36).slice(-4)}`,
      })
      .returning({ id: PR.id });
    if (row && stock > 0)
      await db().insert(schema.stockMovements).values({
        productId: row.id,
        delta: stock,
        reason: "restock",
        note: "opening stock",
        createdBy: me.id,
      });
    await audit(me.id, "product.create", "product", row?.id ?? null);
  }
  revalidatePath("/[locale]/shop", "layout");
  revalidatePath("/[locale]/admin/shop", "layout");
  if (!id) redirect(localeHref(locale, ROUTES.adminProducts));
  return { ok: true };
}

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/),
  kind: z.enum(["percent", "flat"]),
  value: z.number().int().min(1).max(10_000_000),
  minSubtotal: z.number().int().min(0).max(100_000_000),
  maxDiscount: z.number().int().min(0).max(100_000_000).nullable(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  endsAt: z.iso.date().nullable(),
  active: z.boolean(),
});
export type CouponInput = z.input<typeof couponSchema>;

/** Admin: create or update a discount code. */
export async function saveCoupon(id: string | null, input: CouponInput): Promise<ShopResult> {
  const me = await admin();
  if (!me) return { ok: false, error: "common.notAllowed" };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success || (parsed.data.kind === "percent" && parsed.data.value > 10_000))
    return { ok: false, error: "shop.couponFormInvalid" };
  const values = {
    ...parsed.data,
    // Ends at the end of that day in Dhaka.
    endsAt: parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T23:59:59+06:00`) : null,
  };
  try {
    if (id && uuid.safeParse(id).success) await db().update(C).set(values).where(eq(C.id, id));
    else await db().insert(C).values(values);
  } catch {
    return { ok: false, error: "shop.couponTaken" };
  }
  await audit(me.id, id ? "coupon.update" : "coupon.create", "coupon", id);
  revalidatePath("/[locale]/admin/shop/coupons", "page");
  return { ok: true };
}
