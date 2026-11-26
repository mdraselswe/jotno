import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  CircleCheck,
  Gift,
  MessageCircleQuestionMark,
  MessagesSquare,
  Search,
  ShoppingBag,
  Siren,
  Syringe,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { PeekingPet, type PetKind } from "@/components/illustrations/pets";
import { ButtonLink } from "@/components/ui/button-link";
import type { JoinContent, JoinIcon } from "@/content/join";
import { format, type Formatter } from "@/i18n";
import { ShareButton } from "@/features/share";

const ICONS: Record<JoinIcon, LucideIcon> = {
  search: Search,
  question: MessageCircleQuestionMark,
  chat: MessagesSquare,
  quick: Zap,
  clinic: CalendarCheck,
  records: Syringe,
  emergency: Siren,
  shop: ShoppingBag,
  points: Gift,
  fee: Wallet,
  badge: BadgeCheck,
  clients: Users,
  payout: Banknote,
};

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
 * A shareable onboarding page (owners: /join, vets: /for-vets), kept short
 * so it reads in a minute on a phone: hero, what you get (each line with its
 * price), the page's own section (vets: earnings), then three steps with the
 * call to action and a share button.
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
  /** The page's own section (the vets' earnings calculator), after the list. */
  middle?: ReactNode;
  pets: [PetKind, PetKind];
}) {
  const f = (s: string) => format(s, vars);
  return (
    <div className="grid">
      {/* Hero */}
      <section data-no-reveal className="relative overflow-hidden surface-soft dots">
        <div className="container-page grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div className="grid gap-5">
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
          {/* Phones go straight from the pitch to the list. */}
          <div className="mx-auto w-full max-w-md max-md:hidden">{scene}</div>
        </div>
      </section>

      {/* What you get, each with its price */}
      <section className="container-page grid gap-6 py-12 md:py-16">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {c.itemsTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li
                key={item.title}
                data-animate
                className="flex gap-3.5 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) sm:p-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 content-start gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <h3 className="font-heading font-bold tracking-tight">{item.title}</h3>
                    {item.tag ? (
                      <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success tabular-nums dark:text-[color-mix(in_oklch,var(--success),white_35%)]">
                        {f(item.tag)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-pretty text-muted-foreground">{f(item.body)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {middle}

      {/* Three steps, the call to action and share */}
      <section className="container-page pt-4 pb-20">
        <div className="relative grid gap-8 rounded-(--radius-3xl) surface-sun p-6 shadow-(--shadow-card) sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <PeekingPet kind={pets[1]} delay={2} className="left-[10%]" />
          <div className="grid gap-5">
            <h2 className="font-heading text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-4xl">
              {c.stepsTitle}
            </h2>
            <ol className="grid gap-3">
              {c.steps.map((s, n) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground font-heading text-sm font-bold text-background tabular-nums">
                    {fmt.number(n + 1)}
                  </span>
                  <span className="font-medium text-pretty">{f(s)}</span>
                </li>
              ))}
            </ol>
            <ButtonLink href={ctaHref} size="lg" className="justify-self-start">
              {c.cta}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
            <p className="text-sm text-foreground/75">{c.final.body}</p>
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
