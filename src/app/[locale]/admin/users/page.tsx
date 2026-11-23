import { Search } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminVetPath, ROUTES } from "@/config/routes";
import { FilterChips, UserControls } from "@/features/admin";
import { listUsers, type UserRoleFilter } from "@/features/admin/server";
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
  const q = one(sp.q).slice(0, 60);
  const role = (FILTERS as string[]).includes(one(sp.role)) ? (one(sp.role) as UserRoleFilter) : "all";
  const users = await listUsers(q, role);
  const base = localeHref(locale, ROUTES.adminUsers);
  const href = (r: UserRoleFilter) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (r !== "all") p.set("role", r);
    const s = p.toString();
    return s ? `${base}/?${s}` : base;
  };
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("manage.users")} sub={t("manage.usersSub")} />
      <form action={base} className="flex max-w-xl gap-2" role="search">
        <label htmlFor="user-q" className="sr-only">
          {t("manage.searchUsers")}
        </label>
        <Input id="user-q" name="q" defaultValue={q} placeholder={t("manage.searchUsers")} />
        {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" />
          {t("manage.search")}
        </Button>
      </form>
      <FilterChips
        label={t("manage.role")}
        items={FILTERS.map((r) => ({
          href: href(r),
          label: r === "all" ? t("common.all") : t(`manage.role.${r}`),
          active: r === role,
        }))}
      />
      {users.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {u.fullName ?? "—"}
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {t(`manage.role.${u.role}`)}
                  </Badge>
                  {u.blocked ? <Badge variant="destructive">{t("manage.blocked")}</Badge> : null}
                  {u.isDemo ? <span className="text-xs text-muted-foreground">(demo)</span> : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {u.email ?? "—"}
                  {u.phone ? ` · ${u.phone}` : ""} · {t("manage.joined", { date: fmt.date(u.createdAt) })}
                  {u.providerId ? (
                    <>
                      {" · "}
                      <Link href={localeHref(locale, adminVetPath(u.providerId))} className="underline">
                        {t("manage.vetProfile")} ({u.providerStatus})
                      </Link>
                    </>
                  ) : null}
                </span>
              </span>
              <UserControls userId={u.id} role={u.role} blocked={Boolean(u.blocked)} self={u.id === me.id} />
            </li>
          ))}
        </ul>
      )}
      {users.length === 100 ? <p className="text-sm text-muted-foreground">{t("manage.first100")}</p> : null}
    </div>
  );
}

export default function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  return (
    <Private rows={6}>
      <Users searchParams={searchParams} />
    </Private>
  );
}
