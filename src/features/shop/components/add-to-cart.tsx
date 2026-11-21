"use client";

import { ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { useMounted } from "@/hooks/use-mounted";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { useCart } from "./cart-store";

export function AddToCartButton({
  productId,
  inStock,
  size = "default",
}: {
  productId: string;
  inStock: boolean;
  size?: "default" | "sm" | "lg";
}) {
  const t = useT();
  const { add } = useCart();
  return (
    <Button
      size={size}
      disabled={!inStock}
      onClick={() => {
        add(productId);
        toast.success(t("shop.added"));
      }}
    >
      <ShoppingBag aria-hidden="true" />
      {inStock ? t("shop.add") : t("shop.outOfStock")}
    </Button>
  );
}

/** Header-style link to the cart with a live count. */
export function CartLink() {
  const t = useT();
  const locale = useLocale();
  const mounted = useMounted();
  const { count } = useCart();
  return (
    <Link
      href={localeHref(locale, ROUTES.cart)}
      className="inline-flex h-(--control-h) items-center gap-2 rounded-(--control-radius) border-(length:--border-w) px-3 text-sm hover:bg-muted"
    >
      <ShoppingCart aria-hidden="true" className="size-4" />
      {t("shop.cart")}
      {mounted && count > 0 ? (
        <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
