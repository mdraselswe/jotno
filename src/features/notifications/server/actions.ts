"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { actionViewer } from "@/features/auth/server";
import { db, schema } from "@/infrastructure/db";

const subSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(10).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const viewer = await actionViewer();
  const parsed = subSchema.safeParse(input);
  if (!viewer || !parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  await db()
    .insert(schema.pushSubscriptions)
    .values({ userId: viewer.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: viewer.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false };
  await db()
    .delete(schema.pushSubscriptions)
    .where(
      and(eq(schema.pushSubscriptions.endpoint, endpoint), eq(schema.pushSubscriptions.userId, viewer.id)),
    );
  return { ok: true };
}
