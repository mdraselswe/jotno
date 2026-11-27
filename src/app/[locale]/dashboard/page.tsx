import {
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock,
  ExternalLink,
  FilePen,
  MessageCircle,
  MessageCircleQuestion,
  PenLine,
  Sparkles,
  Star,
  UserRoundPen,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  EmptyState,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  type BadgeTone,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { chatPath, ROUTES, vetPath } from "@/config/routes";
import { VetVisitCard } from "@/features/appointments";
import { getHours, listVetAppointments } from "@/features/appointments/server";
import { listVetConsults } from "@/features/consults/server";
import { vetLedger } from "@/features/payments/server";
import { PushPrompt } from "@/features/notifications";
import {
  AvailableNowSwitch,
  readyForReview,
  SubmitForReviewButton,
  VetChecklist,
  vetChecklist,
  VetPhoto,
} from "@/features/providers";
import { requireVet, vetStats } from "@/features/providers/server";
import { questionsForVet } from "@/features/questions/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay, dhakaMinute } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("nav.dashboard"), t("vetui.home.meta"), ROUTES.dashboard, await getLocale());
}

/** Read once per request (outside the component body, see lib/time.ts). */
const requestNow = () => new Date();

type Status = "draft" | "pending" | "verified" | "rejected" | "suspended";

const STATUS: Record<
  Status,
  { pill: MessageKey; tone: BadgeTone; banner: MessageKey; icon: LucideIcon; box: string; tile: string }
> = {
  draft: {
    pill: "vetui.status.draft",
    tone: "neutral",
    banner: "vetui.banner.draft",
    icon: FilePen,
    box: "bg-card ring-foreground/6",
    tile: "bg-primary/10 text-primary",
  },
  pending: {
    pill: "vetui.status.pending",
    tone: "info",
    banner: "vetui.banner.pending",
    icon: Clock,
    box: "bg-info/8 ring-info/25",
    tile: "bg-info/15 text-info",
  },
  verified: {
    pill: "vetui.status.verified",
    tone: "success",
    banner: "vetui.banner.verified",
    icon: Sparkles,
    box: "bg-card ring-foreground/6",
    tile: "bg-highlight/40 text-highlight-foreground",
  },
  rejected: {
    pill: "vetui.status.rejected",
    tone: "danger",
    banner: "vetui.banner.rejected",
    icon: CircleAlert,
    box: "bg-destructive/6 ring-destructive/25",
    tile: "bg-destructive/12 text-destructive",
  },
  suspended: {
    pill: "vetui.status.suspended",
    tone: "danger",
    banner: "vetui.banner.suspended",
    icon: CircleAlert,
    box: "bg-destructive/6 ring-destructive/25",
    tile: "bg-destructive/12 text-destructive",
  },
};

async function Overview() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { viewer, provider } = await requireVet(locale, localeHref(locale, ROUTES.dashboard));
  const [stats, waiting, upcoming, ledger, hours, questions] = await Promise.all([
    vetStats(provider.id),
    listVetConsults(provider.id, viewer.id, true),
    listVetAppointments(provider.id, true),
    vetLedger(provider.id),
    getHours(provider.id),
    questionsForVet(provider.speciesIds, 30),
  ]);

  const now = requestNow();
  const today = dhakaDay(now);
  const todays = upcoming.filter((a) => dhakaDay(a.startsAt) === today);
  const next = todays.find((a) => a.startsAt.getTime() >= now.getTime());
  const minute = dhakaMinute(now);
  const name = provider.displayName || viewer.fullName || "";
  const greeting =
    minute < 12 * 60
      ? t("vetui.home.morning", { name })
      : minute < 17 * 60
        ? t("vetui.home.afternoon", { name })
        : t("vetui.home.evening", { name });

  const status = STATUS[provider.status];
  const verified = provider.status === "verified";
  const checklist = vetChecklist({
    ...provider,
    speciesCount: provider.speciesIds.length,
    documentKinds: provider.documents.map((d) => d.kind),
    hasHours: hours.length > 0,
  });
  const complete = checklist.every((i) => i.done);
  const canSubmit = provider.status === "draft" || provider.status === "rejected";
  const message = {
    draft: t("vet.statusDraft"),
    pending: t("vet.statusPending"),
    verified: t("vet.completenessHint"),
    rejected: t("vet.statusRejected", { reason: provider.rejectionReason ?? "" }),
    suspended: t("vet.statusSuspended"),
  }[provider.status];
  const rating =
    provider.ratingCount > 0
      ? fmt.number(provider.ratingSum / provider.ratingCount, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "–";
  const time = (d: Date) => fmt.date(d, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="grid gap-6">
      {/* Greeting */}
      <header className="relative isolate overflow-hidden rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 -top-24 -z-10 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -start-10 -bottom-28 -z-10 size-48 rounded-full bg-highlight/25 blur-3xl"
        />
        <div className="flex flex-wrap items-center gap-4">
          <VetPhoto
            vet={{ id: provider.id, photoUrl: provider.photoUrl, displayName: provider.displayName }}
            className="size-16 ring-4 ring-background sm:size-20"
          />
          <div className="grid min-w-0 flex-1 basis-56 gap-1">
            <p className="text-xs font-semibold text-primary">
              {fmt.date(now, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance md:text-3xl">
              {greeting}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <StatusBadge tone={status.tone}>{t(status.pill)}</StatusBadge>
              {verified ? (
                <span>
                  {t("vetui.home.reach", { views: fmt.number(stats.views), calls: fmt.number(stats.calls) })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:*:flex-1">
            {verified ? (
              <ButtonLink href={localeHref(locale, vetPath(provider.slug))} variant="outline">
                <ExternalLink aria-hidden="true" />
                {t("vet.viewPublic")}
              </ButtonLink>
            ) : null}
            <ButtonLink href={localeHref(locale, ROUTES.vetProfile)} variant={verified ? "ghost" : "brand"}>
              <UserRoundPen aria-hidden="true" />
              {t("vetui.quick.profile")}
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Verification / profile status */}
      {!verified || !complete ? (
        <section
          aria-labelledby="vet-status-h"
          className={cn(
            "grid gap-5 rounded-(--radius-2xl) p-4 shadow-(--shadow-card) ring-1 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
            status.box,
          )}
        >
          <div className="flex items-start gap-3.5">
            <span
              className={cn("grid size-11 shrink-0 place-items-center rounded-(--radius-xl)", status.tile)}
            >
              <status.icon aria-hidden="true" className="size-5" />
            </span>
            <div className="grid min-w-0 gap-2">
              <h2 id="vet-status-h" className="font-heading text-lg leading-snug font-bold text-balance">
                {t(status.banner)}
              </h2>
              <p className="text-sm text-pretty text-muted-foreground">{message}</p>
              {canSubmit ? (
                <>
                  <p className="text-sm text-pretty text-muted-foreground">{t("vetui.check.submitHint")}</p>
                  <div className="mt-1">
                    <SubmitForReviewButton />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {provider.status !== "suspended" ? (
            <VetChecklist
              items={checklist}
              locale={locale}
              t={t}
              className={cn(
                "rounded-(--radius-xl) bg-card p-3 ring-1 ring-foreground/6 sm:p-4",
                readyForReview(checklist) && "ring-success/30",
              )}
            />
          ) : null}
        </section>
      ) : null}

      <AvailableNowSwitch
        on={verified && provider.availableNow}
        locked={!verified}
        until={provider.availableUntil ? time(provider.availableUntil) : null}
      />

      {verified ? <PushPrompt /> : null}

      <StatGrid className="md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("vetui.stat.waiting")}
          value={fmt.number(waiting.length)}
          hint={
            waiting.length > 0
              ? t("vetui.stat.waitingHint", { n: fmt.number(business.consult.replyWindowMinutes) })
              : t("vetui.stat.waitingNone")
          }
          icon={MessageCircle}
          href={localeHref(locale, ROUTES.vetConsults)}
          tone={waiting.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("vetui.stat.today")}
          value={fmt.number(todays.length)}
          hint={next ? t("vetui.stat.todayNext", { time: time(next.startsAt) }) : t("vetui.stat.todayNone")}
          icon={CalendarCheck}
          href={localeHref(locale, ROUTES.vetAppointments)}
          tone={todays.length > 0 ? "primary" : "default"}
        />
        <StatCard
          label={t("vetui.stat.month")}
          value={taka(fmt, ledger.month)}
          hint={t("vetui.stat.monthHint", { amount: taka(fmt, ledger.balance.available) })}
          icon={Wallet}
          href={localeHref(locale, ROUTES.vetEarnings)}
          tone="success"
        />
        <StatCard
          label={t("vet.statRating")}
          value={rating}
          hint={
            provider.ratingCount > 0
              ? t("vetui.stat.ratingHint", { n: fmt.number(provider.ratingCount) })
              : t("vetui.stat.noRating")
          }
          icon={Star}
        />
      </StatGrid>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("vet.waiting")}
          icon={MessageCircle}
          actions={
            waiting.length > 0 ? (
              <ButtonLink href={localeHref(locale, ROUTES.vetConsults)} variant="ghost" size="sm">
                {t("vetui.seeAll")}
              </ButtonLink>
            ) : undefined
          }
          bodyClassName={waiting.length > 0 ? "p-2 sm:p-2" : undefined}
        >
          {waiting.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title={t("vet.noWaiting")}
              body={
                !verified
                  ? t("vetui.avail.locked")
                  : provider.availableNow
                    ? t("vetui.waiting.emptyOn")
                    : t("vetui.waiting.emptyOff")
              }
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="grid">
              {waiting.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={localeHref(locale, chatPath(c.id))}
                    className="group flex items-center gap-3 rounded-(--radius-lg) px-3 py-3 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary"
                    >
                      {(c.otherName ?? "?").trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{c.otherName ?? "—"}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {fmt.date(c.createdAt, { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </span>
                      <span className="truncate text-sm text-muted-foreground">{c.summary}</span>
                    </span>
                    {!c.firstReplyAt ? (
                      <StatusBadge tone="danger">{t("consult.new")}</StatusBadge>
                    ) : c.unread > 0 ? (
                      <StatusBadge tone="primary">
                        {t("vetui.waiting.unread", { n: fmt.number(c.unread) })}
                      </StatusBadge>
                    ) : null}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("vetui.today.title")}
          icon={CalendarCheck}
          actions={
            <ButtonLink href={localeHref(locale, ROUTES.vetAppointments)} variant="ghost" size="sm">
              {t("vetui.seeAll")}
            </ButtonLink>
          }
        >
          {todays.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={t("vetui.today.empty")}
              body={hours.length === 0 ? t("appt.noHours") : t("vetui.today.emptyBody")}
              action={
                hours.length === 0 ? (
                  <ButtonLink href={localeHref(locale, ROUTES.vetSchedule)} variant="brand" size="sm">
                    <CalendarClock aria-hidden="true" />
                    {t("vetui.today.setHours")}
                  </ButtonLink>
                ) : undefined
              }
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="grid gap-2.5">
              {todays.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <VetVisitCard visit={a} t={t} fmt={fmt} compact />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <section aria-labelledby="vet-quick-h" className="grid gap-3">
        <h2 id="vet-quick-h" className="font-heading text-lg font-bold">
          {t("vetui.quick.title")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              {
                href: ROUTES.vetProfile,
                icon: UserRoundPen,
                title: t("vetui.quick.profile"),
                sub: t("vetui.quick.profileSub"),
              },
              {
                href: ROUTES.vetSchedule,
                icon: CalendarClock,
                title: t("vetui.quick.schedule"),
                sub: t("vetui.quick.scheduleSub"),
              },
              {
                href: ROUTES.vetNewArticle,
                icon: PenLine,
                title: t("vetui.quick.article"),
                sub: t("vetui.quick.articleSub"),
              },
              {
                href: ROUTES.vetQuestions,
                icon: MessageCircleQuestion,
                title: t("vetui.quick.questions"),
                sub: t("vetui.quick.questionsSub", { n: fmt.number(questions.length) }),
              },
            ] satisfies { href: string; icon: LucideIcon; title: string; sub: string }[]
          ).map((q) => (
            <li key={q.href}>
              <QuickAction href={localeHref(locale, q.href)} icon={q.icon} title={q.title} sub={q.sub} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: Route;
  icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-semibold">{title}</span>
        <span className="truncate text-sm text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180"
      />
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="flex items-center gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-6">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-24 rounded-(--radius-2xl)" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-(--radius-2xl)" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-(--radius-2xl)" />
        <Skeleton className="h-64 rounded-(--radius-2xl)" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-18 rounded-(--radius-2xl)" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SuspenseReveal fallback={<OverviewSkeleton />}>
      <Overview />
    </SuspenseReveal>
  );
}
