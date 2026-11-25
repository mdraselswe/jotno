import { Coins, Gift, Link2, Trophy, UserCheck, UserPlus, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { SectionCard, StatCard, StatGrid, StatusBadge } from "@/components/layout/app-ui";
import { business } from "@/config";
import { QrCode, ShareButton } from "@/features/share";
import type { Formatter, MessageKey, Translate } from "@/i18n";
import type { InviteSummary } from "../server/referrals";
import { REF_COOKIE_DAYS } from "@/lib/ref";
import { LEVELS } from "../levels";
import { LevelBadge } from "./level-badge";

const KIND: Record<string, MessageKey> = {
  signup: "grow.kind.signup",
  first_paid: "grow.kind.firstPaid",
  welcome: "grow.kind.welcome",
  spend: "grow.kind.spend",
  refund: "grow.kind.refund",
};

/**
 * The person's invite link with share buttons and a QR code, what it earned
 * (people, points, level) and the rules. Used on the owner's invite page and
 * the vet's promote page; `extra` adds role-specific perks.
 */
export function InvitePanel({
  summary,
  link,
  shareTitle,
  shareText,
  qrLabel,
  t,
  fmt,
  perks,
  extra,
}: {
  summary: InviteSummary;
  link: string;
  shareTitle: string;
  shareText: string;
  qrLabel: string;
  t: Translate;
  fmt: Formatter;
  /** One line per level: what it gives this kind of person. */
  perks: Record<(typeof LEVELS)[number], string>;
  extra?: ReactNode;
}) {
  const r = business.referral;
  const progress = summary.next ? Math.min(1, summary.paid / r.levels[summary.next.level]) : 1;
  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <SectionCard title={t("grow.yourLink")} icon={Link2} bodyClassName="grid gap-3">
          <p className="rounded-(--radius-lg) bg-muted px-3 py-2.5 font-mono text-sm break-all select-all">
            {link}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ShareButton size="default" variant="brand" url={link} title={shareTitle} text={shareText} />
            <StatusBadge tone="neutral">
              {t("grow.code")}: <span className="font-mono">{summary.code}</span>
            </StatusBadge>
          </div>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("grow.linkHint", { days: REF_COOKIE_DAYS })}
          </p>
        </SectionCard>
        <SectionCard bodyClassName="grid justify-items-center gap-3">
          <QrCode value={link} label={qrLabel} className="w-48" />
          <p className="text-center text-xs text-muted-foreground">{t("grow.qrHint")}</p>
        </SectionCard>
      </div>

      <StatGrid>
        <StatCard label={t("grow.joined")} value={fmt.number(summary.joined)} icon={UserPlus} />
        <StatCard label={t("grow.active")} value={fmt.number(summary.active)} icon={UserCheck} />
        <StatCard label={t("grow.paid")} value={fmt.number(summary.paid)} icon={Trophy} tone="primary" />
        <StatCard
          label={t("grow.points")}
          value={fmt.number(summary.points.available)}
          hint={
            summary.points.pending > 0
              ? t("grow.pointsPending", { n: fmt.number(summary.points.pending) })
              : summary.points.expiringSoon > 0
                ? t("grow.pointsSoon", { n: fmt.number(summary.points.expiringSoon) })
                : t("grow.pointsValue")
          }
          icon={Coins}
          tone="success"
        />
      </StatGrid>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionCard title={t("grow.levelTitle")} icon={Trophy} bodyClassName="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {summary.level === "none" ? (
              <StatusBadge tone="neutral">{t("grow.level.none")}</StatusBadge>
            ) : (
              <LevelBadge level={summary.level} t={t} />
            )}
            {summary.next ? (
              <span className="text-sm text-muted-foreground">
                {t("grow.nextLevel", {
                  n: fmt.number(summary.next.left),
                  level: t(`grow.level.${summary.next.level}` as const),
                })}
              </span>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-label={t("grow.levelTitle")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full origin-left rounded-full bg-primary"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <ul className="grid gap-2 text-sm">
            {LEVELS.map((level) => (
              <li key={level} className="flex items-start gap-2">
                <LevelBadge level={level} t={t} className="shrink-0" />
                <span className="pt-0.5 text-pretty">
                  {t("grow.levelNeeds", { n: fmt.number(r.levels[level]) })} {perks[level]}
                </span>
              </li>
            ))}
          </ul>
          {extra}
        </SectionCard>

        <SectionCard title={t("grow.howTitle")} icon={Gift} bodyClassName="grid gap-2">
          <ul className="grid gap-2 text-sm text-pretty">
            <li>{t("grow.how1", { n: r.signupPoints })}</li>
            <li>{t("grow.how2", { n: r.firstPaidPoints })}</li>
            <li>{t("grow.how3", { n: r.welcomePoints })}</li>
            <li>{t("grow.how4", { order: r.orderSpendBps / 100, share: r.commissionSpendBps / 100 })}</li>
            <li>{t("grow.how5", { days: r.pointsExpireDays, cap: r.signupMonthlyCap })}</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={t("grow.history")} icon={Wallet}>
        {summary.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("grow.historyEmpty")}</p>
        ) : (
          <ul className="grid divide-y">
            {summary.history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  {KIND[h.kind] ? t(KIND[h.kind] as MessageKey) : h.kind}
                  {h.status === "pending" ? (
                    <StatusBadge tone="warning" className="ms-2">
                      {t("grow.pending")}
                    </StatusBadge>
                  ) : h.status === "void" ? (
                    <StatusBadge tone="danger" className="ms-2">
                      {t("grow.void")}
                    </StatusBadge>
                  ) : null}
                </span>
                <time dateTime={h.createdAt.toISOString()} className="text-xs text-muted-foreground">
                  {fmt.date(h.createdAt)}
                </time>
                <span
                  className={
                    h.amount >= 0
                      ? "w-14 text-end font-semibold text-success tabular-nums"
                      : "w-14 text-end font-semibold tabular-nums"
                  }
                >
                  {h.amount >= 0 ? "+" : "−"}
                  {fmt.number(Math.abs(h.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
