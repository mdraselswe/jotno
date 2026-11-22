import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { PayoutForm, RefundButton } from "@/features/admin";
import { payoutQueue, recentPayouts, recentRefundable } from "@/features/admin/server";
import { requireRole } from "@/features/auth/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Payouts", robots: { index: false } };

async function Payouts() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminPayouts));
  const [queue, done, refundable] = await Promise.all([payoutQueue(), recentPayouts(), recentRefundable()]);
  return (
    <div className="grid gap-8">
      <PrivateHeading title={t("admin.payouts")} sub={t("admin.payoutHint")} />
      {queue.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {queue.map((v) => (
            <li
              key={v.providerId}
              className="grid gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium">{v.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[v.phone, v.email].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-sm">
                  {t("admin.available")}:{" "}
                  <strong className="tabular-nums">{taka(fmt, v.balance.available)}</strong>
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("admin.pending")}: <span className="tabular-nums">{taka(fmt, v.balance.pending)}</span>
                </span>
                {v.ready ? <Badge>{t("admin.available")}</Badge> : null}
              </div>
              {v.balance.available > 0 ? (
                <PayoutForm providerId={v.providerId} max={v.balance.available} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("admin.recentPayouts")}</h2>
        {done.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">{t("admin.when")}</th>
                  <th className="py-2 pr-4 font-medium">{t("admin.vet")}</th>
                  <th className="py-2 pr-4 font-medium">{t("common.amount")}</th>
                  <th className="py-2 pr-4 font-medium">{t("admin.method")}</th>
                  <th className="py-2 font-medium">{t("admin.reference")}</th>
                </tr>
              </thead>
              <tbody>
                {done.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">{fmt.date(p.createdAt)}</td>
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4 tabular-nums">{taka(fmt, p.amount)}</td>
                    <td className="py-2 pr-4">{p.method}</td>
                    <td className="py-2 font-mono text-xs">{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("admin.activeChats")}</h2>
        {refundable.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.empty")}</p>
        ) : (
          <ul className="grid gap-2">
            {refundable.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-(--control-radius) bg-card px-4 py-3 shadow-(--shadow-card)"
              >
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{c.summary}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.vet} · {c.openedAt ? fmt.dateTime(c.openedAt) : "—"}
                  </span>
                </span>
                <span className="tabular-nums">{taka(fmt, c.fee)}</span>
                <RefundButton consultId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Private>
      <Payouts />
    </Private>
  );
}
