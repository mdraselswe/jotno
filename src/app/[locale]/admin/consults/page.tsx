import { FileText, Flag, MessagesSquare, Phone, SearchX, Star } from "lucide-react";
import type { Route } from "next";
import {
  DataTable,
  EmptyState,
  FilterPills,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/layout/app-ui";
import { SuspenseReveal } from "@/components/motion/suspense-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { adminConsultPath, ROUTES } from "@/config/routes";
import { AdminListSkeleton, AdminSearch, consultTone, listHref } from "@/features/admin";
import { CONSULT_FILTERS, listConsults, type ConsultFilter, type ConsultRow } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { clock } from "@/features/consults";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Consults", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Consults({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminConsults));
  const q = one(sp.q).trim().slice(0, 60);
  const show = (CONSULT_FILTERS as readonly string[]).includes(one(sp.show))
    ? (one(sp.show) as ConsultFilter)
    : "all";
  const rows = await listConsults(show, q);
  const base = localeHref(locale, ROUTES.adminConsults);
  const href = (p: { show?: ConsultFilter; q?: string }) =>
    listHref(base, { q: p.q ?? q, show: p.show ?? show }, { show: "all" }) as Route;
  const late = Math.max(5, Math.floor(business.consult.replyWindowMinutes / 2));
  const slow = (c: ConsultRow) => (c.replyMinutes === null ? c.status !== "closed" : c.replyMinutes > late);

  const columns: Column<ConsultRow>[] = [
    {
      key: "who",
      header: t("adminui.consults.who"),
      mobile: "title",
      cell: (c) => (
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate">
            {c.vet} <span className="font-normal text-muted-foreground">·</span>{" "}
            {c.owner ?? c.ownerEmail ?? "—"}
          </span>
          <span className="line-clamp-1 text-xs font-normal text-muted-foreground">{c.summary}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (c) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <StatusBadge tone={consultTone(c.status)}>{t(`consult.status.${c.status}`)}</StatusBadge>
          {c.openReports > 0 ? (
            <StatusBadge tone="danger">
              {t("monitor.complaints", { n: fmt.number(c.openReports) })}
            </StatusBadge>
          ) : null}
        </span>
      ),
    },
    {
      key: "reply",
      header: t("monitor.firstReply"),
      className: "whitespace-nowrap",
      cell: (c) =>
        slow(c) ? (
          <StatusBadge tone="warning">
            {c.replyMinutes === null
              ? t("monitor.noReply")
              : t("monitor.minutes", { n: fmt.number(c.replyMinutes) })}
          </StatusBadge>
        ) : c.replyMinutes === null ? (
          <span className="text-muted-foreground">{t("monitor.noReply")}</span>
        ) : (
          <span className="tabular-nums">{t("monitor.minutes", { n: fmt.number(c.replyMinutes) })}</span>
        ),
    },
    {
      key: "activity",
      header: t("adminui.consults.activity"),
      cell: (c) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-start">
          <span title={t("monitor.messages")} className="inline-flex items-center gap-1">
            <MessagesSquare aria-hidden="true" className="size-3.5" />
            {t("monitor.messagesValue", { o: fmt.number(c.ownerMsgs), v: fmt.number(c.vetMsgs) })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone aria-hidden="true" className="size-3.5" />
            {c.callsTalked > 0
              ? t("monitor.callsValue", { n: fmt.number(c.callsTalked), time: clock(c.callSeconds) })
              : t("monitor.noCalls")}
            {c.callsMissed > 0 ? (
              <span className="text-destructive">
                · {t("monitor.missedCalls", { n: fmt.number(c.callsMissed) })}
              </span>
            ) : null}
          </span>
          {c.hasRx ? (
            <span className="inline-flex items-center gap-1">
              <FileText aria-hidden="true" className="size-3.5" />
              {t("monitor.rx")}
            </span>
          ) : null}
          {c.rating !== null ? (
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t("monitor.rating")}</span>
              {fmt.number(c.rating)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "fee",
      header: t("monitor.fee"),
      className: "text-end tabular-nums whitespace-nowrap",
      cell: (c) => taka(fmt, c.fee),
    },
    {
      key: "when",
      header: t("monitor.opened"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (c) => fmt.dateTime(c.openedAt ?? c.createdAt),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("monitor.title")} sub={t("monitor.sub")} icon={MessagesSquare} />
      <div className="grid gap-3">
        <AdminSearch
          action={base}
          q={q}
          label={t("monitor.search")}
          placeholder={t("monitor.search")}
          submit={t("manage.search")}
          clear={t("adminui.clearSearch")}
          clearHref={href({ q: "" })}
          keep={{ show: show === "all" ? undefined : show }}
        />
        <FilterPills
          label={t("common.status")}
          items={CONSULT_FILTERS.map((f) => ({
            href: href({ show: f }),
            label: t(`monitor.filter.${f}`),
            active: f === show,
          }))}
        />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        rowHref={(c) => localeHref(locale, adminConsultPath(c.id))}
        caption={t("monitor.title")}
        empty={
          <EmptyState
            icon={q ? SearchX : show === "reported" ? Flag : MessagesSquare}
            title={q ? t("adminui.noMatch", { q }) : t(`adminui.consults.empty.${show}`)}
            body={q || show !== "all" ? t("adminui.noMatchBody") : undefined}
            action={
              q || show !== "all" ? (
                <ButtonLink href={base} variant="outline">
                  {t("adminui.showAll")}
                </ButtonLink>
              ) : undefined
            }
          />
        }
      />
      {rows.length === 100 ? <p className="text-sm text-muted-foreground">{t("adminui.first100")}</p> : null}
    </div>
  );
}

export default async function AdminConsultsPage({ searchParams }: PageProps<"/[locale]/admin/consults">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} rows={8} />}>
      <Consults searchParams={searchParams} />
    </SuspenseReveal>
  );
}
