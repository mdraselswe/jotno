import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";
import { runCatalog, type ShopCategoryRef, type ShopFilters } from "../catalog";
import { ORDER_STATUSES, type OrderStatus } from "../status";

const PR = schema.products;
const O = schema.orders;
const OI = schema.orderItems;
const PAY = schema.payments;

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt: number | null;
  stock: number;
  category: string;
  speciesId: number | null;
  unit: string | null;
  imageUrl: string | null;
}

type ProductRow = typeof PR.$inferSelect;
export const toProductCard = (p: ProductRow, locale: string): ProductCard => ({
  id: p.id,
  slug: p.slug,
  name: locale === "bn" ? p.nameBn : p.nameEn,
  price: p.price,
  compareAt: p.compareAt,
  stock: p.stock,
  category: p.category,
  speciesId: p.speciesId,
  unit: p.unit,
  imageUrl: mediaUrl(p.imagePath),
});

/**
 * The shop grid: every active product (with units sold in the last 90 days,
 * for "popular"), then search, filters, facets, sort and paging in
 * `runCatalog`. Returns cards plus the facet counts for the filter panel.
 */
/** Shop categories in their order; `all` includes the hidden ones (admin). */
export async function shopCategories(
  all = false,
): Promise<(ShopCategoryRef & { sort: number; active: boolean })[]> {
  const C = schema.productCategories;
  const rows = await db()
    .select()
    .from(C)
    .where(all ? undefined : eq(C.active, true))
    .orderBy(asc(C.sort), asc(C.nameEn));
  return rows.map((c) => ({ slug: c.slug, en: c.nameEn, bn: c.nameBn, sort: c.sort, active: c.active }));
}

/** Admin: every category with how many products use it. */
export async function categoriesWithCounts() {
  const [cats, counts] = await Promise.all([
    shopCategories(true),
    db().select({ category: PR.category, n: count() }).from(PR).groupBy(PR.category),
  ]);
  const used = new Map(counts.map((c) => [c.category, Number(c.n)]));
  return cats.map((c) => ({ ...c, products: used.get(c.slug) ?? 0 }));
}

export async function shopCatalog(
  filters: ShopFilters,
  locale: string,
  categories: readonly ShopCategoryRef[],
) {
  const sold = sql<number>`coalesce((
    select sum(oi.qty)::int from ${OI} oi join ${O} o on o.id = oi.order_id
    where oi.product_id = "products"."id" and o.status not in ('cancelled', 'returned')
      and o.created_at > now() - interval '90 days'
  ), 0)`;
  const rows = await db().select({ p: PR, sold }).from(PR).where(eq(PR.active, true)).limit(2000);
  const result = runCatalog(
    rows.map((r) => ({ ...r.p, sold: Number(r.sold) })),
    filters,
    locale,
    categories,
  );
  return { ...result, items: result.items.map((p) => toProductCard(p, locale)) };
}

export async function getProduct(slug: string, locale: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [p] = await db()
    .select()
    .from(PR)
    .where(and(eq(PR.slug, slug), eq(PR.active, true)))
    .limit(1);
  if (!p) return null;
  const related = await db()
    .select()
    .from(PR)
    .where(and(eq(PR.active, true), eq(PR.category, p.category), ne(PR.id, p.id)))
    .orderBy(desc(sql`${PR.stock} > 0`), desc(PR.createdAt))
    .limit(4);
  return {
    ...toProductCard(p, locale),
    sku: p.sku,
    description: locale === "bn" ? p.descriptionBn : p.descriptionEn,
    gallery: [p.imagePath, ...p.images].map((path) => mediaUrl(path)).filter((u): u is string => Boolean(u)),
    related: related.map((r) => toProductCard(r, locale)),
  };
}

/** Current prices and stock for cart lines (active products only). */
export async function productsByIds(ids: string[], locale: string): Promise<ProductCard[]> {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 50);
  if (clean.length === 0) return [];
  const rows = await db()
    .select()
    .from(PR)
    .where(and(inArray(PR.id, clean), eq(PR.active, true)));
  return rows.map((p) => toProductCard(p, locale));
}

async function withItems<T extends { id: string }>(orders: T[]) {
  if (orders.length === 0) return [];
  const items = await db()
    .select()
    .from(OI)
    .where(
      inArray(
        OI.orderId,
        orders.map((o) => o.id),
      ),
    );
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function myOrders(userId: string) {
  const orders = await db().select().from(O).where(eq(O.userId, userId)).orderBy(desc(O.createdAt)).limit(50);
  return withItems(orders);
}

/** The latest payment for an order (the one the customer is on). */
async function orderPayment(orderId: string) {
  const [p] = await db()
    .select()
    .from(PAY)
    .where(and(eq(PAY.purpose, "order"), eq(PAY.refId, orderId)))
    .orderBy(desc(PAY.createdAt))
    .limit(1);
  return p ?? null;
}

/** One order for its owner (or null), with items and its payment. */
export async function myOrder(id: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [o] = await db()
    .select()
    .from(O)
    .where(and(eq(O.id, id), eq(O.userId, userId)))
    .limit(1);
  if (!o) return null;
  const [withLines] = await withItems([o]);
  return withLines ? { ...withLines, payment: await orderPayment(o.id) } : null;
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof myOrder>>>;

export const ADMIN_ORDERS_PAGE = 30;

/** Admin order list: by status ("open" = everything still to do), searched by number, name or phone. */
export async function adminOrders(input: {
  status: OrderStatus | "open" | "all";
  q?: string | null;
  page: number;
}) {
  const conds: SQL[] = [];
  if (input.status === "open") conds.push(inArray(O.status, ["placed", "paid", "processing", "shipped"]));
  else if (input.status !== "all") conds.push(eq(O.status, input.status));
  const q = input.q?.trim().replace(/^#/, "").slice(0, 40);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "")}%`;
    const match = /^\d+$/.test(q)
      ? or(eq(O.number, Number(q)), ilike(O.phone, like))
      : or(ilike(O.name, like), ilike(O.phone, like));
    if (match) conds.push(match);
  }
  const where = conds.length > 0 ? and(...conds) : undefined;
  const [rows, [total]] = await Promise.all([
    db()
      .select()
      .from(O)
      .where(where)
      .orderBy(input.status === "open" ? asc(O.createdAt) : desc(O.createdAt))
      .limit(ADMIN_ORDERS_PAGE)
      .offset(Math.max(0, input.page - 1) * ADMIN_ORDERS_PAGE),
    db().select({ n: count() }).from(O).where(where),
  ]);
  return { items: await withItems(rows), total: total?.n ?? 0 };
}

/** Orders per status, for the admin tabs. */
export async function orderCounts(): Promise<Record<OrderStatus, number>> {
  const rows = await db().select({ status: O.status, n: count() }).from(O).groupBy(O.status);
  const out = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** One order for the team: items, every payment try, and the stock it moved. */
export async function adminOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [o] = await db().select().from(O).where(eq(O.id, id)).limit(1);
  if (!o) return null;
  const [withLines] = await withItems([o]);
  const payments = await db()
    .select()
    .from(PAY)
    .where(and(eq(PAY.purpose, "order"), eq(PAY.refId, id)))
    .orderBy(desc(PAY.createdAt));
  const [customer] = await db()
    .select({ email: schema.profiles.email, fullName: schema.profiles.fullName })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, o.userId))
    .limit(1);
  return withLines ? { ...withLines, payments, customer: customer ?? null } : null;
}

export async function adminProducts() {
  return db().select().from(PR).orderBy(PR.category, PR.nameEn).limit(500);
}

export async function adminProduct(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db().select().from(PR).where(eq(PR.id, id)).limit(1);
  if (!p) return null;
  const [movements, [ordered]] = await Promise.all([
    db()
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.productId, id))
      .orderBy(desc(schema.stockMovements.createdAt))
      .limit(30),
    db().select({ id: OI.id }).from(OI).where(eq(OI.productId, id)).limit(1),
  ]);
  return { ...p, imageUrl: mediaUrl(p.imagePath), movements, ordered: Boolean(ordered) };
}

/** Active products at or below their low-stock mark. */
export async function lowStockProducts() {
  return db()
    .select({ id: PR.id, nameEn: PR.nameEn, nameBn: PR.nameBn, stock: PR.stock, lowStockAt: PR.lowStockAt })
    .from(PR)
    .where(and(eq(PR.active, true), lte(PR.stock, PR.lowStockAt)))
    .orderBy(asc(PR.stock))
    .limit(50);
}

export async function listCoupons() {
  return db().select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt)).limit(200);
}

/** A coupon that can be used right now, or null. */
export async function usableCoupon(code: string) {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(clean)) return null;
  const C = schema.coupons;
  const now = new Date();
  const [c] = await db()
    .select()
    .from(C)
    .where(
      and(
        eq(C.code, clean),
        eq(C.active, true),
        or(sql`${C.startsAt} is null`, lte(C.startsAt, now)),
        or(sql`${C.endsAt} is null`, gte(C.endsAt, now)),
        or(sql`${C.maxUses} is null`, sql`${C.used} < ${C.maxUses}`),
      ),
    )
    .limit(1);
  return c ?? null;
}

const SOLD: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];

/** Sales for the last `days` days: money, orders, methods, best sellers and a daily line. */
export async function shopReport(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const sold = and(inArray(O.status, SOLD), gte(O.createdAt, since));
  const [totals] = await db()
    .select({
      orders: count(),
      revenue: sql<number>`coalesce(sum(${O.total}), 0)::int`,
      discount: sql<number>`coalesce(sum(${O.discount}), 0)::int`,
      delivery: sql<number>`coalesce(sum(${O.deliveryFee}), 0)::int`,
    })
    .from(O)
    .where(sold);
  const byMethod = await db()
    .select({ method: O.paymentMethod, orders: count(), revenue: sql<number>`sum(${O.total})::int` })
    .from(O)
    .where(sold)
    .groupBy(O.paymentMethod);
  const daily = await db()
    .select({
      day: sql<string>`to_char(${O.createdAt} at time zone 'Asia/Dhaka', 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(${O.total})::int`,
      orders: count(),
    })
    .from(O)
    .where(sold)
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const top = await db()
    .select({
      name: OI.name,
      qty: sql<number>`sum(${OI.qty})::int`,
      revenue: sql<number>`sum(${OI.qty} * ${OI.price})::int`,
    })
    .from(OI)
    .innerJoin(O, eq(O.id, OI.orderId))
    .where(sold)
    .groupBy(OI.name)
    .orderBy(desc(sql`2`))
    .limit(10);
  const [cancelled] = await db()
    .select({ n: count() })
    .from(O)
    .where(and(inArray(O.status, ["cancelled", "returned"]), gte(O.createdAt, since)));
  return {
    orders: totals?.orders ?? 0,
    revenue: totals?.revenue ?? 0,
    discount: totals?.discount ?? 0,
    delivery: totals?.delivery ?? 0,
    cancelled: cancelled?.n ?? 0,
    byMethod,
    daily,
    top,
  };
}

/** Orders in a date range for the CSV export (newest first, capped). */
export async function ordersForExport(from: Date, to: Date) {
  const rows = await db()
    .select()
    .from(O)
    .where(and(gte(O.createdAt, from), lte(O.createdAt, to)))
    .orderBy(desc(O.createdAt))
    .limit(5_000);
  return withItems(rows);
}

/** Active product slugs for the sitemap. */
export async function activeProductSlugs() {
  return db().select({ slug: PR.slug }).from(PR).where(eq(PR.active, true)).limit(5000);
}
