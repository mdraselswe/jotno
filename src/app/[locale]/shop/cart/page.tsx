import { ShoppingCart } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/app-ui";
import { ButtonLink } from "@/components/ui/button-link";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { getViewer } from "@/features/auth/server";
import { pointsOf } from "@/features/referrals/server";
import { availableMethods } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import { CartSkeleton, CartView } from "@/features/shop";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("shop.cart"), robots: { index: false } };
}

async function Cart() {
  const locale = await getLocale();
  const [viewer, settings] = await Promise.all([getViewer(), getSettings()]);
  const points = viewer ? (await pointsOf(viewer.id)).available : 0;
  const here = localeHref(locale, ROUTES.cart);
  return (
    <CartView
      rule={{
        inside: settings.delivery.inside,
        outside: settings.delivery.outside,
        freeFrom: settings.delivery.freeFrom,
        homeDistrictId: business.shop.homeDistrictId,
      }}
      buyer={
        viewer
          ? {
              name: viewer.fullName ?? "",
              phone: viewer.phone ?? "",
              districtId: viewer.homeDistrictId,
              points: { balance: points, bps: business.referral.orderSpendBps },
            }
          : null
      }
      methods={availableMethods(settings, "order", 0)}
      cod={settings.cod}
      signInHref={`${localeHref(locale, ROUTES.login)}/?next=${encodeURIComponent(here)}`}
    />
  );
}

export default async function CartPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="container-page grid gap-6 py-6 md:py-10">
      <PageHeader
        title={t("shop.cart")}
        sub={t("shopui.cartSub")}
        icon={ShoppingCart}
        actions={
          <ButtonLink href={localeHref(locale, ROUTES.shop)} variant="ghost" size="sm">
            {t("shopui.keepShopping")}
          </ButtonLink>
        }
      />
      <Suspense fallback={<CartSkeleton />}>
        <Cart />
      </Suspense>
    </div>
  );
}
