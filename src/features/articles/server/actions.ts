"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ROUTES, vetArticlePath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { shortId, slugify } from "@/lib/slug";

const AR = schema.articles;
export type ArticleResult = { ok: true } | { ok: false; error: MessageKey };

const articleSchema = z.object({
  title: z.string().trim().min(8).max(140),
  excerpt: z.string().trim().max(300).optional(),
  body: z.string().trim().min(200).max(20_000),
  speciesId: z.number().int().positive().nullable(),
  publish: z.boolean(),
});

async function myVet(userId: string) {
  const [vet] = await db()
    .select({ id: schema.providers.id, status: schema.providers.status })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, userId))
    .limit(1);
  return vet ?? null;
}

/** Vet: create or update an article; verified vets can publish. */
export async function saveArticle(
  locale: string,
  id: string | null,
  input: z.input<typeof articleSchema>,
): Promise<ArticleResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const vet = await myVet(viewer.id);
  if (!vet) return { ok: false, error: "common.notAllowed" };
  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "art.invalid" };
  if (parsed.data.publish && vet.status !== "verified") return { ok: false, error: "qa.verifiedOnly" };
  if (!(await rateLimit(`article:${viewer.id}`, 60, 3600))) return { ok: false, error: "common.tooMany" };

  const values = {
    title: parsed.data.title,
    excerpt: parsed.data.excerpt || null,
    body: parsed.data.body,
    speciesId: parsed.data.speciesId,
    status: parsed.data.publish ? ("published" as const) : ("draft" as const),
  };
  let savedId = id;
  if (id) {
    const [existing] = await db()
      .select({ publishedAt: AR.publishedAt })
      .from(AR)
      .where(and(eq(AR.id, id), eq(AR.providerId, vet.id)))
      .limit(1);
    if (!existing) return { ok: false, error: "common.notAllowed" };
    await db()
      .update(AR)
      .set({
        ...values,
        publishedAt: parsed.data.publish ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(AR.id, id), eq(AR.providerId, vet.id)));
  } else {
    const [row] = await db()
      .insert(AR)
      .values({
        ...values,
        providerId: vet.id,
        slug: `${slugify(parsed.data.title, "article")}-${shortId()}`,
        publishedAt: parsed.data.publish ? new Date() : null,
      })
      .returning({ id: AR.id });
    savedId = row?.id ?? null;
  }
  revalidatePath("/[locale]/articles", "layout");
  revalidatePath("/[locale]/dashboard/articles", "layout");
  if (!id && savedId) redirect(localeHref(locale, vetArticlePath(savedId)));
  return { ok: true };
}

export async function deleteArticle(locale: string, id: string): Promise<ArticleResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const vet = await myVet(viewer.id);
  if (!vet || !z.uuid().safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  await db()
    .delete(AR)
    .where(and(eq(AR.id, id), eq(AR.providerId, vet.id)));
  revalidatePath("/[locale]/articles", "layout");
  redirect(localeHref(locale, ROUTES.vetArticles));
}
