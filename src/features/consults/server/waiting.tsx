import "server-only";
import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ConsultList } from "@/components/layout/consult-list";
import { ROUTES } from "@/config/routes";
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
      <div className="flex items-center justify-between gap-3">
        <h2 id="waiting-h" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
          <MessageCircle aria-hidden="true" className="size-5 text-primary" />
          {t("vet.waiting")}
          {items.length > 0 ? (
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white tabular-nums">
              {fmt.number(items.length)}
            </span>
          ) : null}
        </h2>
        <Link
          href={localeHref(locale, ROUTES.vetConsults)}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("chatui.list.allChats")}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-(--radius-2xl) border border-dashed border-foreground/15 bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("vet.noWaiting")}
        </p>
      ) : (
        <ConsultList items={items} locale={locale} t={t} fmt={fmt} side="vet" />
      )}
    </section>
  );
}
