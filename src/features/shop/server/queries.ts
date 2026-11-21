import "server-only";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";

const PR = schema.products;
const O = schema.orders;

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt: number | null;
  stock: number;
  category: string;
  speciesId: number | null;
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
  imageUrl: mediaUrl(p.imagePath),
});

export async function listProducts(input: {
  category?: string | null;
  speciesId?: number | null;
  locale: string;
}): Promise<ProductCard[]> {
  const conds: SQL[] = [eq(PR.active, true)];
  if (input.category) conds.push(eq(PR.category, input.category));
  if (input.speciesId) conds.push(eq(PR.speciesId, input.speciesId));
  const rows = await db()
    .select()
    .from(PR)
    .where(and(...conds))
    .orderBy(desc(PR.stock), desc(PR.createdAt))
    .limit(200);
  return rows.map((p) => toProductCard(p, input.locale));
}

export async function getProduct(slug: string, locale: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [p] = await db()
    .select()
    .from(PR)
    .where(and(eq(PR.slug, slug), eq(PR.active, true)))
    .limit(1);
  if (!p) return null;
  return { ...toProductCard(p, locale), description: locale === "bn" ? p.descriptionBn : p.descriptionEn };
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
    .from(schema.orderItems)
    .where(
      inArray(
        schema.orderItems.orderId,
        orders.map((o) => o.id),
      ),
    );
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

export async function myOrders(userId: string) {
  const orders = await db()
    .select()
    .from(O)
    .where(and(eq(O.userId, userId), inArray(O.status, ["paid", "shipped", "delivered", "cancelled"])))
    .orderBy(desc(O.createdAt))
    .limit(50);
  return withItems(orders);
}

export async function adminOrders() {
  const orders = await db()
    .select()
    .from(O)
    .where(inArray(O.status, ["paid", "shipped"]))
    .orderBy(O.createdAt)
    .limit(200);
  return withItems(orders);
}

export async function adminProducts() {
  return db().select().from(PR).orderBy(PR.category, PR.nameEn).limit(500);
}

export async function adminProduct(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db().select().from(PR).where(eq(PR.id, id)).limit(1);
  return p ? { ...p, imageUrl: mediaUrl(p.imagePath) } : null;
}

/** Active product slugs for the sitemap. */
export async function activeProductSlugs() {
  return db().select({ slug: PR.slug }).from(PR).where(eq(PR.active, true)).limit(5000);
}
