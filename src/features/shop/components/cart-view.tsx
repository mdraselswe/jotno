"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  ShoppingBag,
  TicketPercent,
  Trash2,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState, SectionCard } from "@/components/layout/app-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { productPath, ROUTES } from "@/config/routes";
import { DISTRICTS } from "@/content/geo";
import { WalletMark } from "@/features/payments";
import { codAllowed, type PayMethod, type Settings } from "@/features/settings";
import { useMounted } from "@/hooks/use-mounted";
import { useFormatter, useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { couponDiscount, deliveryFee, MAX_QTY, subtotal, type CouponRule, type DeliveryRule } from "../cart";
import { checkCoupon, checkout, priceCart } from "../server/actions";
import type { ProductCard } from "../server/queries";
import { QtyStepper } from "./add-to-cart";
import { useCart } from "./cart-store";
import { CheckoutSteps } from "./order-parts";
import { ProductThumb } from "./product-tile";

export interface Buyer {
  name: string;
  phone: string;
  districtId: number | null;
  /** Jotno points they have, and the share of the goods points may pay (basis points). */
  points?: { balance: number; bps: number };
}

const FORM_ID = "checkout-form";
// The same rules the server checks (shop/server/actions.ts → checkoutSchema).
const PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
type Field = "name" | "phone" | "district" | "address";

function FieldError({ id, msg }: { id: string; msg: string | null }) {
  return msg ? (
    <p id={id} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
      <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
      {msg}
    </p>
  ) : null;
}

/** Cart lines with live prices, the delivery form and the order summary. */
export function CartView({
  rule,
  buyer,
  signInHref,
  methods,
  cod,
}: {
  rule: DeliveryRule;
  buyer: Buyer | null;
  signInHref: string;
  /** Ways to pay on the next step (for the preview card). */
  methods: PayMethod[];
  /** Cash on delivery switch and limit; the pay page drops COD above it. */
  cod: Settings["cod"];
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormatter();
  const mounted = useMounted();
  const cart = useCart();
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [removed, setRemoved] = useState(0);
  const [name, setName] = useState(buyer?.name ?? "");
  const [phone, setPhone] = useState(buyer?.phone ?? "");
  const [districtId, setDistrictId] = useState(buyer?.districtId ? String(buyer.districtId) : "");
  const [address, setAddress] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; rule: CouponRule } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();
  const [pending, start] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const districtRef = useRef<HTMLSelectElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const ids = cart.lines.map((l) => l.productId).join(",");

  const fetchPrices = (alive: { current: boolean }) => {
    const asked = cart.lines;
    void priceCart(locale, asked).then((p) => {
      if (!alive.current) return;
      setProducts(p);
      // Products that are gone (hidden or deleted) can't be ordered: take them out, say so.
      const gone = asked.filter((l) => !p.some((x) => x.id === l.productId));
      if (gone.length > 0) {
        for (const l of gone) cart.remove(l.productId);
        setRemoved((n) => n + gone.length);
      }
    });
  };
  const reprice = useEffectEvent(fetchPrices);
  // Re-price only when the set of products changes, not on qty changes.
  useEffect(() => {
    if (!mounted || leaving) return;
    const alive = { current: true };
    reprice(alive);
    return () => {
      alive.current = false;
    };
  }, [mounted, ids, leaving]);

  if (leaving)
    return (
      <div
        role="status"
        className="grid justify-items-center gap-3 rounded-(--radius-2xl) bg-card px-6 py-14 text-center shadow-(--shadow-card) ring-1 ring-foreground/6"
      >
        <Loader2 aria-hidden="true" className="size-8 animate-spin text-primary" />
        <p className="font-heading text-lg font-semibold">{t("shopui.toPayment")}</p>
        <p className="text-sm text-muted-foreground">{t("shopui.toPaymentSub")}</p>
      </div>
    );

  if (!mounted || (cart.lines.length > 0 && products === null)) return <CartSkeleton />;

  const priced = cart.lines
    .map((l) => {
      const p = products?.find((x) => x.id === l.productId);
      return p ? { ...l, price: p.price, stock: p.stock, product: p } : null;
    })
    .filter((x) => x !== null);

  if (priced.length === 0)
    return (
      <div className="grid gap-4">
        {removed > 0 ? <RemovedNote n={removed} /> : null}
        <EmptyState
          icon={ShoppingBag}
          title={t("shop.cartEmpty")}
          body={t("shopui.cartEmptySub")}
          action={
            <ButtonLink href={localeHref(locale, ROUTES.shop)} variant="brand">
              {t("shop.browse")}
              <ArrowRight aria-hidden="true" />
            </ButtonLink>
          }
        />
      </div>
    );

  const items = priced.reduce((n, l) => n + l.qty, 0);
  const sub = subtotal(priced);
  // Worked out again on every change, with the same function the server uses.
  const discount = coupon ? couponDiscount(sub, coupon.rule) : 0;
  const couponShort = coupon !== null && discount === 0;
  // The server charges delivery on the subtotal after the discount.
  const delivery = deliveryFee(sub - discount, districtId ? Number(districtId) : null, rule);
  // Points: whole taka, at most a small share of the goods (the server checks the same).
  const pointsCap = buyer?.points
    ? Math.max(
        0,
        Math.min(Math.floor(((sub - discount) * buyer.points.bps) / 10_000 / 100), buyer.points.balance),
      )
    : 0;
  const pointsOff = usePoints ? pointsCap * 100 : 0;
  const total = sub - discount - pointsOff + (districtId ? delivery : 0);
  const blocked = priced.some((l) => l.stock <= 0 || l.qty > l.stock);
  // Same rule as the pay page; before a district is picked the total leaves out delivery.
  const codOver = methods.includes("cod") && !codAllowed(cod, total);
  const payMethods = codOver ? methods.filter((m) => m !== "cod") : methods;
  const toFree = rule.freeFrom > 0 ? rule.freeFrom - (sub - discount) : 0;

  const problems: Record<Field, string | null> = {
    name: name.trim().length < 2 ? t("shopui.err.name") : null,
    phone: PHONE.test(phone.trim()) ? null : t("shopui.err.phone"),
    district: districtId ? null : t("shopui.err.district"),
    address: address.trim().length < 10 ? t("shopui.err.address") : null,
  };
  const show = (f: Field) => (touched[f] ? problems[f] : null);
  const touch = (f: Field) => setTouched((x) => ({ ...x, [f]: true }));

  const applyCoupon = (value: string) =>
    startCheck(async () => {
      setCouponError(null);
      const r = await checkCoupon(value, sub);
      if (r.ok) {
        setCoupon({ code: r.code, rule: r.rule });
        toast.success(t("shopui.couponApplied", { code: r.code }));
      } else {
        setCoupon(null);
        setCouponError(t(r.error));
      }
    });

  const placeOrder = () => {
    if (pending || blocked) return;
    setError(null);
    const bad = (Object.keys(problems) as Field[]).filter((f) => problems[f]);
    if (bad.length > 0) {
      setTouched({ name: true, phone: true, district: true, address: true });
      const first = bad[0];
      const field = { name: nameRef, phone: phoneRef, district: districtRef, address: addressRef };
      if (first) field[first].current?.focus();
      return;
    }
    start(async () => {
      const res = await checkout(locale, {
        lines: priced.map((l) => ({ productId: l.productId, qty: l.qty })),
        name,
        phone,
        address,
        districtId: Number(districtId),
        note,
        // A code that takes nothing off is left out, so it isn't used up for nothing.
        coupon: coupon && discount > 0 ? coupon.code : undefined,
        usePoints: pointsOff > 0,
      });
      if (!res.ok) {
        setError(t(res.error));
        if (res.error === "shop.stockChanged") {
          fetchPrices({ current: true });
        }
        return;
      }
      // The order holds the items now: empty the cart before leaving.
      setLeaving(true);
      cart.clear();
      window.location.assign(res.url);
    });
  };

  const mainButton = (className?: string) =>
    buyer ? (
      <Button
        type="submit"
        form={FORM_ID}
        variant="brand"
        size="lg"
        disabled={pending || blocked}
        aria-describedby={blocked ? "cart-blocked" : undefined}
        className={className}
      >
        {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Lock aria-hidden="true" />}
        {pending ? t("shopui.placing") : t("shopui.continueToPay")}
      </Button>
    ) : (
      <ButtonLink href={signInHref as never} variant="brand" size="lg" className={className}>
        <LogIn aria-hidden="true" />
        {t("shopui.signInToOrder")}
      </ButtonLink>
    );

  return (
    <div className="grid gap-6">
      <CheckoutSteps current={0} t={t} />
      {removed > 0 ? <RemovedNote n={removed} /> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        {/* 1. The items */}
        <SectionCard
          title={t("shopui.yourCart")}
          description={t("shopui.itemsCount", { n: fmt.number(items) })}
          icon={ShoppingBag}
          bodyClassName="p-0 sm:p-0"
          className="lg:col-start-1 lg:row-start-1"
        >
          <ul className="divide-y">
            {priced.map((l) => {
              const over = l.qty > l.stock;
              const href = localeHref(locale, productPath(l.product.slug));
              return (
                <li key={l.productId} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                  <Link href={href} tabIndex={-1} className="shrink-0">
                    <ProductThumb
                      imageUrl={l.product.imageUrl}
                      category={l.product.category}
                      className="size-18 rounded-(--radius-lg) sm:size-22"
                    />
                  </Link>
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid min-w-0 gap-0.5">
                        <Link
                          href={href}
                          className="line-clamp-2 text-sm font-semibold hover:underline sm:text-base"
                        >
                          {l.product.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {[l.product.unit, t("shopui.each", { price: taka(fmt, l.price) })]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-me-1.5 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={t("shopui.removeNamed", { name: l.product.name })}
                        onClick={() => {
                          cart.remove(l.productId);
                          toast(t("shopui.removedOne", { name: l.product.name }), {
                            action: { label: t("shopui.undo"), onClick: () => cart.add(l.productId, l.qty) },
                          });
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    {over ? (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-(--radius-md) bg-destructive/8 px-2.5 py-1.5 text-xs font-medium text-destructive">
                        <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
                        {l.stock <= 0 ? t("shop.outOfStock") : t("shop.onlyLeft", { n: fmt.number(l.stock) })}
                        {l.stock > 0 ? (
                          <button
                            type="button"
                            className="font-semibold underline underline-offset-2"
                            onClick={() => cart.setQty(l.productId, l.stock)}
                          >
                            {t("shopui.setQty", { n: fmt.number(l.stock) })}
                          </button>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <QtyStepper
                        size="sm"
                        label={t("shopui.qtyOf", { name: l.product.name })}
                        value={l.qty}
                        max={Math.max(1, Math.min(l.stock, MAX_QTY))}
                        onChange={(n) => cart.setQty(l.productId, n)}
                      />
                      <span className="font-heading text-base font-bold tabular-nums">
                        {taka(fmt, l.price * l.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* 2. Delivery details (signed in) or a sign-in prompt */}
        {buyer ? (
          <form
            id={FORM_ID}
            noValidate
            className="grid gap-6 lg:col-start-1 lg:row-start-2"
            onSubmit={(e) => {
              e.preventDefault();
              placeOrder();
            }}
          >
            <SectionCard title={t("shopui.contact")} description={t("shopui.contactSub")} icon={UserRound}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="co-name">{t("common.yourName")}</Label>
                  <Input
                    ref={nameRef}
                    id="co-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => touch("name")}
                    maxLength={80}
                    autoComplete="name"
                    aria-invalid={show("name") ? true : undefined}
                    aria-describedby={show("name") ? "co-name-err" : undefined}
                  />
                  <FieldError id="co-name-err" msg={show("name")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="co-phone">{t("common.phone")}</Label>
                  <Input
                    ref={phoneRef}
                    id="co-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, "").slice(0, 14))}
                    onBlur={() => touch("phone")}
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    aria-invalid={show("phone") ? true : undefined}
                    aria-describedby={show("phone") ? "co-phone-err" : "co-phone-hint"}
                  />
                  {show("phone") ? (
                    <FieldError id="co-phone-err" msg={show("phone")} />
                  ) : (
                    <p id="co-phone-hint" className="text-xs text-muted-foreground">
                      {t("shopui.phoneHint")}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t("shopui.address")} description={t("shopui.addressSub")} icon={MapPin}>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="co-district">{t("common.district")}</Label>
                  <NativeSelect
                    ref={districtRef}
                    id="co-district"
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                      touch("district");
                    }}
                    onBlur={() => touch("district")}
                    aria-invalid={show("district") ? true : undefined}
                    aria-describedby={show("district") ? "co-district-err" : undefined}
                  >
                    <option value="">{t("common.chooseDistrict")}</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {locale === "bn" ? d.bn : d.en}
                      </option>
                    ))}
                  </NativeSelect>
                  <FieldError id="co-district-err" msg={show("district")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="co-address">{t("shop.address")}</Label>
                  <Textarea
                    ref={addressRef}
                    id="co-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={() => touch("address")}
                    rows={3}
                    maxLength={300}
                    autoComplete="street-address"
                    placeholder={t("shopui.addressHint")}
                    aria-invalid={show("address") ? true : undefined}
                    aria-describedby={show("address") ? "co-address-err" : undefined}
                  />
                  <FieldError id="co-address-err" msg={show("address")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="co-note">
                    {t("shop.note")} <span className="text-muted-foreground">({t("common.optional")})</span>
                  </Label>
                  <Input
                    id="co-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={300}
                    placeholder={t("shopui.noteHint")}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t("shopui.payment")} description={t("shopui.paymentSub")} icon={Wallet}>
              {payMethods.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {payMethods.map((m) => (
                    <li key={m}>
                      <WalletMark method={m} label={t(`pay.method.${m}`)} className="h-8 px-3 text-sm" />
                    </li>
                  ))}
                </ul>
              ) : codOver ? null : (
                <p className="text-sm text-muted-foreground">{t("pay.noMethods")}</p>
              )}
              {codOver ? (
                <p role="status" className="mt-3 flex gap-2 text-sm text-pretty text-muted-foreground">
                  <Banknote
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning"
                  />
                  {t("shopui.codOverLimit", { total: taka(fmt, total), max: taka(fmt, cod.maxOrder) })}
                </p>
              ) : null}
            </SectionCard>
          </form>
        ) : (
          <SectionCard title={t("shopui.signInTitle")} icon={LogIn} className="lg:col-start-1 lg:row-start-2">
            <div className="grid gap-4 sm:flex sm:items-center sm:justify-between">
              <p className="text-sm text-pretty text-muted-foreground">{t("shopui.signInSub")}</p>
              <ButtonLink href={signInHref as never} variant="outline" className="shrink-0">
                <LogIn aria-hidden="true" />
                {t("consult.signIn")}
              </ButtonLink>
            </div>
          </SectionCard>
        )}

        {/* 3. Summary: sticky beside the form on desktop, after it on phones */}
        <aside
          aria-label={t("shopui.summary")}
          className="grid gap-4 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <h2 className="font-heading text-lg font-bold">{t("shopui.summary")}</h2>

          <div className="grid gap-1.5">
            <Label htmlFor="co-coupon">{t("shop.coupon")}</Label>
            {coupon ? (
              <div className="grid gap-1.5">
                <p className="flex items-center gap-2 rounded-(--control-radius) bg-success/10 py-1 ps-3 pe-1 text-sm">
                  <TicketPercent aria-hidden="true" className="size-4 shrink-0 text-success" />
                  <span className="min-w-0 flex-1 truncate font-mono font-semibold">{coupon.code}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCoupon(null);
                      setCode("");
                    }}
                  >
                    <X aria-hidden="true" />
                    {t("shop.remove")}
                  </Button>
                </p>
                {couponShort ? (
                  <p role="status" className="text-xs font-medium text-warning-foreground dark:text-warning">
                    {t("shopui.couponShort", { amount: taka(fmt, coupon.rule.minSubtotal) })}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    id="co-coupon"
                    className="min-w-0 flex-1 font-mono uppercase"
                    value={code}
                    maxLength={20}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t("shopui.couponHint")}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (code.trim().length >= 3 && !checking) applyCoupon(code);
                      }
                    }}
                    aria-invalid={couponError ? true : undefined}
                    aria-describedby={couponError ? "co-coupon-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={checking || code.trim().length < 3}
                    onClick={() => applyCoupon(code)}
                  >
                    {checking ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                    {t("shop.apply")}
                  </Button>
                </div>
                <FieldError id="co-coupon-error" msg={couponError} />
              </>
            )}
          </div>

          {pointsCap > 0 ? (
            <label className="flex items-start gap-3 rounded-(--radius-lg) bg-success/8 px-3 py-2.5 text-sm ring-1 ring-success/20">
              <Checkbox
                checked={usePoints}
                onCheckedChange={(v) => setUsePoints(v === true)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{t("grow.usePoints", { n: pointsCap })}</span>
                <span className="text-xs text-muted-foreground">
                  {t("grow.usePointsShop", { n: (buyer?.points?.bps ?? 0) / 100 })}
                </span>
              </span>
            </label>
          ) : null}

          <dl className="grid gap-2 border-t pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {t("shop.subtotal")} ({fmt.number(items)})
              </dt>
              <dd className="tabular-nums">{taka(fmt, sub)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-3 text-success">
                <dt>
                  {t("shop.discount")} <span className="font-mono text-xs">({coupon?.code})</span>
                </dt>
                <dd className="tabular-nums">−{taka(fmt, discount)}</dd>
              </div>
            ) : null}
            {pointsOff > 0 ? (
              <div className="flex justify-between gap-3 text-success">
                <dt>{t("grow.pointsLine")}</dt>
                <dd className="tabular-nums">−{taka(fmt, pointsOff)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("shop.deliveryFee")}</dt>
              <dd className="text-end tabular-nums">
                {districtId ? (
                  delivery === 0 ? (
                    <span className="font-semibold text-success">{t("shop.free")}</span>
                  ) : (
                    taka(fmt, delivery)
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">{t("shopui.pickDistrict")}</span>
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t pt-3">
              <dt className="font-semibold">{t("shop.total")}</dt>
              <dd className="font-heading text-2xl font-bold tabular-nums">{taka(fmt, total)}</dd>
            </div>
          </dl>

          {toFree > 0 ? (
            <div className="grid gap-1.5">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                {t("shopui.toFree", { amount: taka(fmt, toFree) })}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full origin-left rounded-full bg-primary transition-transform duration-(--motion-slow) ease-(--ease-ui)"
                  style={{ transform: `scaleX(${Math.min(1, (sub - discount) / rule.freeFrom)})` }}
                />
              </div>
            </div>
          ) : rule.freeFrom > 0 ? (
            <p className="flex items-center gap-2 text-xs font-medium text-success">
              <Truck aria-hidden="true" className="size-4 shrink-0" />
              {t("shopui.freeUnlocked")}
            </p>
          ) : null}

          {blocked ? (
            <p id="cart-blocked" className="text-xs font-medium text-destructive">
              {t("shopui.fixStock")}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-(--radius-md) bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {mainButton("w-full max-lg:hidden")}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="size-3.5" />
            {t("shopui.nextStep")}
          </p>
        </aside>
      </div>

      {/* Phones and tablets: total + the main button, above the tab bar. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-8 md:px-8 lg:hidden print:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="grid min-w-0">
            <span className="text-xs text-muted-foreground">{t("shop.total")}</span>
            <span className="font-heading text-xl leading-tight font-bold tabular-nums">
              {taka(fmt, total)}
            </span>
          </div>
          {mainButton("ms-auto min-w-0 flex-1 sm:flex-none")}
        </div>
      </div>
    </div>
  );
}

function RemovedNote({ n }: { n: number }) {
  const t = useT();
  const fmt = useFormatter();
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-(--radius-xl) bg-warning/15 px-4 py-3 text-sm"
    >
      <AlertTriangle
        aria-hidden="true"
        className="size-4 shrink-0 text-warning-foreground dark:text-warning"
      />
      {t("shopui.removedGone", { n: fmt.number(n) })}
    </p>
  );
}

/** Loading twin of CartView: the items card and the summary. */
export function CartSkeleton() {
  return (
    <div role="status" className="grid gap-6">
      <Skeleton className="h-6 w-72 max-w-full rounded-full" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="grid gap-0 overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6">
          <Skeleton className="h-14 rounded-none" />
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-4 border-t p-4 sm:p-5">
              <Skeleton className="size-18 shrink-0 rounded-(--radius-lg) sm:size-22" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-(--control-h-sm) w-28 rounded-(--control-radius)" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-80 rounded-(--radius-2xl)" />
      </div>
    </div>
  );
}
