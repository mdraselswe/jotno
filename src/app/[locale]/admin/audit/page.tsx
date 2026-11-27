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
  auditActionLabel,
  auditTone,
  listHref,
  pageParam,
  restorable,
  RestoreButton,
  type AuditGroup,
} from "@/features/admin";
import { adminMetadata, AUDIT_PAGE, auditEntries, restoredHides } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  return adminMetadata("admin.audit");
}

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
  // Content a report hid can be put back once, from its "report.hide" entry.
  const hides = new Map(
    rows.flatMap((r) => {
      const hidden = restorable(r.action, r.meta);
      return hidden ? [[r.id, hidden] as const] : [];
    }),
  );
  const restored = await restoredHides([...hides.keys()]);
  const base = localeHref(locale, ROUTES.adminAudit);
  const href = (p: { area?: AuditGroup; q?: string; page?: number }) =>
    listHref(
      base,
      { q: p.q ?? q, area: p.area ?? group, page: p.page ?? 1 },
      { area: "all", page: 1 },
    ) as Route;

  type Row = (typeof rows)[number];
  const undo = (r: Row) => {
    const hidden = hides.get(r.id);
    if (!hidden) return null;
    return restored.has(r.id) ? (
      <StatusBadge tone="success">{t("adminui.restore.done")}</StatusBadge>
    ) : (
      <RestoreButton auditId={r.id} entity={hidden.entity} />
    );
  };
  const details = (r: Row) => {
    // The saved copy of hidden content is for restoring, not for reading here.
    const meta =
      r.meta && typeof r.meta === "object" ? Object.entries(r.meta).filter(([k]) => k !== "copy") : [];
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
      cell: (r) => {
        const label = auditActionLabel(r.action);
        return (
          <span className="grid min-w-0 justify-items-start gap-1">
            <StatusBadge tone={auditTone(r.action)} className={label ? undefined : "font-mono"}>
              {label ? t(label) : r.action}
            </StatusBadge>
            {label ? (
              <span className="font-mono text-[0.7rem] font-normal text-muted-foreground">
                <span className="sr-only">{t("adminui.audit.code", { code: r.action })}</span>
                <span aria-hidden="true">{r.action}</span>
              </span>
            ) : null}
            <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
              {r.entity}
              {r.entityId ? <span className="font-mono"> · {r.entityId}</span> : null}
            </span>
          </span>
        );
      },
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
    {
      key: "details",
      header: t("adminui.audit.detailsCol"),
      className: "max-w-80",
      cell: (r) => {
        const d = details(r);
        const u = undo(r);
        return d || u ? (
          <span className="grid justify-items-end gap-2 md:justify-items-start">
            {u}
            {d}
          </span>
        ) : null;
      },
    },
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
        rowKey={(r) => String(r.id)}
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
