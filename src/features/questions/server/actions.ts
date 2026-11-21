"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { questionPath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit, rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";

const Q = schema.questions;
const AN = schema.answers;
export type QaResult = { ok: true } | { ok: false; error: MessageKey };

const askSchema = z.object({
  title: z.string().trim().min(10).max(140),
  body: z.string().trim().min(20).max(3000),
  speciesId: z.number().int().positive().nullable(),
  photoPath: z.string().nullable(),
});

/** Owner: posts a free question. Vets answer in public. */
export async function askQuestion(locale: string, input: z.input<typeof askSchema>): Promise<QaResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "qa.invalid" };
  if (parsed.data.photoPath && !ownsUpload(parsed.data.photoPath, "question", viewer.id)) {
    return { ok: false, error: "common.notAllowed" };
  }
  if (!(await rateLimit(`ask:${viewer.id}`, 5, 86_400))) return { ok: false, error: "common.tooMany" };
  const [row] = await db()
    .insert(Q)
    .values({
      authorId: viewer.id,
      title: parsed.data.title,
      body: parsed.data.body,
      speciesId: parsed.data.speciesId,
      photoPath: parsed.data.photoPath,
    })
    .returning({ id: Q.id });
  if (!row) return { ok: false, error: "common.genericError" };
  revalidatePath("/[locale]/questions", "page");
  redirect(localeHref(locale, questionPath(row.id)));
}

const answerSchema = z.object({ body: z.string().trim().min(30).max(4000) });

/** Verified vet: answers a question. One answer per vet per question. */
export async function answerQuestion(
  locale: string,
  questionId: string,
  input: z.input<typeof answerSchema>,
): Promise<QaResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "qa.answerShort" };
  const [vet] = await db()
    .select({ id: schema.providers.id, status: schema.providers.status, name: schema.providers.displayName })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, viewer.id))
    .limit(1);
  if (!vet || vet.status !== "verified") return { ok: false, error: "qa.verifiedOnly" };
  if (!(await rateLimit(`answer:${viewer.id}`, 40, 3600))) return { ok: false, error: "common.tooMany" };

  const [q] = await db()
    .select({ id: Q.id, authorId: Q.authorId, status: Q.status, title: Q.title })
    .from(Q)
    .where(eq(Q.id, questionId))
    .limit(1);
  if (!q || q.status === "hidden") return { ok: false, error: "common.notAllowed" };
  const [already] = await db()
    .select({ id: AN.id })
    .from(AN)
    .where(and(eq(AN.questionId, q.id), eq(AN.providerId, vet.id)))
    .limit(1);
  if (already) return { ok: false, error: "qa.alreadyAnswered" };

  await db().insert(AN).values({ questionId: q.id, providerId: vet.id, body: parsed.data.body });
  await db()
    .update(Q)
    .set({ answerCount: sql`${Q.answerCount} + 1`, status: "answered" })
    .where(eq(Q.id, q.id));
  await notify(q.authorId, "question.answered", {
    title: locale === "bn" ? `${vet.name} উত্তর দিয়েছেন` : `${vet.name} answered your question`,
    body: q.title.slice(0, 120),
    url: localeHref(locale, questionPath(q.id)),
    tag: `q-${q.id}`,
  });
  revalidatePath("/[locale]/questions/[id]", "page");
  return { ok: true };
}

/** Signed-in person: marks an answer helpful (or takes it back). */
export async function toggleHelpful(
  answerId: string,
): Promise<{ ok: boolean; voted: boolean; count: number }> {
  const viewer = await actionViewer();
  if (!viewer || !z.uuid().safeParse(answerId).success) return { ok: false, voted: false, count: 0 };
  if (!(await rateLimit(`vote:${viewer.id}`, 120, 3600))) return { ok: false, voted: false, count: 0 };
  const removed = await db()
    .delete(schema.answerVotes)
    .where(and(eq(schema.answerVotes.answerId, answerId), eq(schema.answerVotes.userId, viewer.id)))
    .returning();
  const voted = removed.length === 0;
  if (voted) {
    await db().insert(schema.answerVotes).values({ answerId, userId: viewer.id }).onConflictDoNothing();
  }
  const [row] = await db()
    .update(AN)
    .set({ helpfulCount: sql`greatest(0, ${AN.helpfulCount} + ${voted ? 1 : -1})` })
    .where(eq(AN.id, answerId))
    .returning({ count: AN.helpfulCount });
  return { ok: true, voted, count: row?.count ?? 0 };
}

const reportSchema = z.object({
  entity: z.enum(["question", "answer", "review"]),
  id: z.uuid(),
  reason: z.string().trim().min(3).max(300),
});

/** Anyone signed in: flags content for the admins. */
export async function reportContent(input: z.input<typeof reportSchema>): Promise<QaResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "qa.reportShort" };
  if (!(await rateLimit(`report:${viewer.id}`, 10, 3600))) return { ok: false, error: "common.tooMany" };
  await db().insert(schema.reports).values({
    reporterId: viewer.id,
    entity: parsed.data.entity,
    entityId: parsed.data.id,
    reason: parsed.data.reason,
  });
  if (parsed.data.entity === "question") {
    await db()
      .update(Q)
      .set({ reportCount: sql`${Q.reportCount} + 1` })
      .where(eq(Q.id, parsed.data.id));
  }
  await audit(viewer.id, "report.create", parsed.data.entity, parsed.data.id);
  return { ok: true };
}
