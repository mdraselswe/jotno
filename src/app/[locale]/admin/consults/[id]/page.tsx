import {
  ArrowLeft,
  Eye,
  FileText,
  Flag,
  MessageSquare,
  Image as ImageIcon,
  Phone,
  Star,
  Video,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { adminVetPath, ROUTES } from "@/config/routes";
import { ReadConsultForm } from "@/features/admin";
import { consultForAdmin, consultTimeline, type TimelineItem } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { clock } from "@/features/consults";
import { READ_GRANT_MINUTES } from "@/features/consults/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Consult", robots: { index: false } };

const SYSTEM: Record<string, MessageKey> = {
  "system:opened": "consult.sysOpened",
  "system:closed": "consult.sysClosed",
  "system:refunded": "consult.sysRefunded",
  "system:rx": "monitor.tl.rx",
};

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, t, fmt] = await Promise.all([params, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminConsults));
  const c = await consultForAdmin(id);
  if (!c) notFound();
  const items = await consultTimeline(c.id, c.ownerId, c.vetProfileId);
  const who = (w: "owner" | "vet" | null) =>
    t(w === "owner" ? "monitor.tl.owner" : w === "vet" ? "monitor.tl.vet" : "monitor.tl.someone");

  const line = (it: TimelineItem): { icon: React.ReactNode; text: string; tone?: "bad" } => {
    switch (it.kind) {
      case "message":
        return {
          icon: it.photo ? <ImageIcon aria-hidden="true" /> : <MessageSquare aria-hidden="true" />,
          text: t(it.photo ? "monitor.tl.photo" : "monitor.tl.text", { who: who(it.who) }),
        };
      case "system": {
        const key = SYSTEM[it.body];
        return { icon: <span aria-hidden="true">•</span>, text: key ? t(key) : it.body };
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
          icon: it.media === "video" ? <Video aria-hidden="true" /> : <Phone aria-hidden="true" />,
          text: `${t("monitor.tl.call", { who: who(it.who), media: t(`call.media.${it.media}`) })} · ${outcome}${it.relayed ? ` · ${t("monitor.tl.relayed")}` : ""}`,
          tone: it.status === "ended" || it.status === "active" ? undefined : "bad",
        };
      }
      case "report":
        return {
          icon: <Flag aria-hidden="true" />,
          text: `${t("monitor.tl.report", { by: it.by ?? "—", reason: it.reason })}${it.resolved ? ` · ${t("monitor.tl.resolved")}` : ""}`,
          tone: it.resolved ? undefined : "bad",
        };
      case "review":
        return {
          icon: <Star aria-hidden="true" />,
          text: t("monitor.tl.review", { n: fmt.number(it.rating) }),
        };
      case "read":
        return {
          icon: <Eye aria-hidden="true" />,
          text: t("monitor.tl.read", { by: it.by ?? "—", reason: it.reason }),
        };
      case "rx":
        return { icon: <FileText aria-hidden="true" />, text: t("monitor.tl.rx") };
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: t("monitor.opened"), value: c.openedAt ? fmt.dateTime(c.openedAt) : "—" },
    { label: t("monitor.fee"), value: taka(fmt, c.fee) },
    {
      label: t("monitor.firstReply"),
      value:
        c.replyMinutes === null
          ? t("monitor.noReply")
          : t("monitor.minutes", { n: fmt.number(c.replyMinutes) }),
    },
    {
      label: t("monitor.messages"),
      value: t("monitor.messagesValue", { o: fmt.number(c.ownerMsgs), v: fmt.number(c.vetMsgs) }),
    },
    {
      label: t("monitor.calls"),
      value:
        c.callsTalked > 0
          ? t("monitor.callsValue", { n: fmt.number(c.callsTalked), time: clock(c.callSeconds) })
          : t("monitor.noCalls"),
    },
    {
      label: t("monitor.rating"),
      value: c.rating === null ? t("monitor.noRating") : `★ ${fmt.number(c.rating)}`,
    },
  ];

  return (
    <div className="grid gap-6">
      <Link
        href={localeHref(locale, ROUTES.adminConsults)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("monitor.title")}
      </Link>
      <PrivateHeading title={`${c.vet} · ${c.owner ?? c.ownerEmail ?? "—"}`} sub={c.summary} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={c.status === "active" ? "default" : "secondary"}>
          {t(`consult.status.${c.status}`)}
        </Badge>
        {c.closeReason === "vet" || c.closeReason === "time" ? (
          <span className="text-muted-foreground">{t(`monitor.closeReason.${c.closeReason}`)}</span>
        ) : null}
        <Link href={localeHref(locale, adminVetPath(c.vetId))} className="text-primary hover:underline">
          {t("monitor.vet")}: {c.vet}
        </Link>
        {c.ownerEmail ? (
          <span className="text-muted-foreground">
            {t("monitor.owner")}: {c.ownerEmail}
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {facts.map((f) => (
          <div
            key={f.label}
            className="grid gap-1 rounded-(--radius-2xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
          >
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="font-medium tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="tl-title" className="grid gap-3">
        <div>
          <h2 id="tl-title" className="font-heading text-lg font-semibold">
            {t("monitor.timeline")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("monitor.timelineSub")}</p>
        </div>
        <ol className="grid gap-1.5 border-s ps-4">
          {items.map((it, i) => {
            const l = line(it);
            return (
              <li key={`${it.kind}-${i}`} className="grid grid-cols-[auto_1fr] items-start gap-x-2 text-sm">
                <span
                  className={`mt-0.5 [&_svg]:size-4 ${l.tone === "bad" ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {l.icon}
                </span>
                <span className={l.tone === "bad" ? "text-destructive" : undefined}>
                  <span className="text-muted-foreground tabular-nums">
                    {fmt.date(it.at, { dateStyle: "short", timeStyle: "short" })}
                  </span>{" "}
                  {l.text}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <ReadConsultForm consultId={c.id} minutes={READ_GRANT_MINUTES} />
    </div>
  );
}

export default function AdminConsultPage({ params }: PageProps<"/[locale]/admin/consults/[id]">) {
  return (
    <Private rows={6}>
      <Detail params={params} />
    </Private>
  );
}
