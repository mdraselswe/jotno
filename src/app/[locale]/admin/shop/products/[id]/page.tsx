import { ArrowLeft, Boxes, ExternalLink, History, Package, PackagePlus } from "lucide-react";
import { notFound } from "next/navigation";
import { SectionCard, StatusBadge } from "@/components/layout/app-ui";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { adminProductPath, productPath, ROUTES } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { DeleteProductButton, EMPTY_PRODUCT, ProductForm, StockAdjust } from "@/features/shop";
import { adminProduct, shopCategories } from "@/features/shop/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { adminMetadata } from "@/features/admin/server";

export async function generateMetadata() {
  return adminMetadata("adminui.meta.product");
}

const takaText = (poisha: number | null) => (poisha == null ? "" : String(poisha / 100));

const MOVE: Record<string, MessageKey> = {
  order: "shopAdmin.move.order",
  cancel: "shopAdmin.move.cancel",
  return: "shopAdmin.move.return",
  restock: "shopAdmin.move.restock",
  adjust: "shopAdmin.move.adjust",
};

async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  await requireRole(["admin"], locale, localeHref(locale, adminProductPath(id)));
  const categories = await shopCategories(true);
  const galleryMax = business.shop.galleryMax;
  const back = (
    <ButtonLink
      href={localeHref(locale, ROUTES.adminProducts)}
      variant="ghost"
      size="sm"
      className="justify-self-start"
    >
      <ArrowLeft aria-hidden="true" />
      {t("shopAdmin.products")}
    </ButtonLink>
  );
  if (id === "new") {
    return (
      <div className="grid max-w-3xl gap-6">
        <div className="grid gap-3">
          {back}
          <PrivateHeading
            title={t("shop.newProduct")}
            sub={t("shopui.admin.newProductSub")}
            icon={PackagePlus}
          />
        </div>
        <ProductForm id={null} initial={EMPTY_PRODUCT} categories={categories} galleryMax={galleryMax} />
      </div>
    );
  }
  const p = await adminProduct(id);
  if (!p) notFound();
  const tone =
    p.stock <= 0
      ? "text-destructive"
      : p.stock <= p.lowStockAt
        ? "text-warning-foreground dark:text-warning"
        : "text-foreground";
  return (
    <div className="grid max-w-3xl gap-6">
      <div className="grid gap-3">
        {back}
        <PrivateHeading
          title={locale === "bn" ? p.nameBn : p.nameEn}
          icon={Package}
          action={
            <>
              {p.active ? (
                <ButtonLink
                  href={localeHref(locale, productPath(p.slug))}
                  variant="outline"
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink aria-hidden="true" />
                  {t("shopui.admin.viewInShop")}
                </ButtonLink>
              ) : (
                <StatusBadge>{t("shop.hidden")}</StatusBadge>
              )}
              {p.ordered ? null : <DeleteProductButton id={p.id} />}
            </>
          }
        />
      </div>

      <SectionCard title={t("shopAdmin.stock")} description={t("shopui.admin.stockSub")} icon={Boxes}>
        <div className="grid gap-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={cn("font-heading text-4xl font-bold tabular-nums", tone)}>
              {fmt.number(p.stock)}
            </span>
            <span className="text-sm text-muted-foreground">
              {p.stock <= 0
                ? t("shopAdmin.outOfStock")
                : t("shopui.admin.lowAt", { n: fmt.number(p.lowStockAt) })}
            </span>
          </div>
          <StockAdjust productId={p.id} />
          {p.movements.length > 0 ? (
            <details className="group rounded-(--radius-xl) bg-muted/40 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 font-medium">
                <History aria-hidden="true" className="size-4 text-muted-foreground" />
                {t("shopAdmin.movements")}
              </summary>
              <ul className="divide-y border-t px-3">
                {p.movements.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                    <span
                      className={cn(
                        "w-12 font-mono font-semibold tabular-nums",
                        m.delta > 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span>{t(MOVE[m.reason] ?? "shopAdmin.move.adjust")}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{m.note}</span>
                    <span className="text-xs text-muted-foreground">{fmt.dateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </SectionCard>

      {p.ordered ? <p className="text-sm text-muted-foreground">{t("shopAdmin.cantDelete")}</p> : null}

      <ProductForm
        id={p.id}
        categories={categories}
        galleryMax={galleryMax}
        initial={{
          nameEn: p.nameEn,
          nameBn: p.nameBn,
          descriptionEn: p.descriptionEn ?? "",
          descriptionBn: p.descriptionBn ?? "",
          category: p.category,
          speciesId: p.speciesId ? String(p.speciesId) : "",
          price: takaText(p.price),
          compareAt: takaText(p.compareAt),
          stock: String(p.stock),
          lowStockAt: String(p.lowStockAt),
          sku: p.sku ?? "",
          unit: p.unit ?? "",
          imagePath: p.imagePath,
          images: p.images,
          active: p.active,
        }}
      />
    </div>
  );
}

export default function AdminProductPage({ params }: PageProps<"/[locale]/admin/shop/products/[id]">) {
  return (
    <Private rows={6}>
      <Product params={params} />
    </Private>
  );
}
