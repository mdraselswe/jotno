import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { CartView } from "@/features/shop";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export const metadata = { robots: { index: false } };

async function Cart() {
  const locale = await getLocale();
  const viewer = await getViewer();
  const here = localeHref(locale, ROUTES.cart);
  return (
    <CartView
      rule={{
        inside: business.shop.deliveryInside,
        outside: business.shop.deliveryOutside,
        freeFrom: business.shop.freeDeliveryFrom,
        homeDistrictId: business.shop.homeDistrictId,
      }}
      buyer={
        viewer
          ? { name: viewer.fullName ?? "", phone: viewer.phone ?? "", districtId: viewer.homeDistrictId }
          : null
      }
      signInHref={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}`}
    />
  );
}

export default async function CartPage() {
  const t = await getT();
  return (
    <div className="container-page grid gap-6 py-8 md:py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("shop.cart")}</h1>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Cart />
      </Suspense>
    </div>
  );
}
