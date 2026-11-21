import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";

const AR = schema.articles;
const P = schema.providers;
export const ARTICLES_PAGE = 12;

export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  speciesId: number | null;
  publishedAt: Date | null;
  vetName: string;
}

const cardCols = {
  id: AR.id,
  slug: AR.slug,
  title: AR.title,
  excerpt: AR.excerpt,
  speciesId: AR.speciesId,
  publishedAt: AR.publishedAt,
  vetName: P.displayName,
};

export async function listArticles(input: {
  speciesId?: number | null;
  page?: number;
}): Promise<{ items: ArticleCard[]; total: number }> {
  const conds: SQL[] = [eq(AR.status, "published")];
  if (input.speciesId) conds.push(eq(AR.speciesId, input.speciesId));
  const page = Math.max(1, Math.min(input.page ?? 1, 50));
  const [items, [count]] = await Promise.all([
    db()
      .select(cardCols)
      .from(AR)
      .innerJoin(P, eq(P.id, AR.providerId))
      .where(and(...conds))
      .orderBy(desc(AR.publishedAt))
      .limit(page * ARTICLES_PAGE),
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(AR)
      .where(and(...conds)),
  ]);
  return { items, total: Number(count?.n ?? 0) };
}

export interface ArticleView extends ArticleCard {
  body: string;
  updatedAt: Date;
  vet: { slug: string; title: string | null; photoUrl: string | null; verified: boolean };
}

export async function getArticle(slug: string): Promise<ArticleView | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const [row] = await db()
    .select({
      ...cardCols,
      body: AR.body,
      updatedAt: AR.updatedAt,
      vetSlug: P.slug,
      vetTitle: P.title,
      photoPath: P.photoPath,
      status: P.status,
    })
    .from(AR)
    .innerJoin(P, eq(P.id, AR.providerId))
    .where(and(eq(AR.slug, slug), eq(AR.status, "published")))
    .limit(1);
  if (!row) return null;
  const { vetSlug, vetTitle, photoPath, status, ...rest } = row;
  return {
    ...rest,
    vet: { slug: vetSlug, title: vetTitle, photoUrl: mediaUrl(photoPath), verified: status === "verified" },
  };
}

export async function myArticles(providerId: string) {
  return db()
    .select({ id: AR.id, slug: AR.slug, title: AR.title, status: AR.status, updatedAt: AR.updatedAt })
    .from(AR)
    .where(eq(AR.providerId, providerId))
    .orderBy(desc(AR.updatedAt))
    .limit(100);
}

export async function myArticle(providerId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db()
    .select()
    .from(AR)
    .where(and(eq(AR.id, id), eq(AR.providerId, providerId)))
    .limit(1);
  return row ?? null;
}

/** Slugs for the sitemap. */
export async function publishedArticleSlugs() {
  return db()
    .select({ slug: AR.slug, updatedAt: AR.updatedAt })
    .from(AR)
    .where(eq(AR.status, "published"))
    .limit(5000);
}
