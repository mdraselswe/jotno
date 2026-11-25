import { ArrowRight, BadgeCheck, CircleCheck, Siren, Truck, Zap } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { PeekingPet, RollingBall } from "@/components/illustrations/pets";
import { Spot, type SpotName } from "@/components/illustrations/spots";
import { HeroOrbit, type OrbitPetItem } from "@/components/marketing/hero-orbit";
import { Marquee } from "@/components/marketing/marquee";
import { SquishyPricing, type PricingCard } from "@/components/marketing/squishy-pricing";
import { NumberTicker } from "@/components/motion/number-ticker";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { articlePath, ROUTES } from "@/config/routes";
import { SPECIES } from "@/content/geo";
import { homeContent, ORBIT_PETS, type StepIcon } from "@/content/home";
import { listArticles } from "@/features/articles/server";
import { HomeSearch, VetCard, VetDotMap } from "@/features/providers";
import { liveStats, searchProviders } from "@/features/providers/server";
import { QuestionList } from "@/features/questions";
import { answeredHighlights } from "@/features/questions/server";
import { format, pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { splitAccent } from "@/lib/rich-text";

const STEP_ART: Record<StepIcon, SpotName> = { search: "search", chat: "chat", heart: "care" };

async function LivePanel() {
  const t = await getT();
  const stats = await liveStats();
  return (
    <div className="glow-border relative grid gap-4 rounded-(--radius-3xl) bg-card p-6 shadow-(--shadow-card)">
      <p className="flex items-baseline gap-2">
        <span className="relative flex size-3 self-center">
          <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-3 rounded-full bg-success" />
        </span>
        <span className="font-heading text-5xl font-bold tabular-nums">
          <NumberTicker value={stats.online} />
        </span>
        <span className="text-muted-foreground">{t("home.onlineNow")}</span>
      </p>
      <VetDotMap dots={stats.dots} label={t("home.mapLabel")} />
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          <NumberTicker value={stats.verified} />
        </span>{" "}
        {t("home.verifiedVets")}
      </p>
    </div>
  );
}

async function FeaturedVets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { featured, results } = await searchProviders({ page: 1, pageSize: 4 });
  const vets = [...featured, ...results].slice(0, 4);
  if (vets.length === 0) return null;
  return (
    <ul className="grid gap-3">
      {vets.map((v) => (
        <li key={v.id}>
          <VetCard vet={v} locale={locale} t={t} fmt={fmt} />
        </li>
      ))}
    </ul>
  );
}

async function CommunityRow() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const [questions, { items: articles }] = await Promise.all([
    answeredHighlights(3),
    listArticles({ page: 1 }),
  ]);
  if (questions.length === 0 && articles.length === 0) return null;
  return (
    <section className="relative surface-muted dots">
      <PeekingPet kind="bird" delay={2} className="right-[10%]" />
      <div className="container-page grid gap-10 py-20 md:py-24 lg:grid-cols-2">
        {questions.length > 0 ? (
          <div className="grid content-start gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-heading text-3xl font-bold tracking-tight">{t("qa.highlights")}</h2>
              <ButtonLink href={localeHref(locale, ROUTES.ask)} size="sm">
                {t("qa.ask")}
              </ButtonLink>
            </div>
            <QuestionList items={questions} locale={locale} t={t} fmt={fmt} />
          </div>
        ) : null}
        {articles.length > 0 ? (
          <div className="grid content-start gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-heading text-3xl font-bold tracking-tight">{t("art.title")}</h2>
              <Link
                href={localeHref(locale, ROUTES.articles)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("common.seeAll")}
              </Link>
            </div>
            <ul className="grid gap-3">
              {articles.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link
                    href={localeHref(locale, articlePath(a.slug))}
                    className="group glow-border relative grid gap-1 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card) transition-[transform,box-shadow] duration-(--motion-base) ease-(--ease-ui) hover:shadow-(--shadow-card-hover)"
                  >
                    <span className="font-heading text-lg font-semibold">{a.title}</span>
                    {a.excerpt ? (
                      <span className="line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</span>
                    ) : null}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {a.vetName}
                      <ArrowRight
                        aria-hidden="true"
                        className="ms-auto size-4 transition-transform duration-(--motion-fast) group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <header className="grid max-w-2xl gap-3">
      {eyebrow ? (
        <p className="justify-self-start rounded-full bg-card px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase shadow-(--shadow-control)">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-heading text-4xl leading-[0.95] font-bold tracking-tight text-balance md:text-6xl">
        {title}
      </h2>
      {sub ? <p className="text-lg text-pretty text-muted-foreground">{sub}</p> : null}
    </header>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const c = pickLocale(homeContent, locale);
  const vets = localeHref(locale, ROUTES.vets);

  const pets: OrbitPetItem[] = ORBIT_PETS.map((slug) => {
    const sp = SPECIES.find((s) => s.slug === slug);
    const name = sp ? (locale === "bn" ? sp.bn : sp.en) : slug;
    return {
      slug,
      name,
      line: c.orbit.pets[slug],
      find: format(c.orbit.find, { pet: locale === "bn" ? name : name.toLowerCase() }),
      href: `${vets}/?species=${slug}` as Route,
    };
  });

  // The vet-reply promise comes from config, so the copy can't drift from the refund rule.
  const replyVars = { reply: fmt.number(business.consult.replyWindowMinutes) };
  const priceVars = {
    free: taka(fmt, 0),
    chat: taka(fmt, business.consult.minFee),
    booking: taka(fmt, business.appointment.bookingFee),
  };
  const hrefFor = { ask: ROUTES.ask, vets: ROUTES.vets, forVets: ROUTES.forVets } as const;
  const plans: PricingCard[] = c.pricing.plans.map((p) => ({
    name: p.name,
    price: format(p.price, priceVars),
    unit: p.unit,
    body: p.body,
    points: p.points.map((x) => format(x, replyVars)),
    cta: p.cta,
    href: localeHref(locale, hrefFor[p.href]),
    featured: p.featured,
    tag: p.featured ? c.pricing.popular : undefined,
  }));
  const keep = 100 - business.consult.commissionBps / 100;
  const title = splitAccent(c.hero.title);

  return (
    <PageTransition>
      <HeroOrbit
        pets={pets}
        label={c.orbit.label}
        prev={c.orbit.prev}
        next={c.orbit.next}
        pause={c.orbit.pause}
        play={c.orbit.play}
        badges={c.orbit.badges.map((b) => format(b, replyVars))}
        footer={
          <Marquee
            items={c.marquee}
            className="bg-foreground py-3 font-heading text-lg font-semibold text-background md:text-xl"
          />
        }
      >
        <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-card/80 px-3 py-1.5 text-sm font-semibold text-primary shadow-(--shadow-control) backdrop-blur">
          <BadgeCheck aria-hidden="true" className="size-4" />
          {c.hero.eyebrow}
        </p>
        {/* Two weights, as in the orbit reference: a light line, then the bold one. */}
        <h1 className="font-heading text-[2.6rem] leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-[4.25rem] xl:text-7xl">
          {title.map((part, i) =>
            part.accent ? (
              <span key={i} className="block font-extrabold">
                <span className="scribble">{part.text}</span>
              </span>
            ) : (
              <span key={i} className="font-light">
                {part.text}
              </span>
            ),
          )}
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">{c.hero.body}</p>
        <HomeSearch />
        <ul className="flex flex-wrap gap-2 text-sm">
          {c.trust.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 shadow-(--shadow-control) backdrop-blur"
            >
              <BadgeCheck aria-hidden="true" className="size-4 text-success" />
              {item}
            </li>
          ))}
        </ul>
      </HeroOrbit>

      {/* How it works */}
      <section className="container-page grid gap-10 py-20 md:py-28">
        <SectionTitle title={c.stepsTitle} />
        <ol className="grid gap-5 md:grid-cols-3">
          {c.steps.map((s, i) => (
            <li
              key={s.title}
              className="group glow-border relative grid content-start gap-3 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card) transition-shadow duration-(--motion-base) ease-(--ease-ui) hover:shadow-(--shadow-card-hover)"
              style={{ "--i": i } as CSSProperties}
            >
              <span
                aria-hidden="true"
                className="absolute top-5 right-6 font-heading text-sm font-bold text-muted-foreground tabular-nums"
              >
                {fmt.number(0)}
                {fmt.number(i + 1)}
              </span>
              <Spot
                name={STEP_ART[s.icon]}
                className="-ms-3 w-36 transition-transform duration-(--motion-slow) ease-out-expo group-hover:scale-105"
              />
              <h3 className="font-heading text-2xl font-bold tracking-tight">{s.title}</h3>
              <p className="text-muted-foreground">{format(s.body, replyVars)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Live vets */}
      <section className="relative surface-soft dots">
        <PeekingPet kind="cat" className="right-[8%]" />
        <RollingBall className="-top-9 left-[6%] [--roll:9rem] sm:[--roll:16rem]" />
        <div className="container-page grid gap-8 py-20 md:py-24 lg:grid-cols-[22rem_1fr]">
          <div className="grid content-start gap-6 lg:sticky lg:top-24">
            <SectionTitle title={t("home.vetsTitle")} />
            <Suspense fallback={<Skeleton className="aspect-[5/6] rounded-(--radius-3xl)" />}>
              <LivePanel />
            </Suspense>
            <ButtonLink href={vets} variant="outline" className="justify-self-start">
              {t("common.seeAll")}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          </div>
          <Suspense
            fallback={
              <div className="grid gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-36 rounded-(--radius-2xl)" />
                ))}
              </div>
            }
          >
            <FeaturedVets />
          </Suspense>
        </div>
      </section>

      {/* Pricing */}
      <section className="container-page grid gap-12 py-20 md:py-28">
        <SectionTitle eyebrow={c.pricing.eyebrow} title={c.pricing.title} sub={c.pricing.sub} />
        <SquishyPricing plans={plans} />
        <p className="text-center text-sm text-muted-foreground">
          {format(c.pricing.note, { keep })}{" "}
          <Link
            href={localeHref(locale, ROUTES.forVets)}
            className="font-medium text-primary hover:underline"
          >
            {t("nav.forVets")}
          </Link>
        </p>
      </section>

      {/* Shop */}
      <section className="surface-warm dots">
        <div className="container-page grid items-center gap-10 py-20 md:grid-cols-[1fr_1.1fr] md:py-24">
          <div className="grid gap-4">
            <h2 className="font-heading text-4xl leading-[0.95] font-bold tracking-tight text-balance md:text-5xl">
              {c.shopTeaser.title}
            </h2>
            <p className="max-w-md text-pretty text-foreground/75">{c.shopTeaser.body}</p>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Truck aria-hidden="true" className="size-4 text-primary" />
              {t("shop.codNote")}
            </p>
            <ButtonLink href={localeHref(locale, ROUTES.shop)} size="lg" className="justify-self-start">
              {c.shopTeaser.button}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <PeekingPet kind="dog" delay={1} className="right-8" />
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized local photo */}
            <img
              src="/images/pets/dog-bowl-800.webp"
              srcSet="/images/pets/dog-bowl-400.webp 400w, /images/pets/dog-bowl-800.webp 800w"
              sizes="(min-width: 768px) 28rem, 90vw"
              alt=""
              width={800}
              height={800}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-(--radius-3xl) object-cover shadow-(--shadow-card)"
            />
            <span className="absolute -bottom-8 -left-6 rounded-(--radius-2xl) bg-card p-1 shadow-(--shadow-card) max-sm:hidden">
              <Spot name="shop" className="w-32" />
            </span>
          </div>
        </div>
      </section>

      {/* Emergency: a stacked card on phones (icon + title, text, full-width
          actions), one row from md up. */}
      <section className="container-page py-14">
        <div className="relative grid gap-5 overflow-hidden rounded-(--radius-3xl) bg-destructive/8 p-5 ring-1 ring-destructive/20 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-destructive/8"
          />
          <div className="flex items-center gap-4 md:contents">
            <span className="sos-breathe grid size-14 shrink-0 place-items-center rounded-full bg-destructive text-white shadow-(--shadow-control) md:size-16">
              <Siren aria-hidden="true" className="size-7 md:size-8" />
            </span>
            <h2 className="font-heading text-2xl font-bold tracking-tight md:hidden">{c.emergency.title}</h2>
          </div>
          <div className="relative grid gap-1">
            <h2 className="font-heading text-2xl font-bold tracking-tight max-md:hidden">
              {c.emergency.title}
            </h2>
            <p className="text-pretty text-foreground/80">{c.emergency.body}</p>
          </div>
          <div className="relative grid gap-2 sm:flex sm:flex-wrap md:grid md:justify-items-stretch">
            <ButtonLink
              href={localeHref(locale, ROUTES.emergency)}
              variant="destructive"
              size="lg"
              className="w-full sm:w-auto md:w-full"
            >
              <Siren aria-hidden="true" />
              {c.emergency.button}
            </ButtonLink>
            {business.quick.enabled ? (
              <ButtonLink
                href={localeHref(locale, ROUTES.quick)}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto md:w-full"
              >
                <Zap aria-hidden="true" />
                {t("quick.ctaTitle", { fee: taka(fmt, business.quick.fee) })}
              </ButtonLink>
            ) : null}
            <ButtonLink href={vets} variant="outline" size="lg" className="w-full sm:w-auto md:w-full">
              {t("nav.vets")}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <CommunityRow />
      </Suspense>

      {/* For vets */}
      <section className="relative container-page py-20 md:py-24">
        <PeekingPet
          kind="cat"
          delay={4}
          className="top-20 bottom-auto left-[12%] -translate-y-full md:top-24"
        />
        <div className="relative grid items-center gap-10 overflow-hidden rounded-(--radius-3xl) bg-primary p-8 text-primary-foreground shadow-(--shadow-card) sm:p-12 md:grid-cols-[1.3fr_1fr]">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-80 rounded-full bg-primary-foreground/6"
          />
          <div className="relative grid gap-5">
            <h2 className="font-heading text-4xl leading-[0.95] font-extrabold tracking-tight text-balance md:text-6xl">
              {c.vetCta.title}
            </h2>
            <p className="max-w-lg text-lg text-pretty text-primary-foreground/95">{c.vetCta.body}</p>
            <ButtonLink
              href={localeHref(locale, ROUTES.forVets)}
              size="lg"
              className="justify-self-start bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              {c.vetCta.button}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          </div>
          <ul className="relative grid gap-3">
            {c.stickers.map((item, i) => (
              <li
                key={item}
                data-animate
                className="flex items-center gap-3 rounded-(--radius-xl) bg-primary-foreground/5 px-4 py-3 font-medium ring-1 ring-primary-foreground/20"
                style={{ "--i": i } as CSSProperties}
              >
                <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-highlight" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <p className="sr-only">{t("meta.description")}</p>
    </PageTransition>
  );
}
