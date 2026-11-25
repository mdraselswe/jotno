import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { business, site } from "@/config";
import { quickRequestPath } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { localeHref } from "@/lib/locale-href";

const Q = schema.quickRequests;

/**
 * Every few minutes (cron): quick-help questions nobody answered in time
 * become a credit (a free next question); the owner may take the money back
 * instead from the request page. Idempotent.
 */
export async function runQuickJobs(): Promise<{ credited: number }> {
  const credited = await db()
    .update(Q)
    .set({ status: "credited" })
    .where(
      and(
        eq(Q.status, "open"),
        sql`${Q.openedAt} <= now() - make_interval(mins => ${business.quick.answerMinutes})`,
      ),
    )
    .returning({ id: Q.id, ownerId: Q.ownerId });
  for (const r of credited) {
    const [owner] = await db()
      .select({ locale: schema.profiles.locale })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, r.ownerId))
      .limit(1);
    const locale = owner?.locale ?? site.i18n.defaultLocale;
    const t = translator(locale);
    await notify(r.ownerId, "quick.credited", {
      title: t("quick.pushCreditTitle"),
      body: t("quick.pushCreditBody"),
      url: localeHref(locale, quickRequestPath(r.id)),
      tag: `quick-${r.id}`,
    });
  }
  return { credited: credited.length };
}
