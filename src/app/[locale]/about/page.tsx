import { ArrowRight, HeartHandshake, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Spot } from "@/components/illustrations/spots";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { JsonLd } from "@/components/ui/json-ld";
import { ROUTES } from "@/config/routes";
import { aboutContent } from "@/content/pages";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { aboutPageLd, organizationLd } from "@/lib/structured-data";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("pubui.seo.aboutTitle"), t("pubui.seo.aboutDesc"), ROUTES.about, await getLocale());
}

/** One icon per value card, in content order (verified, fair to owners, fair to vets). */
const VALUE_ICONS: readonly LucideIcon[] = [ShieldCheck, HeartHandshake, Stethoscope];

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const c = pickLocale(aboutContent, locale);
  const [lead, ...rest] = c.paragraphs;
  const description = t("pubui.seo.aboutDesc");
  return (
    <PageTransition>
      <JsonLd data={aboutPageLd(locale, t("pubui.seo.aboutTitle"), description)} />
      <JsonLd data={organizationLd(description)} />
      <section data-no-reveal className="relative overflow-hidden surface-soft dots">
        <div className="container-page grid items-center gap-8 py-12 md:grid-cols-[1.4fr_1fr] md:py-20">
          <div className="grid gap-5">
            <p className="justify-self-start rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control)">
              {t("pubui.about.eyebrow")}
            </p>
            <h1 className="font-heading text-[2.4rem] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {c.title}
            </h1>
            <p className="max-w-xl text-xl text-pretty text-muted-foreground">{c.sub}</p>
          </div>
          <Spot name="welcome" className="mx-auto w-56 max-md:hidden md:w-full md:max-w-sm" />
        </div>
      </section>

      <section className="container-page grid gap-6 py-16 md:py-24">
        <div className="grid max-w-3xl gap-6">
          {lead ? (
            <p className="font-heading text-2xl leading-snug font-semibold text-pretty md:text-3xl">{lead}</p>
          ) : null}
          {rest.map((p) => (
            <p key={p} className="text-lg leading-relaxed text-pretty text-foreground/80">
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="container-page grid gap-8 pb-16 md:pb-24">
        <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {c.servicesTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.services.map((s) => (
            <li key={s.title}>
              <Link
                href={localeHref(locale, ROUTES[s.route])}
                className="group grid h-full content-start gap-2 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-shadow duration-(--motion-fast) hover:shadow-(--shadow-card-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex items-center justify-between gap-3 font-heading text-lg font-bold tracking-tight">
                  {s.title}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4.5 text-primary transition-transform duration-(--motion-fast) group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-pretty text-muted-foreground">{s.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-muted">
        <div className="container-page grid gap-10 py-16 md:py-24">
          <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {t("pubui.about.valuesTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {c.values.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? ShieldCheck;
              return (
                <li
                  key={v.title}
                  className="glow-border relative grid content-start gap-3 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card)"
                >
                  <span className="grid size-11 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5.5" />
                  </span>
                  <h3 className="font-heading text-xl font-bold tracking-tight">{v.title}</h3>
                  <p className="text-pretty text-muted-foreground">{v.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="container-page grid gap-6 pt-16 md:grid-cols-[1fr_1.4fr] md:gap-12 md:pt-24">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {c.verifyTitle}
        </h2>
        <ol className="grid gap-4">
          {c.verifySteps.map((step, i) => (
            <li key={step} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-heading font-bold text-primary">
                {fmt.number(i + 1)}
              </span>
              <p className="pt-1 text-lg text-pretty text-foreground/80">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-6 rounded-(--radius-3xl) surface-sun p-8 shadow-(--shadow-card) sm:p-12 md:grid-cols-[1.5fr_auto] md:items-center">
          <div className="grid gap-3">
            <h2 className="font-heading text-3xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-5xl">
              {t("pubui.about.ctaTitle")}
            </h2>
            <p className="text-lg text-pretty text-foreground/80">{t("pubui.about.ctaBody")}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch">
            <ButtonLink href={localeHref(locale, ROUTES.vets)} size="lg">
              {t("home.findVet")}
            </ButtonLink>
            <ButtonLink href={localeHref(locale, ROUTES.ask)} size="lg" variant="outline" className="bg-card">
              {t("account.quickAsk")}
            </ButtonLink>
            <ButtonLink href={localeHref(locale, ROUTES.forVets)} size="lg" variant="ghost">
              {t("nav.forVets")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
