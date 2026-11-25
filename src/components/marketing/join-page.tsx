import { ArrowRight, CircleCheck, Plus } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { PeekingPet, type PetKind } from "@/components/illustrations/pets";
import { Spot } from "@/components/illustrations/spots";
import { ButtonLink } from "@/components/ui/button-link";
import type { JoinContent } from "@/content/join";
import { format, type Formatter } from "@/i18n";
import { ShareButton } from "@/features/share";

/** "[word]" → highlighted word (the brand scribble), like the home hero. */
function Title({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/);
  return (
    <>
      {parts.map((p, n) =>
        p.startsWith("[") ? (
          <span key={n} className="block font-extrabold text-primary">
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={n} className="font-light">
            {p}
          </span>
        ),
      )}
    </>
  );
}

/**
 * A shareable onboarding page (owners: /join, vets: /for-vets): hero with
 * an animated scene, benefits, a step timeline, one page-specific section,
 * FAQ, and a closing call to action with a share button.
 */
export function JoinPage({
  c,
  vars,
  fmt,
  scene,
  ctaHref,
  secondaryHref,
  middle,
  pets,
}: {
  c: JoinContent;
  /** Values for {placeholders} in the text. */
  vars: Record<string, string | number>;
  fmt: Formatter;
  scene: ReactNode;
  ctaHref: Route;
  secondaryHref: Route;
  /** The page's own section (prices, earnings calculator), shown after the steps. */
  middle: ReactNode;
  pets: [PetKind, PetKind];
}) {
  const f = (s: string) => format(s, vars);
  return (
    <div className="grid">
      {/* Hero */}
      <section data-no-reveal className="relative overflow-hidden surface-soft dots">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="grid gap-6">
            <p className="justify-self-start rounded-full bg-card px-3 py-1 text-sm font-semibold shadow-(--shadow-control)">
              {c.eyebrow}
            </p>
            <h1 className="font-heading text-[2.5rem] leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-[4rem]">
              <Title text={c.title} />
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{f(c.body)}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={ctaHref} size="lg" variant="brand">
                {c.cta}
                <ArrowRight aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href={secondaryHref} size="lg" variant="outline">
                {c.secondary}
              </ButtonLink>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              {c.trust.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CircleCheck aria-hidden="true" className="size-4 text-primary" />
                  {f(t)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-md">{scene}</div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-page grid gap-10 py-20 md:py-24">
        <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-5xl">
          {c.benefitsTitle}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.benefits.map((b) => (
            <li
              key={b.title}
              data-animate
              className="group glow-border relative grid content-start gap-2 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card) transition-shadow duration-(--motion-base) hover:shadow-(--shadow-card-hover)"
            >
              <Spot
                name={b.spot}
                className="-ms-2 w-32 transition-transform duration-(--motion-slow) ease-out-expo group-hover:scale-105"
              />
              <h3 className="font-heading text-xl font-bold tracking-tight">{b.title}</h3>
              <p className="text-pretty text-muted-foreground">{f(b.body)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className="relative surface-warm dots">
        <PeekingPet kind={pets[0]} className="right-[8%]" />
        <div className="container-page grid gap-10 py-20 md:py-24">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {c.stepsTitle}
          </h2>
          <ol className="relative grid gap-4 md:auto-cols-fr md:grid-flow-col">
            <span
              aria-hidden="true"
              className="absolute top-6 right-6 left-6 hidden h-0.5 bg-foreground/15 md:block"
            />
            {c.steps.map((s, n) => (
              <li key={s.title} data-animate className="relative grid content-start gap-3">
                <span className="relative grid size-12 place-items-center rounded-full bg-foreground font-heading text-lg font-bold text-background tabular-nums shadow-(--shadow-control)">
                  {fmt.number(n + 1)}
                </span>
                <h3 className="font-heading text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="text-sm text-pretty text-foreground/75">{f(s.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {middle}

      {/* FAQ */}
      <section className="container-page grid gap-8 py-20 md:grid-cols-[1fr_1.6fr] md:py-24">
        <div className="grid content-start gap-4">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {c.faqTitle}
          </h2>
          <Spot name="question" className="w-40 max-md:hidden" />
        </div>
        <div className="grid content-start gap-3">
          {c.faq.map((q) => (
            <details
              key={q.q}
              data-animate
              className="group rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) open:shadow-(--shadow-card-hover)"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {q.q}
                <Plus
                  aria-hidden="true"
                  className="size-5 shrink-0 text-primary transition-transform duration-(--motion-base) group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 text-pretty text-muted-foreground">{f(q.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call to action + share */}
      <section className="container-page pt-6 pb-24">
        <div className="relative grid gap-8 rounded-(--radius-3xl) surface-sun p-8 shadow-(--shadow-card) sm:p-12 md:grid-cols-[1.4fr_1fr] md:items-center">
          <PeekingPet kind={pets[1]} delay={2} className="left-[10%]" />
          <div className="grid gap-4">
            <h2 className="font-heading text-4xl leading-[0.98] font-extrabold tracking-tight text-balance md:text-5xl">
              {c.final.title}
            </h2>
            <p className="text-lg text-pretty text-foreground/80">{c.final.body}</p>
            <ButtonLink href={ctaHref} size="lg" className="justify-self-start">
              {c.cta}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          </div>
          <div className="grid gap-3 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card)">
            <p className="font-heading text-xl font-bold">{c.share.title}</p>
            <p className="text-sm text-pretty text-muted-foreground">{c.share.body}</p>
            <ShareButton
              size="lg"
              className="justify-self-start"
              label={c.share.button}
              title={c.share.title}
              text={c.share.text}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
