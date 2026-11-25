import { ScrollText, SearchX } from "lucide-react";
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
import { ROUTES } from "@/config/routes";
import {
  AdminListSkeleton,
  AdminPager,
  AdminSearch,
  AUDIT_GROUP_KEYS,
  AUDIT_GROUPS,
  auditTone,
  listHref,
  pageParam,
  type AuditGroup,
} from "@/features/admin";
import { AUDIT_PAGE, auditEntries } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Audit", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Audit({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminAudit));
  const q = one(sp.q).trim().slice(0, 60);
  const group: AuditGroup = (AUDIT_GROUP_KEYS as string[]).includes(one(sp.area))
    ? (one(sp.area) as AuditGroup)
    : "all";
  const page = pageParam(one(sp.page));
  const found = await auditEntries({ prefixes: AUDIT_GROUPS[group], q, page });
  const rows = found.slice(0, AUDIT_PAGE);
  const more = found.length > AUDIT_PAGE;
  const base = localeHref(locale, ROUTES.adminAudit);
  const href = (p: { area?: AuditGroup; q?: string; page?: number }) =>
    listHref(
      base,
      { q: p.q ?? q, area: p.area ?? group, page: p.page ?? 1 },
      { area: "all", page: 1 },
    ) as Route;

  type Row = (typeof rows)[number];
  const details = (r: Row) => {
    const meta = r.meta && typeof r.meta === "object" ? Object.entries(r.meta) : [];
    return meta.length > 0 ? (
      <details className="text-xs">
        <summary className="cursor-pointer text-primary">{t("adminui.audit.details")}</summary>
        <dl className="mt-1.5 grid gap-1 text-start">
          {meta.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono break-all">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
            </div>
          ))}
        </dl>
      </details>
    ) : null;
  };
  const columns: Column<Row>[] = [
    {
      key: "what",
      header: t("admin.what"),
      mobile: "title",
      cell: (r) => (
        <span className="grid min-w-0 gap-1">
          <StatusBadge tone={auditTone(r.action)} className="font-mono">
            {r.action}
          </StatusBadge>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {r.entity}
            {r.entityId ? <span className="font-mono"> · {r.entityId}</span> : null}
          </span>
        </span>
      ),
    },
    {
      key: "who",
      header: t("admin.who"),
      className: "max-w-56",
      cell: (r) => <span className="break-all">{r.actor ?? t("adminui.audit.system")}</span>,
    },
    {
      key: "when",
      header: t("admin.when"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (r) => (
        <time dateTime={r.createdAt.toISOString()} className="tabular-nums">
          {fmt.dateTime(r.createdAt)}
        </time>
      ),
    },
    { key: "details", header: t("adminui.audit.detailsCol"), className: "max-w-80", cell: details },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("admin.audit")} sub={t("adminui.audit.sub")} icon={ScrollText} />
      <div className="grid gap-3">
        <AdminSearch
          action={base}
          q={q}
          label={t("adminui.audit.search")}
          placeholder={t("adminui.audit.search")}
          submit={t("manage.search")}
          clear={t("adminui.clearSearch")}
          clearHref={href({ q: "" })}
          keep={{ area: group === "all" ? undefined : group }}
        />
        <FilterPills
          label={t("adminui.audit.area")}
          items={AUDIT_GROUP_KEYS.map((g) => ({
            href: href({ area: g }),
            label: g === "all" ? t("common.all") : t(`adminui.audit.group.${g}`),
            active: g === group,
          }))}
        />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        caption={t("admin.audit")}
        empty={
          <EmptyState
            icon={q ? SearchX : ScrollText}
            title={q ? t("adminui.noMatch", { q }) : t("adminui.audit.empty")}
            body={q || group !== "all" ? t("adminui.noMatchBody") : undefined}
            action={
              q || group !== "all" ? (
                <ButtonLink href={base} variant="outline">
                  {t("adminui.showAll")}
                </ButtonLink>
              ) : undefined
            }
          />
        }
      />
      <AdminPager
        page={page}
        prevHref={page > 1 ? href({ page: page - 1 }) : undefined}
        nextHref={more ? href({ page: page + 1 }) : undefined}
        label={t("adminui.pages")}
        prev={t("adminui.prev")}
        next={t("adminui.next")}
        pageLabel={t("common.page", { n: fmt.number(page) })}
      />
    </div>
  );
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/[locale]/admin/audit">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} rows={8} />}>
      <Audit searchParams={searchParams} />
    </SuspenseReveal>
  );
}
