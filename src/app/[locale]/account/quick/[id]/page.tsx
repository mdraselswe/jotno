import { CircleCheck, Clock, MessageCircle, RotateCcw, Siren, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { chatPath, quickRequestPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { AutoRefresh } from "@/features/payments";
import { minutesLeft, QuickRefundButton } from "@/features/quick";
import { ownQuickRequest } from "@/features/quick/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { robots: { index: false } };

/** Read once per request (outside the component body, see lib/time.ts). */
const requestNow = () => new Date();

async function Request({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, quickRequestPath(id)));
  const r = await ownQuickRequest(id, viewer.id);
  if (!r) notFound();
  const left = minutesLeft(r, requestNow(), business.quick.answerMinutes);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <PrivateHeading title={t("quick.requestTitle")} sub={r.summary.slice(0, 140)} icon={Siren} />

      {r.status === "open" ? (
        <SectionCard bodyClassName="grid gap-3">
          <AutoRefresh seconds={15} />
          <EmptyState
            icon={Clock}
            title={t("quick.waitingTitle")}
            body={t("quick.waitingBody", { n: left ?? 0 })}
            className="border-0 bg-transparent py-6"
          />
        </SectionCard>
      ) : null}

      {r.status === "pending_payment" ? (
        <SectionCard bodyClassName="grid gap-3">
          <EmptyState
            icon={Wallet}
            title={t("quick.unpaidTitle")}
            body={t("quick.unpaidBody")}
            className="border-0 bg-transparent py-6"
          />
        </SectionCard>
      ) : null}

      {r.status === "claimed" && r.consultId ? (
        <SectionCard bodyClassName="grid gap-3">
          <EmptyState
            icon={CircleCheck}
            title={t("quick.answeredTitle")}
            body={t("quick.answeredBody")}
            action={
              <ButtonLink href={localeHref(locale, chatPath(r.consultId))} variant="brand">
                <MessageCircle aria-hidden="true" />
                {t("quick.openChat")}
              </ButtonLink>
            }
            className="border-0 bg-transparent py-6"
          />
        </SectionCard>
      ) : null}

      {r.status === "credited" ? (
        <SectionCard bodyClassName="grid gap-3">
          <div className="grid gap-4 text-center">
            <EmptyState
              icon={RotateCcw}
              title={t("quick.creditTitle")}
              body={t("quick.creditBody", { fee: taka(fmt, r.fee - r.pointsUsed * 100) })}
              className="border-0 bg-transparent py-2"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href={localeHref(locale, ROUTES.quick)} variant="brand">
                <RotateCcw aria-hidden="true" />
                {t("quick.useCredit")}
              </ButtonLink>
              <QuickRefundButton requestId={r.id} />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {r.status === "refunded" || r.status === "used" || r.status === "cancelled" ? (
        <SectionCard bodyClassName="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge tone="neutral">{t(`quick.status.${r.status}` as const)}</StatusBadge>
            <ButtonLink href={localeHref(locale, ROUTES.quick)} variant="outline" size="sm">
              {t("quick.askAgain")}
            </ButtonLink>
          </div>
          {r.status === "refunded" ? (
            <p className="text-sm text-pretty text-muted-foreground">{t("quick.refundAsked")}</p>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}

export default function QuickRequestPage({ params }: PageProps<"/[locale]/account/quick/[id]">) {
  return (
    <Private rows={2}>
      <Request params={params} />
    </Private>
  );
}
