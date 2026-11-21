"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { beginPayment } from "@/features/payments/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { slugify } from "@/lib/slug";
import { deliveryFee, normalizeCart, stockProblems, subtotal, type PricedLine } from "../cart";
import { productsByIds, type ProductCard } from "./queries";

export type ShopResult = { ok: true } | { ok: false; error: MessageKey };
const O = schema.orders;
const PR = schema.products;

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
});

/** Owner: creates the order from database prices and sends them to pay. */
export async function checkout(locale: string, input: z.input<typeof checkoutSchema>): Promise<ShopResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "shop.invalid" };
  if (!(await rateLimit(`checkout:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };

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
  const sub = subtotal(priced);
  const delivery = deliveryFee(sub, parsed.data.districtId, {
    inside: business.shop.deliveryInside,
    outside: business.shop.deliveryOutside,
    freeFrom: business.shop.freeDeliveryFrom,
    homeDistrictId: business.shop.homeDistrictId,
  });
  const total = sub + delivery;

  const order = await db().transaction(async (tx) => {
    const [o] = await tx
      .insert(O)
      .values({
        userId: viewer.id,
        subtotal: sub,
        deliveryFee: delivery,
        total,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        districtId: parsed.data.districtId,
        note: parsed.data.note || null,
      })
      .returning({ id: O.id });
    if (!o) return null;
    await tx.insert(schema.orderItems).values(
      priced.map((l) => ({
        orderId: o.id,
        productId: l.productId,
        name: l.name,
        price: l.price,
        qty: l.qty,
      })),
    );
    return o;
  });
  if (!order) return { ok: false, error: "common.genericError" };

  const url = await beginPayment({
    userId: viewer.id,
    purpose: "order",
    refId: order.id,
    amount: total,
    productName: `Jotno shop order (${priced.length} items)`,
    customer: {
      name: parsed.data.name,
      email: viewer.email ?? "noreply@jotnocare.com",
      phone: parsed.data.phone,
    },
    locale,
  });
  redirect(url as never);
}

async function admin() {
  return actionViewer(["admin"]);
}

/** Admin: move a paid order along (shipped → delivered) or cancel it. */
export async function setOrderStatus(
  locale: string,
  id: string,
  status: "shipped" | "delivered" | "cancelled",
): Promise<ShopResult> {
  const me = await admin();
  if (!me || !z.uuid().safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  const from = status === "delivered" ? "shipped" : status === "shipped" ? "paid" : undefined;
  const [row] = await db()
    .update(O)
    .set({ status })
    .where(from ? and(eq(O.id, id), eq(O.status, from)) : eq(O.id, id))
    .returning({ userId: O.userId });
  if (!row) return { ok: false, error: "common.notAllowed" };
  await audit(me.id, `order.${status}`, "order", id);
  if (status === "shipped") {
    await notify(row.userId, "order.shipped", {
      title: locale === "bn" ? "আপনার অর্ডার পাঠানো হয়েছে" : "Your order is on its way",
      body: locale === "bn" ? "শিগগিরই পৌঁছাবে।" : "It will reach you soon.",
      url: localeHref(locale, ROUTES.orders),
      tag: `order-${id}`,
    });
  }
  revalidatePath("/[locale]/admin/shop", "page");
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
  stock: z.number().int().min(0).max(100_000),
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
  const values = {
    ...parsed.data,
    descriptionEn: parsed.data.descriptionEn || null,
    descriptionBn: parsed.data.descriptionBn || null,
    compareAt: parsed.data.compareAt || null,
  };
  if (id) {
    await db().update(PR).set(values).where(eq(PR.id, id));
    await audit(me.id, "product.update", "product", id);
  } else {
    const [row] = await db()
      .insert(PR)
      .values({
        ...values,
        slug: `${slugify(parsed.data.nameEn, "item")}-${Date.now().toString(36).slice(-4)}`,
      })
      .returning({ id: PR.id });
    await audit(me.id, "product.create", "product", row?.id ?? null);
  }
  revalidatePath("/[locale]/shop", "layout");
  revalidatePath("/[locale]/admin/shop", "layout");
  if (!id) redirect(localeHref(locale, ROUTES.adminShop));
  return { ok: true };
}
