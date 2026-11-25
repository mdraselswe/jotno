import { ChevronDown, Mail } from "lucide-react";
import { FilterPills } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { site } from "@/config";
import { ROUTES } from "@/config/routes";
import { LEGAL_UPDATED, legalContent, type LegalDoc } from "@/content/legal";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";

export async function legalMetadata(doc: LegalDoc, route: string) {
  const locale = await getLocale();
  const page = pickLocale(legalContent[doc], locale);
  return pageMetadata(page.title, page.sub, route, locale);
}

const DOCS = [
  { doc: "terms", route: ROUTES.terms, label: "nav.terms" },
  { doc: "privacy", route: ROUTES.privacy, label: "nav.privacy" },
  { doc: "refund", route: ROUTES.refund, label: "nav.refund" },
  { doc: "telemedicine", route: ROUTES.telemedicine, label: "nav.telemedicine" },
] as const;

const sectionId = (i: number) => `section-${i + 1}`;

/**
 * A legal page from src/content/legal.ts: the four policies as tabs, a
 * table of contents (sticky beside the text on desktop, folded on phones),
 * numbered sections at a comfortable reading width, and a contact line.
 */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const page = pickLocale(legalContent[doc], locale);
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00Z`);
  const toc = (
    <ol className="grid gap-0.5 border-s border-foreground/10 text-sm">
      {page.sections.map((s, i) => (
        <li key={s.heading}>
          <a
            href={`#${sectionId(i)}`}
            className="-ms-px flex gap-2 border-s-2 border-transparent py-1.5 ps-4 text-muted-foreground transition-colors duration-(--motion-fast) hover:border-primary hover:text-foreground"
          >
            <span className="tabular-nums">{fmt.number(i + 1)}.</span>
            {s.heading}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <PageTransition>
      <section data-no-reveal className="surface-muted">
        <div className="container-page grid gap-6 pt-8 pb-10 md:pt-12 md:pb-14">
          <FilterPills
            label={t("pubui.legal.docs")}
            items={DOCS.map((d) => ({
              href: localeHref(locale, d.route),
              label: t(d.label),
              active: d.doc === doc,
            }))}
          />
          <div className="grid max-w-3xl gap-3">
            <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-6xl">
              {page.title}
            </h1>
            <p className="text-lg text-pretty text-muted-foreground">{page.sub}</p>
            <p className="justify-self-start rounded-full bg-card px-3 py-1 text-sm text-muted-foreground shadow-(--shadow-control)">
              <time dateTime={LEGAL_UPDATED}>{t("legal.updated", { date: fmt.date(updated) })}</time>
            </p>
          </div>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-8 py-10 md:py-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-labelledby="toc-h" className="lg:sticky lg:top-24 lg:self-start">
          {/* Phones: folded so the text starts right away */}
          <details className="group rounded-(--radius-xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              <span id="toc-h">{t("pubui.legal.toc")}</span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-(--motion-base) group-open:rotate-180"
              />
            </summary>
            <div className="mt-3">{toc}</div>
          </details>
          <div className="grid gap-3 max-lg:hidden">
            <p aria-hidden="true" className="text-xs font-semibold text-muted-foreground uppercase">
              {t("pubui.legal.toc")}
            </p>
            {toc}
          </div>
        </nav>

        <div className="grid max-w-[68ch] min-w-0 gap-10">
          {page.sections.map((s, i) => (
            <section key={s.heading} id={sectionId(i)} className="grid scroll-mt-28 gap-3">
              <h2 className="flex gap-3 font-heading text-xl leading-snug font-bold tracking-tight md:text-2xl">
                <span className="text-primary tabular-nums">{fmt.number(i + 1)}.</span>
                {s.heading}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="text-[1.0625rem] leading-[1.8] text-pretty text-foreground/85">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <aside className="flex gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6">
            <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
              <Mail aria-hidden="true" className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <p className="font-heading font-semibold">{t("pubui.legal.contactTitle")}</p>
              <p className="text-sm text-pretty text-muted-foreground">{t("pubui.legal.contactBody")}</p>
              <a
                href={`mailto:${site.contact.email}`}
                className="justify-self-start text-sm font-medium break-all text-primary hover:underline"
              >
                {site.contact.email}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
