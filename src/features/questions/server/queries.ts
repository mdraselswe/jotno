import "server-only";
import { and, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";

const Q = schema.questions;
const AN = schema.answers;
export const PAGE_SIZE = 20;

export interface QuestionItem {
  id: string;
  title: string;
  excerpt: string;
  speciesId: number | null;
  answerCount: number;
  status: (typeof Q.$inferSelect)["status"];
  createdAt: Date;
}

const listCols = {
  id: Q.id,
  title: Q.title,
  body: Q.body,
  speciesId: Q.speciesId,
  answerCount: Q.answerCount,
  status: Q.status,
  createdAt: Q.createdAt,
};

const toItem = (r: {
  id: string;
  title: string;
  body: string;
  speciesId: number | null;
  answerCount: number;
  status: QuestionItem["status"];
  createdAt: Date;
}): QuestionItem => ({
  id: r.id,
  title: r.title,
  excerpt: r.body.length > 180 ? `${r.body.slice(0, 177)}…` : r.body,
  speciesId: r.speciesId,
  answerCount: r.answerCount,
  status: r.status,
  createdAt: r.createdAt,
});

export async function listQuestions(input: {
  speciesId?: number | null;
  q?: string | null;
  filter?: "all" | "answered" | "open";
  page?: number;
}): Promise<{ items: QuestionItem[]; total: number }> {
  const conds: SQL[] = [ne(Q.status, "hidden")];
  if (input.speciesId) conds.push(eq(Q.speciesId, input.speciesId));
  if (input.filter === "answered") conds.push(eq(Q.status, "answered"));
  if (input.filter === "open") conds.push(eq(Q.status, "open"));
  const q = input.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = or(ilike(Q.title, like), ilike(Q.body, like));
    if (match) conds.push(match);
  }
  const where = and(...conds);
  const page = Math.max(1, Math.min(input.page ?? 1, 50));
  const [rows, [count]] = await Promise.all([
    db()
      .select(listCols)
      .from(Q)
      .where(where)
      .orderBy(desc(Q.createdAt))
      .limit(page * PAGE_SIZE),
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(Q)
      .where(where),
  ]);
  return { items: rows.map(toItem), total: Number(count?.n ?? 0) };
}

export interface AnswerView {
  id: string;
  body: string;
  helpfulCount: number;
  voted: boolean;
  createdAt: Date;
  vet: {
    id: string;
    name: string;
    slug: string;
    title: string | null;
    photoUrl: string | null;
    verified: boolean;
  };
}

export interface QuestionView extends QuestionItem {
  body: string;
  photoUrl: string | null;
  mine: boolean;
  answers: AnswerView[];
}

export async function getQuestion(id: string, viewerId: string | null): Promise<QuestionView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [q] = await db().select().from(Q).where(eq(Q.id, id)).limit(1);
  if (!q || q.status === "hidden") return null;
  const answers = await db()
    .select({
      id: AN.id,
      body: AN.body,
      helpfulCount: AN.helpfulCount,
      createdAt: AN.createdAt,
      vetId: schema.providers.id,
      name: schema.providers.displayName,
      slug: schema.providers.slug,
      title: schema.providers.title,
      photoPath: schema.providers.photoPath,
      status: schema.providers.status,
    })
    .from(AN)
    .innerJoin(schema.providers, eq(schema.providers.id, AN.providerId))
    .where(eq(AN.questionId, id))
    .orderBy(desc(AN.helpfulCount), AN.createdAt);
  const votedIds = new Set<string>();
  if (viewerId && answers.length > 0) {
    const votes = await db()
      .select({ answerId: schema.answerVotes.answerId })
      .from(schema.answerVotes)
      .where(
        and(
          eq(schema.answerVotes.userId, viewerId),
          inArray(
            schema.answerVotes.answerId,
            answers.map((a) => a.id),
          ),
        ),
      );
    for (const v of votes) votedIds.add(v.answerId);
  }
  return {
    ...toItem(q),
    body: q.body,
    photoUrl: mediaUrl(q.photoPath),
    mine: viewerId === q.authorId,
    answers: answers.map((a) => ({
      id: a.id,
      body: a.body,
      helpfulCount: a.helpfulCount,
      voted: votedIds.has(a.id),
      createdAt: a.createdAt,
      vet: {
        id: a.vetId,
        name: a.name,
        slug: a.slug,
        title: a.title,
        photoUrl: mediaUrl(a.photoPath),
        verified: a.status === "verified",
      },
    })),
  };
}

/** Questions waiting for a vet: unanswered first, the vet's species first. */
export async function questionsForVet(speciesIds: number[], limit = 30): Promise<QuestionItem[]> {
  const rows = await db()
    .select(listCols)
    .from(Q)
    .where(eq(Q.status, "open"))
    .orderBy(
      speciesIds.length > 0
        ? sql`case when ${Q.speciesId} in (${sql.join(
            speciesIds.map((s) => sql`${s}`),
            sql`, `,
          )}) then 0 else 1 end`
        : sql`0`,
      desc(Q.createdAt),
    )
    .limit(limit);
  return rows.map(toItem);
}

/** Recently answered questions for the home page. */
export async function answeredHighlights(limit = 4): Promise<QuestionItem[]> {
  const rows = await db()
    .select(listCols)
    .from(Q)
    .where(eq(Q.status, "answered"))
    .orderBy(desc(Q.createdAt))
    .limit(limit);
  return rows.map(toItem);
}

export async function myQuestions(userId: string): Promise<QuestionItem[]> {
  const rows = await db()
    .select(listCols)
    .from(Q)
    .where(eq(Q.authorId, userId))
    .orderBy(desc(Q.createdAt))
    .limit(50);
  return rows.map(toItem);
}

/** Answered question ids for the sitemap (unanswered ones are noindex). */
export async function answeredQuestionIds() {
  return db()
    .select({ id: Q.id, createdAt: Q.createdAt })
    .from(Q)
    .where(eq(Q.status, "answered"))
    .orderBy(desc(Q.createdAt))
    .limit(10_000);
}

/**
 * Who may answer: a signed-in vet (or admin) whose own vet profile is
 * verified. Returns that profile, or null. `answerQuestion` uses this same
 * check, so the answer form shows exactly when an answer would be accepted.
 */
export async function answeringVet(
  viewer: { id: string; role: string } | null,
): Promise<{ id: string; name: string } | null> {
  if (!viewer || (viewer.role !== "vet" && viewer.role !== "admin")) return null;
  const [vet] = await db()
    .select({ id: schema.providers.id, status: schema.providers.status, name: schema.providers.displayName })
    .from(schema.providers)
    .where(eq(schema.providers.profileId, viewer.id))
    .limit(1);
  return vet && vet.status === "verified" ? { id: vet.id, name: vet.name } : null;
}
