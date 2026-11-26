import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { sendPush, type PushPayload } from "@/infrastructure/push";
import { withTrailingSlash } from "@/lib/trailing-slash";

const { notifications, pushSubscriptions } = schema;

/**
 * Saves an in-app notification and pushes it to every device of the user.
 * Never throws: a failed push must not break the action that caused it.
 * The link gets its trailing slash here (the site uses `trailingSlash`), so
 * call sites can pass `localeHref(…)` as it is and a tap costs no redirect.
 */
export async function notify(
  userId: string,
  kind: string,
  payload: PushPayload,
  data: Record<string, string | number> = {},
): Promise<void> {
  const push = { ...payload, url: withTrailingSlash(payload.url) };
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

/** Tells every admin (new payment to check, cash-on-delivery order, refund to send, low stock). */
export async function notifyAdmins(kind: string, push: PushPayload): Promise<void> {
  try {
    const admins = await db()
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.role, "admin"))
      .limit(20);
    await Promise.all(admins.map((a) => notify(a.id, kind, push)));
  } catch (error) {
    console.error("notifyAdmins failed", kind, error);
  }
}
