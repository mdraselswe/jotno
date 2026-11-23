import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { roleIn } from "../rules";

const C = schema.consults;

/** The consult and the viewer's side in it ("owner" | "vet"), or null if they aren't in it. */
export async function participant(consultId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(consultId)) return null;
  const [row] = await db()
    .select({ c: C, vetProfileId: schema.providers.profileId, vetName: schema.providers.displayName })
    .from(C)
    .innerJoin(schema.providers, eq(schema.providers.id, C.providerId))
    .where(eq(C.id, consultId))
    .limit(1);
  if (!row) return null;
  const role = roleIn({ ownerId: row.c.ownerId, providerProfileId: row.vetProfileId }, userId);
  return role ? { ...row, role, otherId: role === "vet" ? row.c.ownerId : row.vetProfileId } : null;
}

/** Minutes an admin may read a consult after giving a reason. */
export const READ_GRANT_MINUTES = 30;

/**
 * An admin may read a consult's messages only for 30 minutes after writing why
 * (audit log "consult.read", see the admin action openConsultTranscript).
 */
export async function adminCanRead(adminId: string, consultId: string): Promise<boolean> {
  const A = schema.auditLog;
  const [row] = await db()
    .select({ id: A.id })
    .from(A)
    .where(
      and(
        eq(A.actorId, adminId),
        eq(A.action, "consult.read"),
        eq(A.entity, "consult"),
        eq(A.entityId, consultId),
        gt(A.createdAt, new Date(Date.now() - READ_GRANT_MINUTES * 60_000)),
      ),
    )
    .limit(1);
  return Boolean(row);
}
