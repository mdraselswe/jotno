import { FileText, Flag, Phone, Search } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminConsultPath, ROUTES } from "@/config/routes";
import { business } from "@/config";
import { FilterChips } from "@/features/admin";
import { CONSULT_FILTERS, listConsults, type ConsultFilter } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { clock } from "@/features/consults";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Consults", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Consults({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale, t, fmt] = await Promise.all([searchParams, getLocale(), getT(), getFormatter()]);
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminConsults));
  const q = one(sp.q).slice(0, 60);
  const show = (CONSULT_FILTERS as readonly string[]).includes(one(sp.show))
    ? (one(sp.show) as ConsultFilter)
    : "all";
  const rows = await listConsults(show, q);
  const base = localeHref(locale, ROUTES.adminConsults);
  const href = (f: ConsultFilter) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (f !== "all") p.set("show", f);
    const s = p.toString();
    return s ? `${base}/?${s}` : base;
  };
  const late = Math.max(5, Math.floor(business.consult.replyWindowMinutes / 2));

  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("monitor.title")} sub={t("monitor.sub")} />
      <form action={base} className="flex max-w-xl gap-2" role="search">
        <label htmlFor="consult-q" className="sr-only">
          {t("monitor.search")}
        </label>
        <Input id="consult-q" name="q" defaultValue={q} placeholder={t("monitor.search")} />
        {show !== "all" ? <input type="hidden" name="show" value={show} /> : null}
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" />
          {t("manage.search")}
        </Button>
      </form>
      <FilterChips
        label={t("manage.status")}
        items={CONSULT_FILTERS.map((f) => ({
          href: href(f),
          label: t(`monitor.filter.${f}`),
          active: f === show,
        }))}
      />
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((c) => {
            const slow = c.replyMinutes === null ? c.status !== "closed" : c.replyMinutes > late;
            return (
              <li key={c.id}>
                <Link
                  href={localeHref(locale, adminConsultPath(c.id))}
                  className="grid gap-2 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card) hover:bg-muted/40 sm:grid-cols-[1fr_auto]"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {c.vet} · {c.owner ?? c.ownerEmail ?? "—"}
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>
                        {t(`consult.status.${c.status}`)}
                      </Badge>
                      {c.openReports > 0 ? (
                        <Badge variant="destructive">
                          <Flag aria-hidden="true" />
                          {t("monitor.complaints", { n: fmt.number(c.openReports) })}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{c.summary}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt.dateTime(c.openedAt ?? c.createdAt)} · {taka(fmt, c.fee)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:justify-end">
                    <span className={cn(slow && "rounded-sm bg-warning/25 px-1.5 font-semibold")}>
                      {t("monitor.firstReply")}:{" "}
                      {c.replyMinutes === null
                        ? t("monitor.noReply")
                        : t("monitor.minutes", { n: fmt.number(c.replyMinutes) })}
                    </span>
                    <span>
                      {t("monitor.messagesValue", { o: fmt.number(c.ownerMsgs), v: fmt.number(c.vetMsgs) })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone aria-hidden="true" className="size-3.5" />
                      {c.callsTalked > 0
                        ? t("monitor.callsValue", {
                            n: fmt.number(c.callsTalked),
                            time: clock(c.callSeconds),
                          })
                        : t("monitor.noCalls")}
                      {c.callsMissed > 0
                        ? ` · ${t("monitor.missedCalls", { n: fmt.number(c.callsMissed) })}`
                        : ""}
                    </span>
                    {c.hasRx ? (
                      <span className="flex items-center gap-1">
                        <FileText aria-hidden="true" className="size-3.5" />
                        {t("monitor.rx")}
                      </span>
                    ) : null}
                    <span>{c.rating === null ? t("monitor.noRating") : `★ ${fmt.number(c.rating)}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminConsultsPage({ searchParams }: PageProps<"/[locale]/admin/consults">) {
  return (
    <Private rows={6}>
      <Consults searchParams={searchParams} />
    </Private>
  );
}
