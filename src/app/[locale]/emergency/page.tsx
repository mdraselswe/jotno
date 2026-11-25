import {
  AlertTriangle,
  ArrowUp,
  CarFront,
  ClipboardList,
  Droplet,
  FlaskConical,
  MapPin,
  MessageCircle,
  Phone,
  Siren,
  Stethoscope,
  ThermometerSun,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/app-ui";
import { PageTransition } from "@/components/motion/page-transition";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { consultStartPath, ROUTES, vetPath } from "@/config/routes";
import { emergencyContent } from "@/content/emergency";
import { VetPhoto, vetPlace } from "@/features/providers";
import { searchProviders } from "@/features/providers/server";
import { pickLocale } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("emg.title"), t("emg.sub"), ROUTES.emergency, await getLocale());
}

/** An icon for each first-aid card (by its id in src/content/emergency.ts). */
const AID_ICONS: Record<string, LucideIcon> = {
  poison: FlaskConical,
  bleeding: Droplet,
  breathing: Wind,
  heat: ThermometerSun,
  accident: CarFront,
  seizure: Zap,
};

/** Vets who can help now (24/7 or online), with big Call and Chat buttons. */
async function EmergencyVets() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { results } = await searchProviders({ emergency: true, page: 1, pageSize: 6 });
  if (results.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title={t("emg.noVets")}
        action={
          <ButtonLink href={localeHref(locale, ROUTES.vets)} variant="brand" size="lg">
            <MapPin aria-hidden="true" />
            {t("home.findVet")}
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {results.map((v) => {
        const place = vetPlace(v, locale);
        return (
          <li
            key={v.id}
            className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
          >
            <Link
              href={localeHref(locale, vetPath(v.slug))}
              className="group flex min-w-0 items-center gap-3"
            >
              <span className="relative">
                <VetPhoto vet={v} className="size-14" />
                {v.availableNow ? (
                  <span
                    aria-hidden="true"
                    className="absolute end-0 bottom-0 size-3.5 rounded-full border-2 border-card bg-success"
                  />
                ) : null}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-heading text-lg leading-tight font-semibold group-hover:text-primary">
                  {v.displayName}
                </span>
                {place ? <span className="truncate text-sm text-muted-foreground">{place}</span> : null}
                <span className="flex flex-wrap gap-1.5 pt-0.5 text-xs font-semibold">
                  {v.availableNow ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]">
                      {t("vets.onlineNow")}
                    </span>
                  ) : null}
                  {v.emergency24x7 ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      {t("vets.emergency")}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              {v.phonePublic ? (
                <ButtonAnchor
                  href={`tel:${v.phonePublic}`}
                  variant="destructive"
                  size="lg"
                  aria-label={t("pubui.emg.callVet", { name: v.displayName })}
                >
                  <Phone aria-hidden="true" />
                  {t("pubui.emg.call")}
                </ButtonAnchor>
              ) : null}
              <ButtonLink
                href={localeHref(locale, consultStartPath(v.slug))}
                variant="brand"
                size="lg"
                className={v.phonePublic ? undefined : "col-span-2"}
                aria-label={t("pubui.card.chatWith", { name: v.displayName })}
              >
                <MessageCircle aria-hidden="true" />
                {t("pubui.emg.chat")} · {taka(fmt, v.consultFee)}
              </ButtonLink>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmergencyVetsSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, i) => (
        <li
          key={i}
          className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-[1lh] w-2/3 font-heading text-lg leading-tight" />
              <Skeleton className="h-[1lh] w-1/2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-(--control-h-lg) rounded-(--control-radius)" />
            <Skeleton className="h-(--control-h-lg) rounded-(--control-radius)" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A big tappable action: icon tile, label, one line of help. */
function BigAction({
  href,
  icon: Icon,
  label,
  sub,
  tone,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  sub: string;
  tone: "brand" | "plain";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-18 items-center gap-4 rounded-(--radius-2xl) p-4 shadow-(--shadow-card) transition-[translate,box-shadow] duration-(--motion-fast) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-(--press-scale)",
        tone === "brand" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/8",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-(--radius-lg)",
          tone === "brand" ? "bg-primary-foreground/15" : "bg-primary/10 text-primary",
        )}
      >
        <Icon aria-hidden="true" className="size-5.5" />
      </span>
      <span className="grid gap-0.5">
        <span className="font-heading text-lg leading-tight font-bold">{label}</span>
        <span className={cn("text-sm", tone === "brand" ? "opacity-85" : "text-muted-foreground")}>
          {sub}
        </span>
      </span>
    </Link>
  );
}

export default async function EmergencyPage() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const c = pickLocale(emergencyContent, locale);
  const vets = localeHref(locale, ROUTES.vets);
  return (
    <PageTransition>
      <section id="top" data-no-reveal className="bg-destructive/8">
        <div className="container-page grid max-w-3xl gap-5 py-8 md:py-14">
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-destructive px-3 py-1.5 text-sm font-bold text-white shadow-(--shadow-control)">
            <Siren aria-hidden="true" className="size-4" />
            {t("pubui.emg.eyebrow")}
          </p>
          <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-6xl">
            {t("emg.title")}
          </h1>
          <p className="text-lg text-pretty text-foreground/80">{c.intro}</p>
          <div className="grid gap-3">
            {business.emergencyHotline ? (
              <ButtonAnchor
                href={`tel:${business.emergencyHotline}`}
                variant="destructive"
                size="lg"
                className="sos-breathe h-16 text-lg"
              >
                <Phone aria-hidden="true" className="size-5" />
                {t("emg.call", { number: business.emergencyHotline })}
              </ButtonAnchor>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <BigAction
                href={`${vets}/?now=1` as Route}
                icon={MessageCircle}
                label={t("pubui.emg.chatNow")}
                sub={t("pubui.emg.chatNowSub")}
                tone="brand"
              />
              <BigAction
                href={vets}
                icon={MapPin}
                label={t("pubui.emg.findNear")}
                sub={t("pubui.emg.findNearSub")}
                tone="plain"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid max-w-5xl gap-12 py-10 md:py-14">
        {/* Jump straight to the right first-aid card */}
        <nav aria-labelledby="emg-what" className="grid gap-4">
          <h2 id="emg-what" className="font-heading text-2xl font-bold tracking-tight">
            {t("pubui.emg.whatHappened")}
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {c.cards.map((card) => {
              const Icon = AID_ICONS[card.id] ?? AlertTriangle;
              return (
                <li key={card.id}>
                  <a
                    href={`#${card.id}`}
                    className="flex h-full min-h-16 items-center gap-3 rounded-(--radius-xl) bg-card p-3 text-sm leading-snug font-semibold shadow-(--shadow-card) ring-1 ring-foreground/6 transition-colors duration-(--motion-fast) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-(--radius-lg) bg-destructive/10 text-destructive">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    {card.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="grid gap-4" aria-labelledby="emg-vets">
          <div className="grid gap-1">
            <h2 id="emg-vets" className="font-heading text-2xl font-bold tracking-tight">
              {t("pubui.emg.vetsTitle")}
            </h2>
            <p className="text-muted-foreground">{t("pubui.emg.vetsSub")}</p>
          </div>
          <Suspense fallback={<EmergencyVetsSkeleton />}>
            <EmergencyVets />
          </Suspense>
          <Link href={vets} className="justify-self-start text-sm font-medium text-primary hover:underline">
            {t("pubui.emg.seeAll")}
          </Link>
        </section>

        <section className="grid gap-4" aria-labelledby="emg-aid">
          <h2 id="emg-aid" className="font-heading text-2xl font-bold tracking-tight">
            {t("emg.firstAid")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.cards.map((card) => {
              const Icon = AID_ICONS[card.id] ?? AlertTriangle;
              return (
                <li
                  key={card.id}
                  id={card.id}
                  className="grid scroll-mt-24 content-start gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6"
                >
                  <h3 className="flex items-center gap-3 font-heading text-xl leading-snug font-bold">
                    <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-destructive/10 text-destructive">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    {card.title}
                  </h3>
                  <ol className="grid gap-3">
                    {card.steps.map((s, i) => (
                      <li key={s} className="flex gap-3 text-base leading-relaxed text-pretty">
                        <span
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground font-heading text-sm font-bold text-background tabular-nums"
                        >
                          {fmt.number(i + 1)}
                        </span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                  {card.dont ? (
                    <p className="flex gap-2.5 rounded-(--radius-lg) bg-destructive/10 px-4 py-3 text-sm text-pretty">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>
                        <strong className="font-bold text-destructive">{t("pubui.emg.dont")}: </strong>
                        {card.dont}
                      </span>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby="emg-tell"
          className="grid gap-4 rounded-(--radius-2xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6"
        >
          <h2 id="emg-tell" className="flex items-center gap-3 font-heading text-xl font-bold">
            <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
              <ClipboardList aria-hidden="true" className="size-5" />
            </span>
            {c.tellTitle}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {c.tell.map((item) => (
              <li key={item} className="flex gap-2.5 text-pretty">
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("footer.notAdvice")}</p>
          <a
            href="#top"
            className="inline-flex items-center gap-1.5 justify-self-start text-sm font-medium text-primary hover:underline"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
            {t("pubui.emg.backTop")}
          </a>
        </div>
      </div>
    </PageTransition>
  );
}
