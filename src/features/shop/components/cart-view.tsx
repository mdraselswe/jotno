"use client";

import { Minus, Plus, ShoppingBag, TicketPercent, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { productPath, ROUTES } from "@/config/routes";
import { DISTRICTS } from "@/content/geo";
import { useMounted } from "@/hooks/use-mounted";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { deliveryFee, subtotal, type DeliveryRule } from "../cart";
import { checkCoupon, checkout, priceCart } from "../server/actions";
import type { ProductCard } from "../server/queries";
import { useCart } from "./cart-store";

export interface Buyer {
  name: string;
  phone: string;
  districtId: number | null;
}

/** Cart lines with live prices, totals and the delivery form. */
export function CartView({
  rule,
  buyer,
  signInHref,
}: {
  rule: DeliveryRule;
  buyer: Buyer | null;
  signInHref: string;
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const mounted = useMounted();
  const cart = useCart();
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [name, setName] = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [districtId, setDistrictId] = useState(buyer?.districtId ? String(buyer.districtId) : "");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [pending, start] = useTransition();
  const ids = cart.lines.map((l) => l.productId).join(",");

  const reprice = useEffectEvent((alive: { current: boolean }) => {
    void priceCart(locale, cart.lines).then((p) => {
      if (alive.current) setProducts(p);
    });
  });
  // Re-price only when the set of products changes, not on qty changes.
  useEffect(() => {
    if (!mounted) return;
    const alive = { current: true };
    reprice(alive);
    return () => {
      alive.current = false;
    };
  }, [mounted, ids]);

  if (!mounted || (cart.lines.length > 0 && products === null)) {
    return (
      <div role="status" className="grid gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const priced = cart.lines
    .map((l) => {
      const p = products?.find((x) => x.id === l.productId);
      return p ? { ...l, price: p.price, stock: p.stock, product: p } : null;
    })
    .filter((x) => x !== null);

  if (priced.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-(--radius-xl) border-(length:--border-w) border-dashed p-10 text-center">
        <ShoppingBag aria-hidden="true" className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t("shop.cartEmpty")}</p>
        <ButtonLink href={localeHref(locale, ROUTES.shop)}>{t("shop.browse")}</ButtonLink>
      </div>
    );
  }

  const sub = subtotal(priced);
  const delivery = deliveryFee(sub, districtId ? Number(districtId) : null, rule);
  const blocked = priced.some((l) => l.stock <= 0 || l.qty > l.stock);
  // The discount was checked for the subtotal at the time; re-check it if the cart changed.
  const discount = coupon ? Math.min(coupon.discount, sub) : 0;
  const applyCoupon = (value: string) =>
    startCheck(async () => {
      setCouponError(null);
      const r = await checkCoupon(value, sub);
      if (r.ok) setCoupon({ code: r.code, discount: r.discount });
      else {
        setCoupon(null);
        setCouponError(t(r.error));
      }
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <ul className="grid content-start gap-3">
        {priced.map((l) => (
          <li
            key={l.productId}
            className="flex gap-3 rounded-(--radius-xl) border-(length:--border-w) bg-card p-3"
          >
            {l.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URL
              <img
                src={l.product.imageUrl}
                alt=""
                className="size-20 rounded-(--control-radius) object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-20 place-items-center rounded-(--control-radius) bg-muted"
              >
                <ShoppingBag className="size-6 text-muted-foreground" />
              </span>
            )}
            <div className="grid min-w-0 flex-1 gap-2">
              <Link
                href={localeHref(locale, productPath(l.product.slug))}
                className="font-medium hover:underline"
              >
                {l.product.name}
              </Link>
              <span className="text-sm tabular-nums">{taka(fmt, l.price)}</span>
              {l.qty > l.stock ? (
                <span className="text-xs text-destructive">
                  {l.stock <= 0 ? t("shop.outOfStock") : t("shop.onlyLeft", { n: l.stock })}
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("shop.less")}
                  onClick={() => cart.setQty(l.productId, l.qty - 1)}
                  disabled={l.qty <= 1}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span className="w-8 text-center tabular-nums" aria-live="polite">
                  {l.qty}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("shop.more")}
                  onClick={() => cart.setQty(l.productId, l.qty + 1)}
                  disabled={l.qty >= l.stock}
                >
                  <Plus aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label={t("common.remove")}
                  onClick={() => cart.remove(l.productId)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="grid content-start gap-4 rounded-(--radius-xl) border-(length:--border-w) bg-card p-(--card-pad)"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await checkout(locale, {
              lines: cart.lines,
              name,
              phone,
              address,
              districtId: Number(districtId),
              note,
              coupon: coupon?.code,
            });
            if (!res.ok) setError(t(res.error));
          });
        }}
      >
        <h2 className="font-heading text-lg font-semibold">{t("shop.delivery")}</h2>
        {buyer ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="co-name">{t("common.yourName")}</Label>
              <Input
                id="co-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="co-phone">{t("common.phone")}</Label>
              <Input
                id="co-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="co-district">{t("common.district")}</Label>
              <NativeSelect
                id="co-district"
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                required
              >
                <option value="">{t("common.chooseDistrict")}</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === "bn" ? d.bn : d.en}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="co-address">{t("shop.address")}</Label>
              <Textarea
                id="co-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                minLength={10}
                required
                autoComplete="street-address"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="co-note">
                {t("shop.note")} <span className="text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Input id="co-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </div>
          </>
        ) : null}
        <div className="grid gap-1">
          <Label htmlFor="co-coupon">{t("shop.coupon")}</Label>
          {coupon ? (
            <p className="flex items-center gap-2 rounded-(--control-radius) bg-success/10 px-3 py-2 text-sm">
              <TicketPercent aria-hidden="true" className="size-4 text-success" />
              <span className="font-mono font-semibold">{coupon.code}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setCoupon(null);
                  setCode("");
                }}
              >
                <X aria-hidden="true" />
                {t("shop.remove")}
              </Button>
            </p>
          ) : (
            <div className="flex gap-2">
              <Input
                id="co-coupon"
                className="min-w-0 flex-1 font-mono uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (code.trim().length >= 3) applyCoupon(code);
                  }
                }}
                aria-describedby={couponError ? "co-coupon-error" : undefined}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={checking || code.trim().length < 3}
                onClick={() => applyCoupon(code)}
              >
                {t("shop.apply")}
              </Button>
            </div>
          )}
          {couponError ? (
            <p id="co-coupon-error" className="text-xs text-destructive">
              {couponError}
            </p>
          ) : null}
        </div>
        <dl className="grid gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{t("shop.subtotal")}</dt>
            <dd className="tabular-nums">{taka(fmt, sub)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("shop.deliveryFee")}</dt>
            <dd className="tabular-nums">
              {districtId ? (delivery === 0 ? t("shop.free") : taka(fmt, delivery)) : "—"}
            </dd>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-success">
              <dt>
                {t("shop.discount")} <span className="font-mono text-xs">({coupon?.code})</span>
              </dt>
              <dd className="tabular-nums">−{taka(fmt, discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <dt>{t("common.total")}</dt>
            <dd className="tabular-nums">{taka(fmt, sub - discount + (districtId ? delivery : 0))}</dd>
          </div>
        </dl>
        {rule.freeFrom > 0 && sub < rule.freeFrom ? (
          <p className="text-xs text-muted-foreground">
            {t("shop.freeFrom", { amount: taka(fmt, rule.freeFrom) })}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {buyer ? (
          <Button type="submit" size="lg" disabled={pending || blocked}>
            {pending ? t("pay.redirecting") : t("shop.placeOrder")}
          </Button>
        ) : (
          <ButtonLink href={signInHref as never} size="lg">
            {t("consult.signIn")}
          </ButtonLink>
        )}
        <p className="text-xs text-muted-foreground">{t("shop.secure")}</p>
      </form>
    </div>
  );
}
