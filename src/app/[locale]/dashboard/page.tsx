import { CircleAlert, CircleCheck, Clock, ExternalLink } from "lucide-react";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { ROUTES, vetPath } from "@/config/routes";
import { WaitingConsults } from "@/features/consults/server";
import { AvailableNowSwitch, SubmitForReviewButton } from "@/features/providers";
import { requireVet, vetStats } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return pageMetadata(t("nav.dashboard"), t("vet.statusVerified"), ROUTES.dashboard, await getLocale());
}

async function Overview() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { viewer, provider } = await requireVet(locale, localeHref(locale, ROUTES.dashboard));
  const stats = await vetStats(provider.id);
  const status = provider.status;
  const tone =
    status === "verified"
      ? "border-success/40 bg-success/10"
      : status === "pending"
        ? "border-info/40 bg-info/10"
        : status === "draft"
          ? "border-border bg-muted/50"
          : "border-destructive/40 bg-destructive/10";
  const Icon = status === "verified" ? CircleCheck : status === "pending" ? Clock : CircleAlert;
  const message = {
    draft: t("vet.statusDraft"),
    pending: t("vet.statusPending"),
    verified: t("vet.statusVerified"),
    rejected: t("vet.statusRejected", { reason: provider.rejectionReason ?? "" }),
    suspended: t("vet.statusSuspended"),
  }[status];
  const rating =
    provider.ratingCount > 0
      ? fmt.number(provider.ratingSum / provider.ratingCount, { maximumFractionDigits: 1 })
      : "–";

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("vet.hello", { name: provider.displayName || viewer.fullName || "" })}
        action={
          status === "verified" ? (
            <ButtonLink href={localeHref(locale, vetPath(provider.slug))} variant="outline" size="sm">
              <ExternalLink aria-hidden="true" />
              {t("vet.viewPublic")}
            </ButtonLink>
          ) : undefined
        }
      />

      <div
        className={cn(
          "flex flex-wrap items-start gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-control)",
          tone,
        )}
      >
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="min-w-0 flex-1">{message}</p>
        {status === "draft" || status === "rejected" ? <SubmitForReviewButton /> : null}
      </div>

      <div className="glow-border relative grid gap-2 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">{t("vet.completeness", { n: provider.completeness })}</span>
          <ButtonLink href={localeHref(locale, ROUTES.vetProfile)} size="sm" variant="ghost">
            {t("common.edit")}
          </ButtonLink>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div className="h-full rounded-full bg-primary" style={{ width: `${provider.completeness}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{t("vet.completenessHint")}</p>
      </div>

      {status === "verified" ? (
        <AvailableNowSwitch
          on={provider.availableNow}
          until={provider.availableUntil ? fmt.date(provider.availableUntil, { timeStyle: "short" }) : null}
        />
      ) : null}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("vet.statViews"), fmt.number(stats.views)],
          [t("vet.statCalls"), fmt.number(stats.calls)],
          [t("vet.statChats"), fmt.number(provider.consultCount)],
          [t("vet.statRating"), `${rating} (${fmt.number(provider.ratingCount)})`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="glow-border relative grid gap-1 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {status === "verified" ? <WaitingConsults providerId={provider.id} locale={locale} /> : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Private>
      <Overview />
    </Private>
  );
}
