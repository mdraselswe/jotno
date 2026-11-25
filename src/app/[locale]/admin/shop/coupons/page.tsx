import { ChevronDown, TicketPercent, TicketPlus } from "lucide-react";
import { EmptyState, SectionCard, StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { CouponForm, EMPTY_COUPON, type CouponFormValues } from "@/features/shop";
import { listCoupons } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("shopAdmin.coupons");
}

const dhakaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);

async function Coupons() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminCoupons));
  const coupons = await listCoupons();
  const now = new Date();
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.coupons")}
        sub={t("shopui.admin.couponsSub")}
        icon={TicketPercent}
      />
      <SectionCard title={t("shopAdmin.newCoupon")} icon={TicketPlus}>
        <CouponForm id={null} initial={EMPTY_COUPON} />
      </SectionCard>
      {coupons.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title={t("shopui.admin.noCoupons")}
          body={t("shopui.admin.noCouponsSub")}
        />
      ) : (
        <ul className="grid gap-3" aria-label={t("shopAdmin.coupons")}>
          {coupons.map((c) => {
            const initial: CouponFormValues = {
              code: c.code,
              kind: c.kind,
              // Percent is stored in basis points, flat in poisha: both ÷ 100 for the form.
              value: String(c.value / 100),
              minSubtotal: String(c.minSubtotal / 100),
              maxDiscount: c.maxDiscount == null ? "" : String(c.maxDiscount / 100),
              maxUses: c.maxUses == null ? "" : String(c.maxUses),
              endsAt: c.endsAt ? dhakaDate(c.endsAt) : "",
              active: c.active,
            };
            const expired = c.endsAt !== null && c.endsAt < now;
            const usedUp = c.maxUses !== null && c.used >= c.maxUses;
            const state: { tone: BadgeTone; label: string } = !c.active
              ? { tone: "neutral", label: t("shopui.admin.off") }
              : expired
                ? { tone: "danger", label: t("shopui.admin.expired") }
                : usedUp
                  ? { tone: "warning", label: t("shopui.admin.usedUp") }
                  : { tone: "success", label: t("shopAdmin.active") };
            return (
              <li key={c.id}>
                <details className="group overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                    <span className="rounded-(--radius-md) border border-dashed border-primary/40 bg-primary/6 px-3 py-1 font-mono text-sm font-bold text-primary">
                      {c.code}
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5 text-sm">
                      <span className="font-semibold">
                        {c.kind === "percent"
                          ? t("shopui.admin.percentOff", { n: fmt.number(c.value / 100) })
                          : t("shopui.admin.flatOff", { amount: taka(fmt, c.value) })}
                        {c.kind === "percent" && c.maxDiscount
                          ? ` · ${t("shopui.admin.upTo", { amount: taka(fmt, c.maxDiscount) })}`
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          c.minSubtotal > 0
                            ? t("shopui.admin.minOrder", { amount: taka(fmt, c.minSubtotal) })
                            : null,
                          `${t("shopAdmin.used", { n: fmt.number(c.used) })}${c.maxUses ? ` / ${fmt.number(c.maxUses)}` : ""}`,
                          c.endsAt ? t("shopui.admin.endsOn", { date: fmt.date(c.endsAt) }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-transform duration-(--motion-fast) group-open:rotate-180"
                    />
                    <span className="sr-only">{t("shopui.admin.edit")}</span>
                  </summary>
                  <div className="border-t p-4 sm:p-5">
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
