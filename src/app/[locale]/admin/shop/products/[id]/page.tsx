import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { adminProductPath } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { EMPTY_PRODUCT, ProductForm, StockAdjust } from "@/features/shop";
import { adminProduct } from "@/features/shop/server";
import type { MessageKey } from "@/i18n";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Product", robots: { index: false } };

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
  if (id === "new") {
    return (
      <div className="grid max-w-3xl gap-6">
        <PrivateHeading title={t("shop.newProduct")} />
        <section className="rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
          <ProductForm id={null} initial={EMPTY_PRODUCT} />
        </section>
      </div>
    );
  }
  const p = await adminProduct(id);
  if (!p) notFound();
  return (
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading title={locale === "bn" ? p.nameBn : p.nameEn} />
      <section className="grid gap-4 rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <h2 className="flex items-baseline gap-3 font-heading text-lg font-semibold">
          {t("shopAdmin.stock")}
          <span
            className={cn(
              "font-heading text-3xl tabular-nums",
              p.stock <= 0 ? "text-destructive" : p.stock <= p.lowStockAt ? "text-warning" : "text-primary",
            )}
          >
            {p.stock}
          </span>
        </h2>
        <StockAdjust productId={p.id} />
        {p.movements.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">{t("shopAdmin.movements")}</summary>
            <ul className="mt-2 grid gap-1">
              {p.movements.map((m) => (
                <li key={m.id} className="flex flex-wrap gap-3 border-t border-border py-1.5">
                  <span
                    className={cn(
                      "w-12 font-semibold tabular-nums",
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
      </section>
      <section className="rounded-(--radius-xl) bg-card p-(--card-pad) shadow-(--shadow-card)">
        <ProductForm
          id={p.id}
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
            active: p.active,
          }}
        />
      </section>
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
