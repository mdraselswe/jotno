import { FolderPlus, Tags } from "lucide-react";
import { EmptyState, SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { CategoryForm, productArt } from "@/features/shop";
import { categoriesWithCounts } from "@/features/shop/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("shopAdmin.categories");
}

async function Categories() {
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, ROUTES.adminCategories));
  const rows = await categoriesWithCounts();
  const nextSort = Math.max(0, ...rows.map((r) => r.sort)) + 10;
  return (
    <div className="grid gap-6">
      <PrivateHeading title={t("shopAdmin.categories")} sub={t("shopAdmin.categoriesSub")} icon={Tags} />
      <SectionCard
        title={t("shopAdmin.addCategory")}
        description={t("shopui.admin.addCategorySub")}
        icon={FolderPlus}
      >
        <CategoryForm row={null} nextSort={nextSort} />
      </SectionCard>
      {rows.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t("shopui.admin.noCategories")}
          body={t("shopui.admin.noCategoriesSub")}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const Icon = productArt(row.slug).icon;
            return (
              <li
                key={row.slug}
                className="grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-(--radius-lg) bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <span className="font-heading font-bold">{locale === "bn" ? row.bn : row.en}</span>
                  <StatusBadge tone={row.products > 0 ? "primary" : "neutral"}>
                    {t("shopAdmin.productCount", { n: fmt.number(row.products) })}
                  </StatusBadge>
                  {row.active ? null : <StatusBadge>{t("shop.hidden")}</StatusBadge>}
                </div>
                <CategoryForm row={row} />
              </li>
            );
          })}
        </ul>
      )}
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
