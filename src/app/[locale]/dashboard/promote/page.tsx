import { CircleAlert, Printer, Share2 } from "lucide-react";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { ROUTES, vetPath } from "@/config/routes";
import { requireVet } from "@/features/providers/server";
import { atLeast, GoldFeaturedButton, InvitePanel } from "@/features/referrals";
import { inviteSummary, siteLink } from "@/features/referrals/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("promote.title"), robots: { index: false } };
}

async function Promote() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { viewer, provider } = await requireVet(locale, localeHref(locale, ROUTES.vetPromote));
  const summary = await inviteSummary(viewer.id);
  const r = business.referral;
  const verified = provider.status === "verified";
  const link = siteLink(localeHref(locale, vetPath(provider.slug)), summary.code);
  const percent = (bps: number) => fmt.number(bps / 100);

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("promote.title")}
        sub={t("promote.sub")}
        icon={Share2}
        action={
          verified ? (
            <ButtonLink href={localeHref(locale, ROUTES.vetPoster)} variant="outline" size="sm">
              <Printer aria-hidden="true" />
              {t("promote.poster")}
            </ButtonLink>
          ) : undefined
        }
      />
      {!verified ? (
        <p className="flex items-start gap-3 rounded-(--radius-2xl) bg-warning/15 p-4 text-sm text-pretty ring-1 ring-warning/40 sm:px-5">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t("promote.notVerified")}
        </p>
      ) : null}
      <InvitePanel
        summary={summary}
        link={link}
        shareTitle={provider.displayName}
        shareText={t("share.vetText", { name: provider.displayName })}
        qrLabel={t("promote.qr", { name: provider.displayName })}
        t={t}
        fmt={fmt}
        perks={{
          star: t("grow.vetPerk.star", {
            own: percent(r.vetOwnClientBps),
            normal: percent(business.consult.commissionBps),
          }),
          gold: t("grow.vetPerk.gold", { n: r.goldFeaturedDays }),
          platinum: t("grow.vetPerk.platinum"),
        }}
        extra={
          atLeast(summary.level, "gold") ? (
            <div className="grid gap-2 rounded-(--radius-xl) bg-primary/6 p-3 ring-1 ring-primary/15">
              <p className="text-sm text-pretty">{t("grow.goldHint", { n: r.goldFeaturedDays })}</p>
              <div>
                <GoldFeaturedButton days={r.goldFeaturedDays} />
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

export default function PromotePage() {
  return (
    <Private rows={3}>
      <Promote />
    </Private>
  );
}
