import { BadgeCheck } from "lucide-react";
import type { Route } from "next";
import { Mishu } from "@/components/brand/mishu";
import { PageShell } from "@/components/layout/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { forVetsContent } from "@/content/pages";
import { format, pickLocale } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const locale = await getLocale();
  const c = pickLocale(forVetsContent, locale);
  return pageMetadata(c.title.replace(/[[\]]/g, ""), c.sub, ROUTES.forVets, locale);
}

export default async function ForVetsPage() {
  const locale = await getLocale();
  const c = pickLocale(forVetsContent, locale);
  const pct = business.consult.commissionBps / 100;
  const join =
    `${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(localeHref(locale, ROUTES.onboarding))}` as Route;
  return (
    <PageShell title={c.title} sub={c.sub}>
      <div className="grid gap-12">
        <ButtonLink href={join} size="lg" className="justify-self-start">
          {c.cta}
        </ButtonLink>
        <ul className="grid gap-4 md:grid-cols-2">
          {c.benefits.map((b) => (
            <li
              key={b.title}
              className="grid gap-2 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
            >
              <h2 className="font-heading text-lg font-semibold">{b.title}</h2>
              <p className="text-sm text-muted-foreground">{format(b.body, { pct })}</p>
            </li>
          ))}
        </ul>
        <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <ol className="grid gap-3">
            {c.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <Mishu mood="happy" className="hidden size-32 md:block" />
        </section>
        <section className="grid gap-3">
          {c.faq.map((f) => (
            <details
              key={f.q}
              className="group rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
            >
              <summary className="flex cursor-pointer items-center gap-2 font-medium">
                <BadgeCheck aria-hidden="true" className="size-4 text-primary" />
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
