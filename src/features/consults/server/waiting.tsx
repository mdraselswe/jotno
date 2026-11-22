import "server-only";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { chatPath } from "@/config/routes";
import { getFormatter, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { db, schema } from "@/infrastructure/db";
import { eq } from "drizzle-orm";
import { listVetConsults } from "./queries";

/** Vet dashboard: chats that need a reply (new, or with unread messages). */
export async function WaitingConsults({ providerId, locale }: { providerId: string; locale: string }) {
  const t = await getT();
  const fmt = await getFormatter();
  const [vet] = await db()
    .select({ profileId: schema.providers.profileId })
    .from(schema.providers)
    .where(eq(schema.providers.id, providerId))
    .limit(1);
  const items = vet ? await listVetConsults(providerId, vet.profileId, true) : [];
  return (
    <section className="grid gap-3" aria-labelledby="waiting-h">
      <h2 id="waiting-h" className="font-heading text-xl font-semibold">
        {t("vet.waiting")}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("vet.noWaiting")}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={localeHref(locale, chatPath(c.id))}
                className="flex items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card) hover:bg-muted/50"
              >
                <MessageCircle aria-hidden="true" className="size-5 text-primary" />
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium">{c.otherName ?? "—"}</span>
                  <span className="truncate text-sm text-muted-foreground">{c.summary}</span>
                </span>
                {!c.firstReplyAt ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    {t("consult.new")}
                  </span>
                ) : c.unread > 0 ? (
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                    {fmt.number(c.unread)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
