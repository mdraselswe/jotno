import { Gift } from "lucide-react";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { InvitePanel } from "@/features/referrals";
import { inviteSummary, siteLink } from "@/features/referrals/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("grow.inviteTitle"), robots: { index: false } };
}

async function Invite() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, ROUTES.invite));
  const summary = await inviteSummary(viewer.id);
  const link = siteLink(localeHref(locale, ROUTES.home), summary.code);
  const m = business.referral.multiplierBps;
  const times = (bps: number) => fmt.number(bps / 10_000);

  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("grow.inviteTitle")}
        sub={t("grow.inviteSub", { n: business.referral.firstPaidPoints })}
        icon={Gift}
      />
      <InvitePanel
        summary={summary}
        link={link}
        shareTitle={t("share.app")}
        shareText={t("grow.inviteShareText", { n: business.referral.welcomePoints })}
        qrLabel={t("grow.qrLabel")}
        t={t}
        fmt={fmt}
        perks={{
          star: t("grow.ownerPerk.star", { x: times(m.star) }),
          gold: t("grow.ownerPerk.gold", { x: times(m.gold) }),
          platinum: t("grow.ownerPerk.platinum", { x: times(m.platinum) }),
        }}
      />
    </div>
  );
}

export default function InvitePage() {
  return (
    <Private rows={3}>
      <Invite />
    </Private>
  );
}
