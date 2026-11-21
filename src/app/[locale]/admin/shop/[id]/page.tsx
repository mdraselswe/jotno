import { notFound } from "next/navigation";
import { Private, PrivateHeading } from "@/components/layout/private-page";
import { adminProductPath } from "@/config/routes";
import { requireRole } from "@/features/auth/server";
import { EMPTY_PRODUCT, ProductForm } from "@/features/shop";
import { adminProduct } from "@/features/shop/server";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { title: "Admin · Product", robots: { index: false } };

const takaText = (poisha: number | null) => (poisha == null ? "" : String(poisha / 100));

async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  await requireRole(["admin"], locale, localeHref(locale, adminProductPath(id)));
  if (id === "new") {
    return (
      <div className="grid max-w-3xl gap-6">
        <PrivateHeading title={t("shop.newProduct")} />
        <ProductForm id={null} initial={EMPTY_PRODUCT} />
      </div>
    );
  }
  const p = await adminProduct(id);
  if (!p) notFound();
  return (
    <div className="grid max-w-3xl gap-6">
      <PrivateHeading title={p.nameEn} />
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
          imagePath: p.imagePath,
          active: p.active,
        }}
      />
    </div>
  );
}

export default function AdminProductPage({ params }: PageProps<"/[locale]/admin/shop/[id]">) {
  return (
    <Private rows={6}>
      <Product params={params} />
    </Private>
  );
}
