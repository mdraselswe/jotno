import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "./index";

/**
 * Fixed-window rate limit backed by Postgres (works on every Worker isolate).
 * Returns true when the call is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db().execute<{ ok: boolean }>(
    sql`select public.rate_hit(${key}, ${limit}, ${windowSeconds}) as ok`,
  );
  return rows[0]?.ok ?? false;
}

/** The caller's IP (Cloudflare sets cf-connecting-ip). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Append-only record of sensitive actions (verification, money, health data access). */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  await db()
    .insert(schema.auditLog)
    .values({ actorId, action, entity, entityId, meta: meta ?? null });
}
