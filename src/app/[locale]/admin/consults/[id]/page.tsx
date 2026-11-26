import {
  Clock,
  Eye,
  FileText,
  Flag,
  Image as ImageIcon,
  ListOrdered,
  MessageSquare,
  MessagesSquare,
  Phone,
  ShieldAlert,
  Star,
  Stethoscope,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatGrid,
  StatusBadge,
  type BadgeTone,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { adminConsultPath, adminVetPath, ROUTES } from "@/config/routes";
import {
  AdminDetailSkeleton,
  BackLink,
  consultTone,
  FactList,
  ReadConsultForm,
  RefundButton,
} from "@/features/admin";
import { consultForAdmin, consultTimeline, type TimelineItem, adminMetadata } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { clock } from "@/features/consults";
import { READ_GRANT_MINUTES } from "@/features/consults/server";
import { refundReasonKey } from "@/features/payments";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return adminMetadata("adminui.meta.consult");
}

const SYSTEM: Record<string, MessageKey> = {
  "system:opened": "consult.sysOpened",
  "system:closed": "consult.sysClosed",
  "system:refunded": "consult.sysRefunded",
  "system:refunded:admin": "consult.sysRefundedAdmin",
  "system:rx": "monitor.tl.rx",
};

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, t, fmt] = await Promise.all([params, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, adminConsultPath(id)));
  const c = await consultForAdmin(id);
  if (!c) notFound();
  const items = await consultTimeline(c.id, c.ownerId, c.vetProfileId);
  const who = (w: "owner" | "vet" | null) =>
    t(w === "owner" ? "monitor.tl.owner" : w === "vet" ? "monitor.tl.vet" : "monitor.tl.someone");
  const late = Math.max(5, Math.floor(business.consult.replyWindowMinutes / 2));
  const slow = c.replyMinutes === null ? c.status !== "closed" : c.replyMinutes > late;

  const line = (it: TimelineItem): { icon: LucideIcon | null; text: string; bad?: boolean } => {
    switch (it.kind) {
      case "message":
        return {
          icon: it.photo ? ImageIcon : MessageSquare,
          text: t(it.photo ? "monitor.tl.photo" : "monitor.tl.text", { who: who(it.who) }),
        };
      case "system": {
        const key = SYSTEM[it.body];
        return { icon: null, text: key ? t(key) : it.body };
      }
      case "call": {
        const outcome =
          it.status === "ended"
            ? t("monitor.tl.callEnded", { time: clock(it.seconds) })
            : t(
                it.status === "missed"
                  ? "monitor.tl.callMissed"
                  : it.status === "declined"
                    ? "monitor.tl.callDeclined"
                    : it.status === "failed"
                      ? "monitor.tl.callFailed"
                      : it.status === "ringing"
                        ? "monitor.tl.callRinging"
                        : "monitor.tl.callActive",
              );
        return {
          icon: it.media === "video" ? Video : Phone,
          text: `${t("monitor.tl.call", { who: who(it.who), media: t(`call.media.${it.media}`) })} · ${outcome}${it.relayed ? ` · ${t("monitor.tl.relayed")}` : ""}`,
          bad: !(it.status === "ended" || it.status === "active"),
        };
      }
      case "report":
        return {
          icon: Flag,
          text: `${t("monitor.tl.report", { by: it.by ?? "—", reason: it.reason })}${it.resolved ? ` · ${t("monitor.tl.resolved")}` : ""}`,
          bad: !it.resolved,
        };
      case "review":
        return { icon: Star, text: t("monitor.tl.review", { n: fmt.number(it.rating) }) };
      case "read":
        return { icon: Eye, text: t("monitor.tl.read", { by: it.by ?? "—", reason: it.reason }) };
      case "rx":
        return { icon: FileText, text: t("monitor.tl.rx") };
    }
  };

  const replyTone: BadgeTone = slow ? "warning" : "success";
  // Refund codes ("vet_no_reply") read as text; an admin's own words stay as they are.
  const refundText = (reason: string | null) => {
    const key = refundReasonKey(reason);
    return key ? t(key) : (reason ?? "—");
  };
  const facts = [
    { label: t("monitor.vet"), value: c.vet },
    { label: t("monitor.owner"), value: [c.owner, c.ownerEmail].filter(Boolean).join(" · ") || "—" },
    { label: t("monitor.opened"), value: c.openedAt ? fmt.dateTime(c.openedAt) : "—" },
    { label: t("adminui.consult.closed"), value: c.closedAt ? fmt.dateTime(c.closedAt) : "—" },
    {
      label: t("adminui.consult.closeReason"),
      value:
        c.closeReason === "vet" || c.closeReason === "time"
          ? t(`monitor.closeReason.${c.closeReason}`)
          : refundText(c.closeReason),
    },
    { label: t("adminui.consult.photos"), value: t("monitor.photos", { n: fmt.number(c.photos) }) },
  ];

  return (
    <div className="grid gap-6">
      <BackLink href={localeHref(locale, ROUTES.adminConsults)}>{t("monitor.title")}</BackLink>
      <PageHeader
        title={`${c.vet} · ${c.owner ?? c.ownerEmail ?? "—"}`}
        sub={c.summary}
        icon={MessagesSquare}
        eyebrow={
          <span className="inline-flex flex-wrap gap-1.5">
            <StatusBadge tone={consultTone(c.status)}>{t(`consult.status.${c.status}`)}</StatusBadge>
            {c.openReports > 0 ? (
              <StatusBadge tone="danger">
                {t("monitor.complaints", { n: fmt.number(c.openReports) })}
              </StatusBadge>
            ) : null}
          </span>
        }
        actions={
          <ButtonLink href={localeHref(locale, adminVetPath(c.vetId))} variant="outline" size="sm">
            <Stethoscope aria-hidden="true" />
            {t("adminui.consult.vetPage")}
          </ButtonLink>
        }
      />

      <StatGrid>
        <StatCard label={t("monitor.fee")} value={taka(fmt, c.fee)} icon={Wallet} />
        <StatCard
          label={t("monitor.firstReply")}
          value={
            c.replyMinutes === null
              ? t("monitor.noReply")
              : t("monitor.minutes", { n: fmt.number(c.replyMinutes) })
          }
          icon={Clock}
          tone={replyTone === "warning" ? "warning" : "default"}
        />
        <StatCard
          label={t("monitor.messages")}
          value={t("monitor.messagesValue", { o: fmt.number(c.ownerMsgs), v: fmt.number(c.vetMsgs) })}
          icon={MessageSquare}
        />
        <StatCard
          label={t("monitor.calls")}
          value={
            c.callsTalked > 0
              ? t("monitor.callsValue", { n: fmt.number(c.callsTalked), time: clock(c.callSeconds) })
              : t("monitor.noCalls")
          }
          hint={c.callsMissed > 0 ? t("monitor.missedCalls", { n: fmt.number(c.callsMissed) }) : undefined}
          icon={Phone}
        />
        <StatCard
          label={t("monitor.rating")}
          value={c.rating === null ? t("monitor.noRating") : `${fmt.number(c.rating)}/5`}
          icon={Star}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="grid min-w-0 content-start gap-6">
          <SectionCard title={t("adminui.consult.summary")} icon={FileText}>
            <FactList items={facts} />
          </SectionCard>
          <SectionCard
            title={t("monitor.timeline")}
            description={t("monitor.timelineSub")}
            icon={ListOrdered}
          >
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminui.consult.noTimeline")}</p>
            ) : (
              <ol className="grid gap-2.5 border-s ps-4">
                {items.map((it, i) => {
                  const l = line(it);
                  const Icon = l.icon;
                  return (
                    <li
                      key={`${it.kind}-${i}`}
                      className={cn(
                        "grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2.5 text-sm",
                        l.bad && "text-destructive",
                      )}
                    >
                      <span
                        className={cn("mt-0.5 grid place-items-center", !l.bad && "text-muted-foreground")}
                      >
                        {Icon ? (
                          <Icon aria-hidden="true" className="size-4" />
                        ) : (
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span className="text-pretty break-words">
                        <time
                          className="me-1.5 text-xs text-muted-foreground tabular-nums"
                          dateTime={it.at.toISOString()}
                        >
                          {fmt.date(it.at, { dateStyle: "short", timeStyle: "short" })}
                        </time>
                        {l.text}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <SectionCard title={t("monitor.read")} icon={ShieldAlert}>
            <ReadConsultForm consultId={c.id} minutes={READ_GRANT_MINUTES} />
          </SectionCard>
          {c.status === "active" ? (
            <SectionCard
              title={t("adminui.consult.refundTitle")}
              description={t("adminui.consult.refundSub")}
              icon={Wallet}
            >
              <RefundButton consultId={c.id} amount={taka(fmt, c.fee)} />
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default async function AdminConsultPage({ params }: PageProps<"/[locale]/admin/consults/[id]">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminDetailSkeleton label={t("loading.label")} />}>
      <Detail params={params} />
    </SuspenseReveal>
  );
}
