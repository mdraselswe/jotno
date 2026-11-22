import { Plus } from "lucide-react";
import Link from "next/link";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { adminProductPath, ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { adminProducts } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Products", robots: { index: false } };

async function Products() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminProducts));
  const products = await adminProducts();
  return (
    <div className="grid gap-6">
      <PrivateHeading
        title={t("shopAdmin.products")}
        action={
          <ButtonLink href={localeHref(locale, adminProductPath("new"))} size="sm">
            <Plus aria-hidden="true" />
            {t("shop.newProduct")}
          </ButtonLink>
        }
      />
      {products.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <ul className="grid gap-2">
          {products.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.stock <= p.lowStockAt;
            return (
              <li key={p.id}>
                <Link
                  href={localeHref(locale, adminProductPath(p.id))}
                  className="flex flex-wrap items-center gap-3 rounded-(--radius-lg) bg-card px-4 py-3 shadow-(--shadow-card) transition-transform duration-(--motion-fast) hover:-translate-y-0.5"
                >
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{locale === "bn" ? p.nameBn : p.nameEn}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[p.sku, p.unit, p.category].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums">{taka(fmt, p.price)}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                      out ? "bg-destructive/15 text-destructive" : low ? "bg-warning/20" : "bg-muted",
                    )}
                  >
                    {out ? t("shopAdmin.outOfStock") : `${t("shopAdmin.stock")}: ${p.stock}`}
                  </span>
                  {!p.active ? <Badge variant="secondary">{t("shop.hidden")}</Badge> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Private rows={6}>
      <Products />
    </Private>
  );
}
