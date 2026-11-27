import {
  ArrowLeft,
  HeartPulse,
  MessageCircleQuestion,
  NotebookPen,
  Pencil,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { petPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { dueState, HealthRing, ringProgress, type HealthKind } from "@/features/health";
import { PushPrompt } from "@/features/notifications";
import {
  ageLabel,
  currentCare,
  DeletePetButton,
  DeleteRecordButton,
  DUE_BADGE,
  HEALTH_KINDS,
  HealthRecordForm,
  PetAvatar,
  petKind,
  SEX_KEYS,
  weightLabel,
  worstState,
} from "@/features/pets";
import { getPet } from "@/features/pets/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { dhakaDay } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("account.pets"), robots: { index: false } };
}

const DOT_TONE = {
  due: "bg-destructive text-white",
  soon: "bg-warning text-warning-foreground",
  ok: "bg-success text-success-foreground",
  none: "bg-muted text-muted-foreground",
} as const;

async function PetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, petPath(id)));
  const found = await getPet(viewer.id, id);
  if (!found) notFound();
  const { pet, records } = found;
  const today = dhakaDay(new Date());
  const day = (d: string) => fmt.date(new Date(`${d}T00:00:00+06:00`));

  const latest = (kind: HealthKind) => records.find((r) => r.kind === kind && r.givenOn);
  const ring = (["vaccine", "deworm", "checkup"] as const).map((kind) => {
    const r = latest(kind);
    return { kind, value: ringProgress(kind, r?.givenOn ?? null, r?.dueOn ?? null, today) };
  });
  const pct = (k: HealthKind) => Math.round((ring.find((r) => r.kind === k)?.value ?? 0) * 100);

  // Only the newest record of each vaccine/medicine gets a status; older ones are history.
  const current = new Set(currentCare(records).map((r) => r.id));
  const state = worstState(records, today);
  const badge = state === "none" ? null : DUE_BADGE[state];

  const facts = [
    { label: t("ownerui.pet.age"), value: ageLabel(t, fmt, pet.birthDate, today) },
    { label: t("pets.sex"), value: t(SEX_KEYS[pet.sex]) },
    { label: t("ownerui.pet.weight"), value: weightLabel(t, fmt, pet.weightGrams) },
    { label: t("pets.color"), value: pet.color },
    { label: t("pets.birthDate"), value: pet.birthDate ? day(pet.birthDate) : null },
  ];
  const editHref = localeHref(locale, `${petPath(pet.id)}/edit`);

  return (
    <div className="grid gap-6">
      <Link
        href={localeHref(locale, ROUTES.pets)}
        className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-md) text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("ownerui.pet.back")}
      </Link>

      {/* Profile header */}
      <section className="overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
        <div
          aria-hidden="true"
          className="h-20 bg-linear-to-r from-primary/18 via-highlight/25 to-primary/8 sm:h-24"
        />
        <div className="-mt-12 flex flex-wrap items-end gap-x-5 gap-y-4 px-4 pb-5 sm:px-6">
          <PetAvatar pet={pet} className="size-24 ring-4 ring-card sm:size-28" />
          <div className="grid min-w-0 flex-1 gap-1 pb-1">
            <h1 className="truncate font-heading text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
              {pet.name}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">{petKind(pet, locale)}</p>
            {badge ? <StatusBadge tone={badge.tone}>{t(badge.label)}</StatusBadge> : null}
          </div>
          <div className="flex gap-2 max-sm:w-full max-sm:*:flex-1">
            <ButtonLink href={editHref} variant="outline">
              <Pencil aria-hidden="true" />
              {t("common.edit")}
            </ButtonLink>
            <DeletePetButton petId={pet.id} name={pet.name} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 border-t px-4 py-4 sm:grid-cols-5 sm:px-6">
          {facts.map((f) => (
            <div key={f.label} className="grid gap-0.5 rounded-(--radius-lg) bg-muted/60 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="truncate font-semibold">{f.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <SectionCard title={t("health.heading")} icon={HeartPulse} bodyClassName="grid gap-5">
          <PushPrompt topic="reminders" />
          <HealthRecordForm petId={pet.id} today={today} />
          {records.length === 0 ? (
            <EmptyState
              icon={Syringe}
              title={t("health.empty")}
              body={t("ownerui.health.emptyBody")}
              className="py-8"
            />
          ) : (
            <section aria-labelledby="hist-h" className="grid gap-3">
              <h3 id="hist-h" className="text-sm font-semibold text-muted-foreground">
                {t("ownerui.health.history")}
              </h3>
              <ol className="relative grid gap-3 before:absolute before:inset-y-3 before:start-3.5 before:w-px before:bg-border">
                {records.map((r) => {
                  const kind = HEALTH_KINDS[r.kind];
                  const Icon = kind.icon;
                  const isCurrent = current.has(r.id);
                  const s = isCurrent ? dueState(r.dueOn, today) : "none";
                  const pill = s === "none" ? null : DUE_BADGE[s];
                  return (
                    <li key={r.id} className="relative flex gap-3">
                      <span
                        className={cn(
                          "relative z-1 mt-2.5 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-card",
                          DOT_TONE[s],
                        )}
                      >
                        <Icon aria-hidden="true" className="size-3.5" />
                      </span>
                      <div
                        className={cn(
                          "flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-1.5 rounded-(--radius-xl) p-3",
                          isCurrent ? "bg-muted/50" : "opacity-80",
                        )}
                      >
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <p className="font-semibold break-words">
                            {r.title}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              · {t(kind.label)}
                            </span>
                          </p>
                          {r.givenOn ? (
                            <p className="text-sm text-muted-foreground">
                              {t("ownerui.health.given", { date: day(r.givenOn) })}
                            </p>
                          ) : null}
                          {isCurrent && r.dueOn ? (
                            <p className="text-sm">{t("ownerui.health.next", { date: day(r.dueOn) })}</p>
                          ) : null}
                          {r.note ? <p className="text-sm text-pretty">{r.note}</p> : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {pill ? <StatusBadge tone={pill.tone}>{t(pill.label)}</StatusBadge> : null}
                          <DeleteRecordButton petId={pet.id} recordId={r.id} title={r.title} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </SectionCard>

        <div className="grid content-start gap-6">
          <SectionCard
            title={t("ownerui.health.ringTitle")}
            description={t("ownerui.health.ringHint")}
            icon={ShieldCheck}
          >
            <HealthRing
              label={t("health.ring", { v: pct("vaccine"), d: pct("deworm"), c: pct("checkup") })}
              parts={ring.map((r) => ({ label: t(HEALTH_KINDS[r.kind].label), value: r.value }))}
            />
          </SectionCard>

          <SectionCard
            title={t("pets.notes")}
            icon={NotebookPen}
            actions={
              <ButtonLink href={editHref} variant="ghost" size="icon-sm" aria-label={t("common.edit")}>
                <Pencil aria-hidden="true" />
              </ButtonLink>
            }
          >
            {pet.notes ? (
              <p className="text-sm text-pretty whitespace-pre-line">{pet.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("ownerui.pet.notesEmpty")}</p>
            )}
          </SectionCard>

          <ButtonLink href={localeHref(locale, ROUTES.ask)} variant="brand" size="lg">
            <MessageCircleQuestion aria-hidden="true" />
            {t("ownerui.pet.ask")}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function PetDetailSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <Skeleton className="h-5 w-28" />
      <div className="overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
        <div className="h-20 bg-muted/60 sm:h-24" />
        <div className="-mt-12 flex items-end gap-5 px-4 pb-5 sm:px-6">
          <Skeleton className="size-24 rounded-full ring-4 ring-card sm:size-28" />
          <div className="grid flex-1 gap-2 pb-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t px-4 py-4 sm:grid-cols-5 sm:px-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-(--radius-lg)" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-80 rounded-(--radius-2xl)" />
        <Skeleton className="h-56 rounded-(--radius-2xl)" />
      </div>
    </div>
  );
}

export default function PetPage({ params }: PageProps<"/[locale]/account/pets/[id]">) {
  return (
    <Suspense fallback={<PetDetailSkeleton />}>
      <PetDetail params={params} />
    </Suspense>
  );
}
