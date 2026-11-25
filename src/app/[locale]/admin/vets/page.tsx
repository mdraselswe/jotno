import { ListChecks, SearchX, Stethoscope, UserCheck } from "lucide-react";
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
import { adminVetPath, ROUTES } from "@/config/routes";
import { AdminListSkeleton, AdminSearch, listHref, providerTone } from "@/features/admin";
import { adminCounts, providersByStatus } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Vets", robots: { index: false } };

const FILTERS = ["pending", "verified", "rejected", "suspended", "draft", "all"] as const;
type Filter = (typeof FILTERS)[number];
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Vets({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminVets));
  const q = one(sp.q).trim().slice(0, 60);
  const status: Filter = (FILTERS as readonly string[]).includes(one(sp.status))
    ? (one(sp.status) as Filter)
    : "pending";
  const [rows, counts] = await Promise.all([providersByStatus(status, q), adminCounts()]);
  const base = localeHref(locale, ROUTES.adminVets);
  const href = (p: { status?: Filter; q?: string }) =>
    listHref(base, { q: p.q ?? q, status: p.status ?? status }, { status: "pending" }) as Route;

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "vet",
      header: t("admin.vet"),
      mobile: "title",
      cell: (v) => (
        <span className="grid min-w-0">
          <span className="flex flex-wrap items-center gap-x-2">
            {v.displayName}
            {v.isDemo ? (
              <span className="text-xs font-normal text-muted-foreground">{t("common.demo")}</span>
            ) : null}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">{v.email}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (v) => (
        <StatusBadge tone={providerTone(v.status)}>{t(`adminui.vetStatus.${v.status}`)}</StatusBadge>
      ),
    },
    {
      key: "bvc",
      header: t("adminui.vet.bvc"),
      className: "font-mono text-xs",
      cell: (v) => v.registrationNo ?? "—",
    },
    { key: "district", header: t("common.district"), cell: (v) => v.district ?? "—" },
    {
      key: "complete",
      header: t("adminui.vet.completeness"),
      cell: (v) => (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-muted max-md:hidden">
            <span
              className={cn(
                "block h-full origin-left rounded-full rtl:origin-right",
                v.completeness >= 80 ? "bg-success" : "bg-warning",
              )}
              style={{ transform: `scaleX(${Math.min(100, Math.max(0, v.completeness)) / 100})` }}
            />
          </span>
          <span className="tabular-nums">{fmt.number(v.completeness / 100, { style: "percent" })}</span>
        </span>
      ),
    },
    {
      key: "submitted",
      header: t("adminui.vet.submitted"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (v) => (v.submittedAt ? fmt.date(v.submittedAt) : "—"),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("adminui.vets.title")} sub={t("adminui.vets.sub")} icon={Stethoscope} />
      <div className="grid gap-3">
        <AdminSearch
          action={base}
          q={q}
          label={t("adminui.vets.search")}
          placeholder={t("adminui.vets.search")}
          submit={t("manage.search")}
          clear={t("adminui.clearSearch")}
          clearHref={href({ q: "" })}
          keep={{ status: status === "pending" ? undefined : status }}
        />
        <FilterPills
          label={t("common.status")}
          items={FILTERS.map((f) => ({
            href: href({ status: f }),
            label: f === "all" ? t("common.all") : t(`adminui.vetStatus.${f}`),
            active: f === status,
            count: f === "pending" ? counts.pending : f === "verified" ? counts.verified : undefined,
          }))}
        />
      </div>
      {status === "pending" && rows.length > 0 ? (
        <p className="flex gap-2.5 rounded-(--radius-xl) bg-info/10 px-4 py-3 text-sm text-pretty ring-1 ring-info/20">
          <ListChecks aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          {t("admin.checklist")}
        </p>
      ) : null}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(v) => v.id}
        rowHref={(v) => localeHref(locale, adminVetPath(v.id))}
        caption={t("adminui.vets.title")}
        empty={
          q ? (
            <EmptyState
              icon={SearchX}
              title={t("adminui.noMatch", { q })}
              body={t("adminui.noMatchBody")}
              action={
                <ButtonLink href={href({ q: "" })} variant="outline">
                  {t("adminui.clearSearch")}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={UserCheck}
              title={status === "pending" ? t("adminui.vets.queueEmpty") : t("adminui.vets.empty")}
              body={status === "pending" ? t("adminui.vets.queueEmptyBody") : undefined}
              action={
                status !== "all" ? (
                  <ButtonLink href={href({ status: "all" })} variant="outline">
                    {t("adminui.vets.seeAll")}
                  </ButtonLink>
                ) : undefined
              }
            />
          )
        }
      />
      {rows.length === 200 ? <p className="text-sm text-muted-foreground">{t("adminui.first200")}</p> : null}
    </div>
  );
}

export default async function AdminVetsPage({ searchParams }: PageProps<"/[locale]/admin/vets">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} rows={6} />}>
      <Vets searchParams={searchParams} />
    </SuspenseReveal>
  );
}
