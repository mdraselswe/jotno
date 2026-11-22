import { Private, PrivateHeading } from "@/components/layout/private-page";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { vetLedger } from "@/features/payments/server";
import { requireVet } from "@/features/providers/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Earnings", robots: { index: false } };

async function Earnings() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const { provider } = await requireVet(locale, localeHref(locale, ROUTES.vetEarnings));
  const { balance, lines, payouts } = await vetLedger(provider.id);
  const tiles = [
    { label: t("earn.available"), value: balance.available, strong: true },
    { label: t("earn.pending"), value: balance.pending },
    { label: t("earn.paidOut"), value: payouts.reduce((n, p) => n + p.amount, 0) },
  ];
  return (
    <div className="grid gap-8">
      <PrivateHeading
        title={t("vet.earnings")}
        sub={t("earn.sub", {
          min: taka(fmt, business.payout.minimum),
          pct: fmt.number(business.consult.commissionBps / 100),
        })}
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`glow-border relative grid gap-1 rounded-(--radius-2xl) p-(--card-pad) ${tile.strong ? "bg-primary/5" : "bg-card shadow-(--shadow-card)"}`}
          >
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">{taka(fmt, tile.value)}</dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-3">
        <h2 className="font-heading text-xl font-semibold">{t("earn.lines")}</h2>
        {lines.length === 0 ? (
          <p className="text-muted-foreground">{t("earn.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">{t("common.date")}</th>
                  <th className="py-2 pr-4 font-medium">{t("earn.what")}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t("common.amount")}</th>
                  <th className="py-2 font-medium">{t("earn.availableFrom")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">{fmt.date(l.createdAt)}</td>
                    <td className="py-2 pr-4">
                      {l.kind === "payout" ? t("earn.payout") : (l.memo ?? l.kind)}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right tabular-nums ${l.amount < 0 ? "text-muted-foreground" : ""}`}
                    >
                      {taka(fmt, l.amount)}
                    </td>
                    <td className="py-2 whitespace-nowrap text-muted-foreground">
                      {l.availableAt ? fmt.dateTime(l.availableAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {payouts.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-heading text-xl font-semibold">{t("earn.payouts")}</h2>
          <ul className="grid gap-1 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap gap-x-3">
                <span>{fmt.date(p.createdAt)}</span>
                <span className="font-medium tabular-nums">{taka(fmt, p.amount)}</span>
                <span className="text-muted-foreground">
                  {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Private>
      <Earnings />
    </Private>
  );
}
