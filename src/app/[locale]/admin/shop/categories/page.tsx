import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { CategoryForm } from "@/features/shop";
import { categoriesWithCounts } from "@/features/shop/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Categories", robots: { index: false } };

async function Categories() {
  const locale = await getLocale();
  const t = await getT();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminCategories));
  const rows = await categoriesWithCounts();
  const nextSort = Math.max(0, ...rows.map((r) => r.sort)) + 10;
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("shopAdmin.categories")} sub={t("shopAdmin.categoriesSub")} />
      <section className="grid gap-3 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <h2 className="font-heading text-lg font-semibold">{t("shopAdmin.addCategory")}</h2>
        <CategoryForm row={null} nextSort={nextSort} />
      </section>
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li
            key={row.slug}
            className="grid gap-2 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)"
          >
            <p className="text-xs text-muted-foreground">
              {t("shopAdmin.productCount", { n: row.products })}
            </p>
            <CategoryForm row={row} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Private rows={4}>
      <Categories />
    </Private>
  );
}
