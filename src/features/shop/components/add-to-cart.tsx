"use client";

import { Check, Minus, Plus, ShoppingBag, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { useMounted } from "@/hooks/use-mounted";
import { plural } from "@/i18n";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { MAX_QTY, maxAddable } from "../cart";
import { useCart } from "./cart-store";

/** − n + buttons. `max` is the highest allowed value. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  label,
  size = "default",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  /** What is being counted, for screen readers ("Quantity: Cat food"). */
  label: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useT();
  const fmt = useFormatter();
  const btn = size === "sm" ? "icon-sm" : "icon";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-(--control-radius) bg-card shadow-(--shadow-control) inset-ring inset-ring-foreground/15",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={btn}
        aria-label={t("shop.less")}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-8 text-center font-semibold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {fmt.number(value)}
      </output>
      <Button
        type="button"
        variant="ghost"
        size={btn}
        aria-label={t("shop.more")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}

function useCartToast() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  return () =>
    toast.success(t("shop.added"), {
      action: { label: t("shopui.viewCart"), onClick: () => router.push(localeHref(locale, ROUTES.cart)) },
    });
}

/**
 * Quick add for product cards: "Add", then a − n + stepper that edits the
 * cart line in place (− at one takes it out). Never more than the stock.
 */
export function AddToCartButton({
  productId,
  name,
  stock,
  className,
}: {
  productId: string;
  name: string;
  stock: number;
  className?: string;
}) {
  const t = useT();
  const cart = useCart();
  const added = useCartToast();
  const inCart = cart.lines.find((l) => l.productId === productId)?.qty ?? 0;
  const max = Math.min(Math.max(stock, 0), MAX_QTY);

  if (stock <= 0)
    return (
      <Button size="sm" variant="secondary" disabled className={cn("w-full", className)}>
        {t("shop.outOfStock")}
      </Button>
    );

  if (inCart > 0)
    return (
      <QtyStepper
        size="sm"
        label={t("shopui.qtyOf", { name })}
        value={inCart}
        min={0}
        max={max}
        className={cn("w-full justify-between", className)}
        onChange={(n) => (n <= 0 ? cart.remove(productId) : cart.setQty(productId, n))}
      />
    );

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "w-full transition-transform duration-(--motion-base) ease-spring active:scale-95",
        className,
      )}
      aria-label={t("shopui.addNamed", { name })}
      onClick={() => {
        cart.add(productId, 1);
        added();
      }}
    >
      <ShoppingBag aria-hidden="true" />
      {t("shopui.addShort")}
    </Button>
  );
}

/**
 * The product page's buy box: quantity, add to cart and buy now. On phones
 * the same controls follow the reader in a bar above the tab bar once the
 * main buttons scroll out of view.
 */
export function ProductBuyBox({
  productId,
  name,
  stock,
  price,
}: {
  productId: string;
  name: string;
  stock: number;
  /** The price, already formatted, for the phone bar. */
  price: string;
}) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const mounted = useMounted();
  const cart = useCart();
  const added = useCartToast();
  const inCart = cart.lines.find((l) => l.productId === productId)?.qty ?? 0;
  const room = maxAddable(stock, inCart);
  const [qty, setQty] = useState(1);
  const amount = Math.max(1, Math.min(qty, room));
  const anchor = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) =>
      setShowBar(Boolean(e && !e.isIntersecting && e.boundingClientRect.top < 0)),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = () => {
    if (room <= 0) return;
    cart.add(productId, amount);
    setQty(1);
    added();
  };
  const buyNow = () => {
    if (room > 0) cart.add(productId, amount);
    router.push(localeHref(locale, ROUTES.cart));
  };

  if (stock <= 0)
    return (
      <div className="grid gap-2">
        <Button size="lg" variant="secondary" disabled className="w-full sm:w-auto">
          {t("shop.outOfStock")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("shopui.outOfStockHint")}</p>
      </div>
    );

  const full = mounted && room <= 0;
  const buttons = (compact: boolean) => (
    <>
      <Button
        size={compact ? "default" : "lg"}
        variant="outline"
        disabled={full}
        onClick={add}
        className={cn(
          "transition-transform duration-(--motion-base) ease-spring active:scale-95",
          compact ? "max-[380px]:px-3" : "flex-1",
        )}
        aria-label={compact ? t("shop.add") : undefined}
      >
        <ShoppingBag aria-hidden="true" />
        <span className={cn(compact && "max-[380px]:sr-only")}>{t("shop.add")}</span>
      </Button>
      <Button
        size={compact ? "default" : "lg"}
        variant="brand"
        onClick={buyNow}
        className={cn(!compact && "flex-1")}
      >
        <Zap aria-hidden="true" />
        {t("shopui.buyNow")}
      </Button>
    </>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{t("shopui.quantity")}</span>
        <QtyStepper
          label={t("shopui.qtyOf", { name })}
          value={amount}
          max={Math.max(1, room)}
          onChange={setQty}
        />
      </div>
      <div ref={anchor} className="flex flex-wrap gap-2">
        {buttons(false)}
      </div>
      {mounted && inCart > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check aria-hidden="true" className="size-4 text-success" />
          {full
            ? t("shopui.inCartMax", { n: fmt.number(inCart) })
            : t("shopui.inCart", { n: fmt.number(inCart) })}
          <Link
            href={localeHref(locale, ROUTES.cart)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("shopui.viewCart")}
          </Link>
        </p>
      ) : null}

      {/* Phones: the buy bar that follows the reader. */}
      <div
        inert={!showBar}
        aria-hidden={!showBar}
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-2.5 shadow-(--shadow-overlay) backdrop-blur transition-[translate,opacity] duration-(--motion-base) ease-(--ease-ui) md:hidden print:hidden",
          showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="grid min-w-0 flex-1">
            <span className="truncate text-xs text-muted-foreground">{name}</span>
            <span className="font-heading text-lg leading-tight font-bold tabular-nums">{price}</span>
          </div>
          {buttons(true)}
        </div>
      </div>
    </div>
  );
}

/**
 * Cart icon button with the number of items in it. The count reads the
 * browser's cart, so it shows only after hydration (the server never knows it).
 */
export function CartLink({ className }: { className?: string }) {
  const t = useT();
  const fmt = useFormatter();
  const locale = useLocale();
  const mounted = useMounted();
  const { count } = useCart();
  const n = mounted ? count : 0;
  return (
    <Link
      href={localeHref(locale, ROUTES.cart)}
      aria-label={
        n > 0
          ? t(plural(locale, n, "shopui.cartWithCountOne", "shopui.cartWithCount"), { n: fmt.number(n) })
          : t("shop.cart")
      }
      className={cn(
        "relative inline-grid size-(--control-h) shrink-0 place-items-center rounded-full text-foreground transition-colors duration-(--motion-fast) hover:bg-foreground/7 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <ShoppingCart aria-hidden="true" className="size-5" />
      {n > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-primary px-1 text-[0.6875rem] leading-none font-bold text-primary-foreground tabular-nums ring-2 ring-background"
        >
          {n > 99 ? `${fmt.number(99)}+` : fmt.number(n)}
        </span>
      ) : null}
    </Link>
  );
}
