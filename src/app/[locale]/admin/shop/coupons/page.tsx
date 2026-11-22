import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { CouponForm, EMPTY_COUPON, type CouponFormValues } from "@/features/shop";
import { listCoupons } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Admin · Coupons", robots: { index: false } };

const dhakaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);

async function Coupons() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminCoupons));
  const coupons = await listCoupons();
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("shopAdmin.coupons")} />
      <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <h2 className="font-heading text-lg font-semibold">{t("shopAdmin.newCoupon")}</h2>
        <CouponForm id={null} initial={EMPTY_COUPON} />
      </section>
      {coupons.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {coupons.map((c) => {
            const initial: CouponFormValues = {
              code: c.code,
              kind: c.kind,
              value: c.kind === "percent" ? String(c.value / 100) : String(c.value / 100),
              minSubtotal: String(c.minSubtotal / 100),
              maxDiscount: c.maxDiscount == null ? "" : String(c.maxDiscount / 100),
              maxUses: c.maxUses == null ? "" : String(c.maxUses),
              endsAt: c.endsAt ? dhakaDate(c.endsAt) : "",
              active: c.active,
            };
            return (
              <li key={c.id}>
                <details className="group rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                    <span className="rounded-full bg-highlight/30 px-3 py-1 font-mono font-semibold">
                      {c.code}
                    </span>
                    <span className="text-sm">
                      {c.kind === "percent" ? `${c.value / 100}%` : taka(fmt, c.value)}
                      {c.minSubtotal > 0 ? ` · ≥ ${taka(fmt, c.minSubtotal)}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("shopAdmin.used", { n: c.used })}
                      {c.maxUses ? ` / ${c.maxUses}` : ""}
                      {c.endsAt ? ` · ${fmt.date(c.endsAt)}` : ""}
                    </span>
                    <Badge variant={c.active ? "default" : "secondary"} className="ml-auto">
                      {c.active ? t("shopAdmin.active") : t("shop.hidden")}
                    </Badge>
                  </summary>
                  <div className="mt-4 border-t border-border pt-4">
                    <CouponForm id={c.id} initial={initial} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Private rows={4}>
      <Coupons />
    </Private>
  );
}
