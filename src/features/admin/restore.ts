import { z } from "zod";

/**
 * Hiding reported content: answers and reviews are deleted (no migration for a
 * soft delete), so the "report.hide" audit entry keeps a full copy of the row
 * in its `meta`; a hidden question keeps the status it had. An admin can put it
 * back from the audit log (`restoreHidden`). Helpful votes on an answer are
 * deleted with it and don't come back.
 */
const id = z.guid();
const date = z.coerce.date();

const answerCopy = z.object({
  id,
  questionId: id,
  providerId: id,
  body: z.string(),
  helpfulCount: z.number().int(),
  createdAt: date,
});

const reviewCopy = z.object({
  id,
  consultId: id.nullable(),
  appointmentId: id.nullable(),
  ownerId: id,
  providerId: id,
  rating: z.number().int(),
  body: z.string().nullable(),
  isDemo: z.boolean(),
  createdAt: date,
});

const questionCopy = z.object({ id, status: z.enum(["open", "answered"]) });

const hiddenMeta = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("answer"), entityId: id, copy: answerCopy }),
  z.object({ entity: z.literal("review"), entityId: id, copy: reviewCopy }),
  z.object({ entity: z.literal("question"), entityId: id, copy: questionCopy }),
]);

export type HiddenContent = z.infer<typeof hiddenMeta>;

/** The action an admin's undo writes to the audit log (its meta names the hide entry: `auditId`). */
export const RESTORE_ACTION = "report.restore";

/**
 * What a "report.hide" audit entry can put back, or null: another action, an
 * entry from before copies were kept, or a copy that doesn't parse.
 */
export function restorable(action: string, meta: unknown): HiddenContent | null {
  if (action !== "report.hide") return null;
  const parsed = hiddenMeta.safeParse(meta);
  return parsed.success ? parsed.data : null;
}

/** A database row as plain JSON for the audit log: dates become ISO strings. */
export function toCopy(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}
