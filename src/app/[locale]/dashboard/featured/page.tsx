import { BadgeCheck, CircleAlert, History, Sparkles, TrendingUp, Trophy, Zap } from "lucide-react";
import { DataTable, PageHeader, SectionCard, StatusBadge, type Column } from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { districtName } from "@/content/places";
import { FeaturedPlans } from "@/features/providers";
import { myFeatured, requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Featured", robots: { index: false } };

/** Read once per request (outside the component body, see lib/time.ts). */
const requestNow = () => Date.now();

type Period = Awaited<ReturnType<typeof myFeatured>>[number];

async function Featured() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetFeatured));
  const periods = await myFeatured(provider.id);
  const now = requestNow();
  const phase = (p: Period) =>
    p.startsAt.getTime() > now ? "soon" : p.endsAt.getTime() > now ? "live" : "ended";
  const active = periods.find((p) => phase(p) === "live");
  const verified = provider.status === "verified";
  const canBuy = verified && provider.districtId != null;
  const district = districtName(provider.districtId, locale) ?? "—";

  const perks = [
    { icon: Trophy, text: t("featured.perk1") },
    { icon: TrendingUp, text: t("featured.perk2") },
    { icon: Zap, text: t("featured.perk3") },
  ];

  const columns: Column<Period>[] = [
    {
      key: "from",
      header: t("vetui.feat.from"),
      mobile: "title",
      cell: (p) => (
        <span className="whitespace-nowrap">
          {fmt.date(p.startsAt)} – {fmt.date(p.endsAt)}
        </span>
      ),
    },
    {
      key: "source",
      header: t("vetui.feat.source"),
      cell: (p) => (p.source === "self" ? t("vetui.feat.self") : t("vetui.feat.manual")),
    },
    {
      key: "status",
      header: t("vetui.earn.status"),
      className: "w-32",
      cell: (p) => {
        const ph = phase(p);
        return ph === "live" ? (
          <StatusBadge tone="success">{t("vetui.feat.live")}</StatusBadge>
        ) : ph === "soon" ? (
          <StatusBadge tone="info">{t("vetui.feat.soon")}</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">{t("vetui.feat.ended")}</StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader icon={Sparkles} title={t("featured.title")} sub={t("featured.sub", { district })} />

      {active ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-success/10 p-4 ring-1 ring-success/30 sm:px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
            <BadgeCheck aria-hidden="true" className="size-5" />
          </span>
          <div className="grid min-w-0 flex-1 basis-48">
            <p className="font-heading font-bold">{t("vetui.feat.active")}</p>
            <p className="text-sm text-muted-foreground">
              {t("featured.activeUntil", { date: fmt.date(active.endsAt) })}
            </p>
          </div>
        </div>
      ) : null}

      {!canBuy ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-2xl) bg-warning/15 p-4 ring-1 ring-warning/40 sm:px-5">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          <p className="min-w-0 flex-1 basis-48 text-sm text-pretty">
            {verified ? t("featured.needDistrict") : t("featured.verifiedOnly")}
          </p>
          <ButtonLink
            href={localeHref(locale, verified ? `${ROUTES.vetProfile}/#vp-place` : ROUTES.vetProfile)}
            variant="outline"
            size="sm"
          >
            {t("vetui.feat.fixProfile")}
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <SectionCard
          title={t("vetui.feat.perksTitle")}
          icon={Sparkles}
          className="relative isolate bg-primary text-primary-foreground ring-primary [&_h2]:text-primary-foreground [&_header]:border-primary-foreground/15 [&_header_svg]:text-primary-foreground"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-16 -bottom-16 -z-10 size-48 rounded-full bg-highlight/30 blur-3xl"
          />
          <ul className="grid gap-4">
            {perks.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-(--radius-lg) bg-primary-foreground/15">
                  <p.icon aria-hidden="true" className="size-4.5" />
                </span>
                <span className="pt-1.5 text-sm font-medium text-pretty">{p.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-pretty text-primary-foreground/80">
            {t("featured.note", { n: fmt.number(business.featured.maxPerDistrict) })}
          </p>
        </SectionCard>

        <FeaturedPlans packs={business.featured.packs} disabled={!canBuy} />
      </div>

      {periods.length > 0 ? (
        <section aria-labelledby="feat-history-h" className="grid gap-3">
          <h2 id="feat-history-h" className="flex items-center gap-2 font-heading text-lg font-bold">
            <History aria-hidden="true" className="size-4.5 text-primary" />
            {t("vetui.feat.history")}
          </h2>
          <DataTable
            rows={periods}
            columns={columns}
            rowKey={(p) => p.id}
            caption={t("vetui.feat.history")}
          />
        </section>
      ) : null}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-(--radius-2xl)" />
        <div className="grid gap-3">
          <Skeleton className="h-6 w-36" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-(--radius-2xl)" />
            <Skeleton className="h-40 rounded-(--radius-2xl)" />
          </div>
          <Skeleton className="h-11 w-56 rounded-(--control-radius)" />
        </div>
      </div>
    </div>
  );
}

export default function VetFeaturedPage() {
  return (
    <SuspenseReveal fallback={<FeaturedSkeleton />}>
      <Featured />
    </SuspenseReveal>
  );
}
