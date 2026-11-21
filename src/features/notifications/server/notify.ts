import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { sendPush, type PushPayload } from "@/infrastructure/push";

const { notifications, pushSubscriptions } = schema;

/**
 * Saves an in-app notification and pushes it to every device of the user.
 * Never throws: a failed push must not break the action that caused it.
 */
export async function notify(
  userId: string,
  kind: string,
  push: PushPayload,
  data: Record<string, string | number> = {},
): Promise<void> {
  try {
    await db()
      .insert(notifications)
      .values({ userId, kind, data: { ...data, title: push.title, body: push.body, url: push.url } });
    const subs = await db().select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    const results = await Promise.all(subs.map((s) => sendPush(s, push)));
    const gone = subs.filter((_, i) => results[i] === "gone").map((s) => s.id);
    if (gone.length > 0) await db().delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  } catch (error) {
    console.error("notify failed", kind, error);
  }
}
