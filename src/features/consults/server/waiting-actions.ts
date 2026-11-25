"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { business } from "@/config";
import { actionViewer } from "@/features/auth/server";
import { db, schema } from "@/infrastructure/db";

const C = schema.consults;

export interface WaitingChat {
  id: string;
  ownerName: string | null;
  summary: string;
  /** When the free refund kicks in (ISO). */
  deadline: string;
}

/**
 * Paid chats this vet hasn't answered yet (no text and no call), oldest first.
 * Read by the vet's on-every-page alert; empty for anyone who isn't a vet.
 */
export async function waitingChats(): Promise<WaitingChat[]> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer || viewer.role !== "vet") return [];
  const rows = await db()
    .select({ id: C.id, summary: C.summary, openedAt: C.openedAt, ownerName: schema.profiles.fullName })
    .from(C)
    .innerJoin(schema.providers, eq(schema.providers.id, C.providerId))
    .leftJoin(schema.profiles, eq(schema.profiles.id, C.ownerId))
    .where(
      and(
        eq(schema.providers.profileId, viewer.id),
        eq(C.status, "active"),
        isNull(C.firstReplyAt),
        // Already on a call with that owner: not "waiting".
        sql`not exists (select 1 from calls k where k.consult_id = ${C.id} and k.status = 'active')`,
      ),
    )
    .orderBy(asc(C.openedAt))
    .limit(10);
  const window = business.consult.replyWindowMinutes * 60_000;
  return rows.flatMap((r) =>
    r.openedAt
      ? [
          {
            id: r.id,
            ownerName: r.ownerName,
            summary: r.summary.slice(0, 120),
            deadline: new Date(r.openedAt.getTime() + window).toISOString(),
          },
        ]
      : [],
  );
}
