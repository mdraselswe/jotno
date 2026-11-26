import { BadgeCheck, CircleDot, Clock, LogIn, MessageCircleQuestion, RotateCcw, Siren } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/layout/app-ui";
import { Spot } from "@/components/illustrations/spots";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { quickRequestPath, ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { StartConsultForm } from "@/features/consults";
import { listPets } from "@/features/pets/server";
import { askQuick, quickCommission } from "@/features/quick";
import { myQuickRequests, onDutyCount, unusedCredit } from "@/features/quick/server";
import { maxPointsFor } from "@/features/referrals";
import { pointsOf } from "@/features/referrals/server";
import { ShareButton } from "@/features/share";
import { plural, type MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  const fmt = await getFormatter();
  return pageMetadata(
    t("quick.metaTitle", { fee: taka(fmt, business.quick.fee) }),
    t("quick.metaDesc", { n: business.quick.answerMinutes }),
    ROUTES.quick,
    await getLocale(),
  );
}

const CARD = "rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6";

const STATUS: Record<string, { label: MessageKey; tone: "info" | "success" | "warning" | "neutral" }> = {
  open: { label: "quick.status.open", tone: "info" },
  claimed: { label: "quick.status.claimed", tone: "success" },
  credited: { label: "quick.status.credited", tone: "warning" },
  used: { label: "quick.status.used", tone: "neutral" },
  refunded: { label: "quick.status.refunded", tone: "neutral" },
};

async function Ask() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  // The viewer read makes this request-time, so the duty count may read the clock.
  const viewer = await getViewer();
  const onDuty = await onDutyCount();
  const here = localeHref(locale, ROUTES.quick);
  const fee = taka(fmt, business.quick.fee);
  const [pets, credit, points, recent] = viewer
    ? await Promise.all([
        listPets(viewer.id),
        unusedCredit(viewer.id),
        pointsOf(viewer.id),
        myQuickRequests(viewer.id, 5),
      ])
    : [[], null, null, []];
  const maxPoints =
    points && !credit
      ? maxPointsFor(
          quickCommission(business.quick.fee, business.quick.vetShare),
          business.referral.commissionSpendBps,
          points.available,
        )
      : 0;

  return (
    <div className="grid gap-4">
      <div
        role="status"
        className={cn(
          CARD,
          "flex items-center gap-3 p-4",
          onDuty > 0 ? "bg-success/8 ring-success/25" : "bg-warning/12 ring-warning/35",
        )}
      >
        <CircleDot
          aria-hidden="true"
          className={cn("size-5 shrink-0", onDuty > 0 ? "text-success" : "text-warning-foreground")}
        />
        <p className="text-sm font-medium text-pretty">
          {onDuty > 0
            ? t(plural(locale, onDuty, "quick.onDutyOne", "quick.onDuty"), { n: fmt.number(onDuty) })
            : t("quick.nobodyOnDuty")}
        </p>
      </div>

      {onDuty === 0 ? (
        <div className={cn(CARD, "grid gap-3 p-5")}>
          <p className="text-sm text-pretty text-muted-foreground">{t("quick.nobodyHelp")}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={localeHref(locale, ROUTES.emergency)} variant="destructive">
              <Siren aria-hidden="true" />
              {t("nav.emergency")}
            </ButtonLink>
            <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="outline">
              <MessageCircleQuestion aria-hidden="true" />
              {t("quick.askFree")}
            </ButtonLink>
          </div>
        </div>
      ) : viewer ? (
        <>
          {credit ? (
            <p className="flex items-start gap-2 rounded-(--radius-xl) bg-success/10 px-4 py-3 text-sm text-pretty">
              <RotateCcw aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              {t("quick.creditNote")}
            </p>
          ) : null}
          <StartConsultForm
            pets={pets.map((p) => ({ id: p.id, name: p.name }))}
            feeLabel={fee}
            maxPhotos={business.quick.photos}
            maxPoints={maxPoints}
            onAsk={askQuick}
            submitLabel={credit ? t("quick.sendWithCredit") : undefined}
          />
          <p className="text-center text-xs text-pretty text-muted-foreground">{t("pay.secure")}</p>
        </>
      ) : (
        <div className={cn(CARD, "grid justify-items-center gap-4 p-6 text-center")}>
          <Spot name="emergency" className="w-32" />
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("quick.signInSub")}</p>
          <ButtonLink
            href={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}` as Route}
            size="lg"
            variant="brand"
          >
            <LogIn aria-hidden="true" />
            {t("consult.signIn")}
          </ButtonLink>
        </div>
      )}

      {recent.length > 0 ? (
        <section className={cn(CARD, "grid gap-2 p-4 sm:p-5")} aria-labelledby="quick-mine">
          <h2 id="quick-mine" className="font-heading text-base font-bold">
            {t("quick.mine")}
          </h2>
          <ul className="grid">
            {recent.map((r) => {
              const s = STATUS[r.status];
              return (
                <li key={r.id}>
                  <Link
                    href={localeHref(locale, quickRequestPath(r.id))}
                    className="flex items-center gap-3 rounded-(--radius-lg) px-2 py-2.5 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{r.summary}</span>
                    {s ? <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AskSkeleton() {
  return (
    <div role="status" className="grid gap-4">
      <Skeleton className="h-14 rounded-(--radius-2xl)" />
      <Skeleton className="h-72 rounded-(--radius-2xl)" />
      <Skeleton className="h-28 rounded-(--radius-2xl)" />
    </div>
  );
}

export default async function QuickPage() {
  const t = await getT();
  const fmt = await getFormatter();
  const fee = taka(fmt, business.quick.fee);
  const steps = [
    { icon: MessageCircleQuestion, text: t("quick.step1", { n: business.quick.photos }) },
    { icon: Clock, text: t("quick.step2", { n: business.quick.answerMinutes }) },
    { icon: BadgeCheck, text: t("quick.step3", { n: business.quick.ownerMessages }) },
    { icon: RotateCcw, text: t("quick.step4", { n: business.quick.answerMinutes }) },
  ];
  return (
    <div className="container-page py-6 md:py-12">
      <div className="mx-auto grid w-full max-w-xl gap-4">
        <header className={cn(CARD, "grid gap-3 bg-destructive/6 p-5 ring-destructive/15 sm:p-6")}>
          <p className="inline-flex items-center gap-2 justify-self-start rounded-full bg-destructive px-3 py-1 text-sm font-bold text-white">
            <Siren aria-hidden="true" className="size-4" />
            {t("quick.eyebrow")}
          </p>
          <h1 className="font-heading text-3xl leading-tight font-extrabold tracking-tight text-balance">
            {t("quick.title", { fee })}
          </h1>
          <p className="text-pretty text-foreground/80">{t("quick.sub")}</p>
          <ShareButton
            className="justify-self-start bg-card"
            title={t("quick.title", { fee })}
            text={t("quick.shareText", { fee })}
          />
        </header>

        <section className={cn(CARD, "grid gap-3 p-4 sm:p-5")} aria-labelledby="quick-how">
          <h2 id="quick-how" className="font-heading text-base font-bold">
            {t("chatui.start.how")}
          </h2>
          <ol className="grid gap-3 text-sm">
            {steps.map((s) => (
              <li key={s.text} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) bg-primary/10 text-primary">
                  <s.icon aria-hidden="true" className="size-4" />
                </span>
                <span className="pt-1 text-pretty">{s.text}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-pretty text-muted-foreground">{t("quick.notEmergency")}</p>
        </section>

        <Suspense fallback={<AskSkeleton />}>
          <Ask />
        </Suspense>
      </div>
    </div>
  );
}
