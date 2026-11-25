import { SearchX, Users as UsersIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import {
  AdminListSkeleton,
  AdminPager,
  AdminSearch,
  listHref,
  pageParam,
  providerTone,
  roleTone,
  UserControls,
} from "@/features/admin";
import { listUsers, USERS_PAGE, type UserRoleFilter } from "@/features/admin/server";
import { UserAvatar } from "@/features/auth";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · People", robots: { index: false } };

const FILTERS: UserRoleFilter[] = ["all", "owner", "vet", "admin"];
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Users({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  const me = await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminUsers));
  const q = one(sp.q).trim().slice(0, 60);
  const role = (FILTERS as string[]).includes(one(sp.role)) ? (one(sp.role) as UserRoleFilter) : "all";
  const page = pageParam(one(sp.page));
  const found = await listUsers(q, role, page);
  const users = found.slice(0, USERS_PAGE);
  const more = found.length > USERS_PAGE;
  const base = localeHref(locale, ROUTES.adminUsers);
  const href = (p: { role?: UserRoleFilter; page?: number; q?: string }) =>
    listHref(
      base,
      { q: p.q ?? q, role: p.role ?? role, page: p.page ?? 1 },
      { role: "all", page: 1 },
    ) as Route;

  type Row = (typeof users)[number];
  const name = (u: Row) => u.fullName ?? u.email ?? u.phone ?? "—";
  const columns: Column<Row>[] = [
    {
      key: "person",
      header: t("adminui.users.person"),
      mobile: "title",
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-3">
          <UserAvatar user={{ name: u.fullName, email: u.email, avatarUrl: null }} className="size-9" />
          <span className="grid min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 truncate font-medium">
              {u.fullName ?? "—"}
              {u.isDemo ? <span className="text-xs text-muted-foreground">{t("common.demo")}</span> : null}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {[u.email, u.phone].filter(Boolean).join(" · ") || "—"}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: t("manage.role"),
      cell: (u) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <StatusBadge tone={roleTone(u.role)}>{t(`manage.role.${u.role}`)}</StatusBadge>
          {u.blocked ? <StatusBadge tone="danger">{t("manage.blocked")}</StatusBadge> : null}
        </span>
      ),
    },
    {
      key: "vet",
      header: t("adminui.users.vetProfile"),
      cell: (u) =>
        u.providerId ? (
          <Link
            href={localeHref(locale, adminVetPath(u.providerId))}
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <StatusBadge tone={providerTone(u.providerStatus ?? "")}>
              {t(`adminui.vetStatus.${u.providerStatus ?? "draft"}`)}
            </StatusBadge>
            <span className="sr-only">{t("adminui.users.openVet", { name: name(u) })}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "joined",
      header: t("adminui.users.joined"),
      className: "whitespace-nowrap text-muted-foreground",
      cell: (u) => fmt.date(u.createdAt),
    },
    {
      key: "actions",
      header: <span className="sr-only md:not-sr-only">{t("common.actions")}</span>,
      className: "text-end",
      cell: (u) => (
        <UserControls
          userId={u.id}
          role={u.role}
          blocked={Boolean(u.blocked)}
          self={u.id === me.id}
          name={name(u)}
        />
      ),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("manage.users")} sub={t("manage.usersSub")} icon={UsersIcon} />
      <div className="grid gap-3">
        <AdminSearch
          action={base}
          q={q}
          label={t("manage.searchUsers")}
          placeholder={t("manage.searchUsers")}
          submit={t("manage.search")}
          clear={t("adminui.clearSearch")}
          clearHref={href({ q: "" })}
          keep={{ role: role === "all" ? undefined : role }}
        />
        <FilterPills
          label={t("manage.role")}
          items={FILTERS.map((r) => ({
            href: href({ role: r }),
            label: r === "all" ? t("common.all") : t(`manage.role.${r}`),
            active: r === role,
          }))}
        />
      </div>
      <DataTable
        rows={users}
        columns={columns}
        rowKey={(u) => u.id}
        caption={t("manage.users")}
        empty={
          <EmptyState
            icon={SearchX}
            title={q ? t("adminui.noMatch", { q }) : t("adminui.users.empty")}
            body={q || role !== "all" ? t("adminui.noMatchBody") : undefined}
            action={
              q || role !== "all" ? (
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

export default async function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  const t = await getT();
  return (
    <SuspenseReveal fallback={<AdminListSkeleton label={t("loading.label")} rows={8} />}>
      <Users searchParams={searchParams} />
    </SuspenseReveal>
  );
}
