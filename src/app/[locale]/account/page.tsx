import {
  ArrowRight,
  BellRing,
  CalendarDays,
  MessageCircle,
  MessageCircleQuestion,
  Package,
  PawPrint,
  ShoppingBag,
  Siren,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Spot } from "@/components/illustrations/spots";
import { EmptyState, SectionCard, StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { chatPath, orderPath, petPath, ROUTES } from "@/config/routes";
import { listOwnerAppointments } from "@/features/appointments/server";
import { UserAvatar } from "@/features/auth";
import { requireViewer } from "@/features/auth/server";
import { listOwnerConsults } from "@/features/consults/server";
import { dueState } from "@/features/health";
import {
  AddPetTile,
  ageLabel,
  currentCare,
  DUE_BADGE,
  HEALTH_KINDS,
  PetTile,
  worstState,
} from "@/features/pets";
import { listPets, upcomingCare } from "@/features/pets/server";
import { ORDER_STATUS, type OrderStatus } from "@/features/shop";
import { myOrders } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { mediaUrl } from "@/infrastructure/storage";
import { dhakaDay, dhakaMinute } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { isPast } from "@/lib/time";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("nav.account"), t("account.sub"), ROUTES.account, await getLocale());
}

const ORDER_TONE: Partial<Record<OrderStatus, BadgeTone>> = {
  pending_payment: "warning",
  delivered: "success",
  cancelled: "neutral",
  returned: "neutral",
};

function QuickTile({
  href,
  icon: Icon,
  label,
  hint,
  tone = "default",
  className,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  hint: string;
  tone?: "default" | "brand" | "danger";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative grid min-h-30 content-between gap-4 rounded-(--radius-2xl) p-4 shadow-(--shadow-card) ring-1 transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:hover:translate-y-0 sm:p-5",
        tone === "brand" && "bg-primary text-primary-foreground ring-primary",
        tone === "danger" && "bg-destructive/8 ring-destructive/25",
        tone === "default" && "bg-card ring-foreground/6",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-11 place-items-center rounded-(--radius-xl)",
          tone === "brand" && "bg-primary-foreground/15",
          tone === "danger" && "bg-destructive text-white",
          tone === "default" && "bg-primary/10 text-primary",
        )}
      >
        <Icon aria-hidden="true" className="size-5.5" />
      </span>
      <span className="grid gap-0.5 pe-5">
        <span className="font-heading leading-snug font-bold text-balance">{label}</span>
        <span
          className={cn(
            "text-xs text-pretty",
            tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="absolute end-4 top-4 size-4 opacity-60 transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 sm:end-5 sm:top-5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}

function SeeAll({ href, label }: { href: Route; label: string }) {
  return (
    <ButtonLink href={href} variant="ghost" size="sm" className="text-primary">
      {label}
      <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
    </ButtonLink>
  );
}

/** A compact empty state for the summary cards. */
function MiniEmpty({
  icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      action={action}
      className="gap-2 border-0 bg-transparent px-2 py-4 [&_p:first-of-type]:text-base"
    />
  );
}

async function Overview() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.account));
  const [pets, care, appts, consults, orders] = await Promise.all([
    listPets(viewer.id),
    upcomingCare(viewer.id),
    listOwnerAppointments(viewer.id),
    listOwnerConsults(viewer.id),
    myOrders(viewer.id),
  ]);
  const now = new Date();
  const today = dhakaDay(now);
  const hour = Math.floor(dhakaMinute(now) / 60);
  const name = viewer.fullName?.trim().split(/\s+/)[0];
  const greeting = name
    ? t(
        hour >= 4 && hour < 12
          ? "ownerui.greet.morning"
          : hour >= 12 && hour < 17
            ? "ownerui.greet.afternoon"
            : "ownerui.greet.evening",
        { name },
      )
    : t("ownerui.greet.hello");

  // Newest record of each vaccine/medicine only, so a replaced one isn't "due".
  const reminders = currentCare(care)
    .filter((c) => c.dueOn && dueState(c.dueOn, today, 30) !== "ok")
    .slice(0, 5);
  const upcoming = appts
    .filter((a) => a.status === "confirmed" && !isPast(a.startsAt))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const activeChats = consults.filter((c) => c.status === "active");
  const unread = consults.reduce((n, c) => n + c.unread, 0);
  const day = (d: string) => fmt.date(new Date(`${d}T00:00:00+06:00`));
  const href = (r: string) => localeHref(locale, r);

  const chips = [
    { label: t("ownerui.chip.pets"), value: pets.length, href: href(ROUTES.pets) },
    { label: t("ownerui.chip.visits"), value: upcoming.length, href: href(ROUTES.appointments) },
    { label: t("ownerui.chip.unread"), value: unread, href: href(ROUTES.consults) },
  ];

  return (
    <div className="grid gap-8">
      {/* Greeting */}
      <section className="relative overflow-hidden rounded-(--radius-3xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/12 via-transparent to-highlight/25"
        />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <UserAvatar
            user={{ name: viewer.fullName, email: viewer.email, avatarUrl: mediaUrl(viewer.avatarPath) }}
            className="size-14 text-xl ring-4 ring-card sm:size-18 sm:text-2xl"
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
              {greeting}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground sm:text-base">{t("ownerui.greet.sub")}</p>
          </div>
        </div>
        <ul className="relative mt-5 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
          {chips.map((c) => (
            <li key={c.label} className="grid">
              <Link
                href={c.href}
                className="grid content-start gap-0.5 rounded-(--radius-xl) bg-card/80 p-3 ring-1 ring-foreground/8 backdrop-blur transition-colors duration-(--motion-fast) hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="font-heading text-2xl leading-none font-bold tabular-nums">
                  {fmt.number(c.value)}
                </span>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-h" className="grid gap-3">
        <h2 id="quick-h" className="font-heading text-lg font-semibold">
          {t("ownerui.quick.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <QuickTile
            href={href(ROUTES.vets)}
            icon={Stethoscope}
            label={t("ownerui.quick.find")}
            hint={t("ownerui.quick.findHint")}
            tone="brand"
            className="col-span-2"
          />
          <QuickTile
            href={href(ROUTES.ask)}
            icon={MessageCircleQuestion}
            label={t("ownerui.quick.ask")}
            hint={t("ownerui.quick.askHint")}
          />
          <QuickTile
            href={href(ROUTES.newPet)}
            icon={PawPrint}
            label={t("ownerui.quick.addPet")}
            hint={t("ownerui.quick.addPetHint")}
          />
          <QuickTile
            href={href(ROUTES.shop)}
            icon={ShoppingBag}
            label={t("ownerui.quick.shop")}
            hint={t("ownerui.quick.shopHint")}
          />
          <QuickTile
            href={href(ROUTES.emergency)}
            icon={Siren}
            label={t("ownerui.quick.emergency")}
            hint={t("ownerui.quick.emergencyHint")}
            tone="danger"
          />
        </div>
      </section>

      {/* My pets */}
      <section aria-labelledby="pets-h" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="pets-h" className="font-heading text-lg font-semibold">
            {t("account.pets")}
          </h2>
          {pets.length > 0 ? <SeeAll href={href(ROUTES.pets)} label={t("common.seeAll")} /> : null}
        </div>
        {pets.length === 0 ? (
          <div className="flex flex-wrap items-center gap-5 rounded-(--radius-2xl) border-2 border-dashed border-foreground/15 bg-card/50 p-5 max-sm:justify-items-center max-sm:text-center">
            <Spot name="care" className="w-28 shrink-0 max-sm:mx-auto" />
            <div className="grid flex-1 gap-3 max-sm:justify-items-center">
              <p className="text-pretty text-muted-foreground">{t("ownerui.pets.emptyRow")}</p>
              <ButtonLink href={href(ROUTES.newPet)} variant="brand" className="w-fit">
                <PawPrint aria-hidden="true" />
                {t("pets.add")}
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-3 overflow-x-auto px-4 pt-1 pb-3 lg:mx-0 lg:px-0">
            {pets.map((pet) => {
              const state = worstState(
                care.filter((c) => c.petId === pet.id),
                today,
              );
              const badge = state === "none" || state === "ok" ? null : DUE_BADGE[state];
              return (
                <li key={pet.id} className="flex">
                  <PetTile
                    pet={pet}
                    locale={locale}
                    href={href(petPath(pet.id))}
                    sub={ageLabel(t, fmt, pet.birthDate, today) ?? undefined}
                    status={badge ? <StatusBadge tone={badge.tone}>{t(badge.label)}</StatusBadge> : null}
                  />
                </li>
              );
            })}
            <li className="flex">
              <AddPetTile href={href(ROUTES.newPet)} label={t("pets.add")} />
            </li>
          </ul>
        )}
      </section>

      {/* Health reminders */}
      {reminders.length > 0 ? (
        <SectionCard
          title={t("ownerui.reminders.title")}
          description={t("ownerui.reminders.sub")}
          icon={BellRing}
          className="ring-warning/40"
          bodyClassName="p-2 sm:p-3"
        >
          <ul className="grid">
            {reminders.map((c) => {
              const state = dueState(c.dueOn, today);
              const overdue = state === "due";
              const Icon = HEALTH_KINDS[c.kind].icon;
              const pill = state === "none" ? null : DUE_BADGE[state];
              return (
                <li key={c.id}>
                  <Link
                    href={href(petPath(c.petId))}
                    className="flex items-center gap-3 rounded-(--radius-xl) px-2 py-2.5 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-3"
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-(--radius-lg)",
                        overdue
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/20 text-warning-foreground dark:text-warning",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">
                        {c.petName} · {c.title}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {c.dueOn
                          ? overdue
                            ? t("ownerui.reminders.overdue", { date: day(c.dueOn) })
                            : t("health.dueDate", { date: day(c.dueOn) })
                          : null}
                      </span>
                    </span>
                    {pill ? (
                      <StatusBadge tone={pill.tone} className="max-sm:hidden">
                        {t(pill.label)}
                      </StatusBadge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ) : null}

      {/* Summaries */}
      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          title={t("ownerui.visits.title")}
          icon={CalendarDays}
          actions={<SeeAll href={href(ROUTES.appointments)} label={t("common.seeAll")} />}
          bodyClassName="p-2 sm:p-3"
        >
          {upcoming.length === 0 ? (
            <MiniEmpty
              icon={CalendarDays}
              title={t("ownerui.visits.empty")}
              body={t("ownerui.visits.emptyBody")}
              action={
                <ButtonLink href={href(ROUTES.vets)} variant="outline" size="sm">
                  {t("ownerui.quick.find")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="grid">
              {upcoming.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link
                    href={href(ROUTES.appointments)}
                    className="flex items-center gap-3 rounded-(--radius-xl) px-2 py-2.5 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <time
                      dateTime={a.startsAt.toISOString()}
                      className="grid w-12 shrink-0 justify-items-center rounded-(--radius-lg) bg-primary/10 py-1.5 text-primary"
                    >
                      <span className="font-heading text-lg leading-none font-bold tabular-nums">
                        {fmt.date(a.startsAt, { day: "numeric" })}
                      </span>
                      <span className="text-[0.6875rem] font-medium">
                        {fmt.date(a.startsAt, { month: "short" })}
                      </span>
                    </time>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{a.vetName}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {fmt.date(a.startsAt, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                        {a.clinic ? ` · ${a.clinic}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("ownerui.chats.title")}
          icon={MessageCircle}
          actions={<SeeAll href={href(ROUTES.consults)} label={t("common.seeAll")} />}
          bodyClassName="p-2 sm:p-3"
        >
          {activeChats.length === 0 ? (
            <MiniEmpty
              icon={MessageCircle}
              title={t("ownerui.chats.empty")}
              body={t("ownerui.chats.emptyBody")}
              action={
                <ButtonLink href={href(ROUTES.ask)} variant="outline" size="sm">
                  {t("ownerui.quick.ask")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="grid">
              {activeChats.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link
                    href={href(chatPath(c.id))}
                    className="flex items-center gap-3 rounded-(--radius-xl) px-2 py-2.5 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <UserAvatar
                      user={{ name: c.otherName, email: null, avatarUrl: c.otherPhoto }}
                      className="size-10"
                    />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{c.otherName ?? "—"}</span>
                      <span className="truncate text-sm text-muted-foreground">{c.summary}</span>
                    </span>
                    {c.unread > 0 ? (
                      <StatusBadge tone="primary">
                        {t("ownerui.chats.new", { n: fmt.number(c.unread) })}
                      </StatusBadge>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t("ownerui.orders.title")}
          icon={Package}
          actions={<SeeAll href={href(ROUTES.orders)} label={t("common.seeAll")} />}
          bodyClassName="p-2 sm:p-3"
        >
          {orders.length === 0 ? (
            <MiniEmpty
              icon={ShoppingBag}
              title={t("ownerui.orders.empty")}
              body={t("ownerui.orders.emptyBody")}
              action={
                <ButtonLink href={href(ROUTES.shop)} variant="outline" size="sm">
                  {t("shop.browse")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="grid">
              {orders.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <Link
                    href={href(orderPath(o.id))}
                    className="flex items-center gap-3 rounded-(--radius-xl) px-2 py-2.5 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-lg) bg-highlight/25 text-primary">
                      <Package aria-hidden="true" className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{t("shop.orderNo", { n: o.number })}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {fmt.date(o.createdAt)} · {taka(fmt, o.total)}
                      </span>
                    </span>
                    <StatusBadge tone={ORDER_TONE[o.status] ?? "primary"}>
                      {t(ORDER_STATUS[o.status])}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {viewer.role === "owner" ? (
        <p className="text-sm">
          <Link
            href={href(ROUTES.forVets)}
            className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4"
          >
            <Stethoscope aria-hidden="true" className="size-4" />
            {t("account.becomeVet")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div role="status" className="grid gap-8">
      <div className="grid gap-5 rounded-(--radius-3xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-7">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full sm:size-18" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-(--radius-xl)" />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="col-span-2 h-30 rounded-(--radius-2xl)" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-30 rounded-(--radius-2xl)" />
          ))}
          <Skeleton className="h-30 rounded-(--radius-2xl)" />
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-38 shrink-0 rounded-(--radius-2xl)" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-52 rounded-(--radius-2xl)" />
        ))}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}
