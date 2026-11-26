import { isPast } from "@/lib/time";
import { CheckCircle2, Clock, Phone, RefreshCw, XCircle, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Private } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { payPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { AutoRefresh, ManualPay, WalletMark, type WalletOption } from "@/features/payments";
import { payDeadline, paymentForPayer } from "@/features/payments/server";
import { availableMethods, walletFee, WALLETS } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import { CheckoutSteps } from "@/features/shop";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("pay.title"), robots: { index: false } };
}

const TONE = {
  success: "bg-success/12 text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]",
  waiting: "bg-info/12 text-info dark:text-[color-mix(in_oklch,var(--info),white_35%)]",
  stopped: "bg-muted text-muted-foreground",
} as const;

/** A finished or waiting state: icon, title, text, details, actions. */
function Result({
  icon: Icon,
  tone,
  title,
  sub,
  live = false,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  title: string;
  sub: string;
  /** The icon pulses (something is still happening). */
  live?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="grid justify-items-center gap-4 rounded-(--radius-2xl) bg-card px-5 py-8 text-center shadow-(--shadow-card) ring-1 ring-foreground/6 sm:px-8 sm:py-10">
      <span className={cn("relative grid size-16 place-items-center rounded-full", TONE[tone])}>
        {live ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-current opacity-20 motion-safe:animate-ping"
          />
        ) : null}
        <Icon aria-hidden="true" className="relative size-8" />
      </span>
      <div className="grid gap-1.5">
        <h1 className="font-heading text-2xl font-bold text-balance">{title}</h1>
        {sub ? <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Label/value lines, like a receipt. */
function Receipt({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid w-full gap-2 rounded-(--radius-xl) bg-muted/50 p-4 text-start text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 truncate text-end font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function Pay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const fmt = await getFormatter();
  const viewer = await requireViewer(locale, localeHref(locale, payPath(id)));
  const [p, settings] = await Promise.all([paymentForPayer(id, viewer.id, locale), getSettings()]);
  if (!p) notFound();
  const back = localeHref(locale, p.back);
  const isOrder = p.purpose === "order";
  const wallet = p.gateway === "bkash" || p.gateway === "nagad" ? p.gateway : null;
  const trx = p.gatewayTxId?.split(":")[1] ?? "";
  const help = settings.supportPhone ? (
    <a
      href={`tel:${settings.supportPhone}`}
      className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <Phone aria-hidden="true" className="size-4" />
      {t("pay.help", { phone: settings.supportPhone })}
    </a>
  ) : null;
  const steps = (current: 0 | 1 | 2) =>
    isOrder ? <CheckoutSteps current={current} t={t} className="justify-center" /> : null;
  const forRow = { label: t("pay.for"), value: p.target.title };
  const walletRow = wallet
    ? { label: t("admin.method"), value: <WalletMark method={wallet} label={t(`pay.method.${wallet}`)} /> }
    : null;

  if (p.status === "paid" || p.status === "refund_due" || p.status === "refunded")
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4">
        {steps(2)}
        <Result
          icon={p.status === "paid" ? CheckCircle2 : RefreshCw}
          tone={p.status === "paid" ? "success" : "stopped"}
          title={p.status === "paid" ? t("pay.paidTitle") : t(`pay.status.${p.status}`)}
          sub={p.status === "paid" ? t("pay.paidSub") : (p.note ?? "")}
        >
          <Receipt
            rows={[
              forRow,
              {
                label: t("payui.paid"),
                value: <span className="tabular-nums">{taka(fmt, p.amount + p.fee)}</span>,
              },
              ...(walletRow ? [walletRow] : []),
              ...(trx ? [{ label: t("pay.trxId"), value: <span className="font-mono">{trx}</span> }] : []),
            ]}
          />
          <ButtonLink href={back} variant="brand" size="lg" className="w-full sm:w-auto">
            {isOrder ? t("shop.viewOrder") : t("pay.go")}
          </ButtonLink>
        </Result>
        {help}
      </div>
    );

  if (p.status === "cancelled" || p.status === "failed")
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4">
        <Result icon={XCircle} tone="stopped" title={t("pay.cancelledTitle")} sub={t("pay.cancelledSub")}>
          <Receipt rows={[forRow, { label: t("pay.amount"), value: taka(fmt, p.amount) }]} />
          <ButtonLink
            href={localeHref(locale, isOrder ? ROUTES.shop : ROUTES.home)}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            {isOrder ? t("shop.browse") : t("common.back")}
          </ButtonLink>
        </Result>
        {help}
      </div>
    );

  if (p.status === "review")
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4">
        <AutoRefresh />
        {steps(2)}
        <Result
          icon={Clock}
          tone="waiting"
          live
          title={t("pay.reviewTitle")}
          sub={t("pay.reviewSub", { hours: settings.reviewHours })}
        >
          <Receipt
            rows={[
              forRow,
              {
                label: t("payui.sent"),
                value: <span className="tabular-nums">{taka(fmt, p.amount + p.fee)}</span>,
              },
              ...(walletRow ? [walletRow] : []),
              ...(p.payerPhone
                ? [{ label: t("payAdmin.from"), value: <span className="font-mono">{p.payerPhone}</span> }]
                : []),
              ...(trx ? [{ label: t("pay.trxId"), value: <span className="font-mono">{trx}</span> }] : []),
            ]}
          />
          <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-info motion-safe:animate-pulse" />
            {t("payui.autoUpdate")}
          </p>
          <ButtonLink href={back} variant="outline" size="lg" className="w-full sm:w-auto">
            {isOrder ? t("shop.viewOrder") : t("pay.go")}
          </ButtonLink>
        </Result>
        {help}
      </div>
    );

  // Cash on delivery chosen: the order is placed; nothing to pay now.
  if (p.gateway === "cod")
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4">
        {steps(2)}
        <Result icon={CheckCircle2} tone="success" title={t("pay.codPlaced")} sub={t("pay.codSub")}>
          <Receipt
            rows={[
              forRow,
              {
                label: t("payui.payOnDelivery"),
                value: <span className="tabular-nums">{taka(fmt, p.amount)}</span>,
              },
              { label: t("admin.method"), value: <WalletMark method="cod" label={t("pay.method.cod")} /> },
            ]}
          />
          <ButtonLink href={back} variant="brand" size="lg" className="w-full sm:w-auto">
            {t("shop.viewOrder")}
          </ButtonLink>
        </Result>
        {help}
      </div>
    );

  const methods = availableMethods(settings, p.purpose, p.amount);
  const wallets: WalletOption[] = WALLETS.filter((w) => methods.includes(w)).map((w) => ({
    method: w,
    number: settings[w].number,
    accountType: settings[w].accountType,
    fee: walletFee(p.amount, settings[w]),
  }));
  const deadline = payDeadline(p);

  return (
    <div className="grid gap-4 lg:gap-6">
      {steps(1)}
      <ManualPay
        paymentId={p.id}
        amount={p.amount}
        wallets={wallets}
        cod={methods.includes("cod")}
        note={p.note}
        // A rejected TrxID keeps the wallet and number it was sent with (rejectPayment clears only the id).
        lastMethod={p.note ? p.gateway : null}
        lastPhone={p.note ? p.payerPhone : null}
        title={p.target.title}
        detail={p.target.detail}
        deadline={
          !isPast(deadline)
            ? t(isOrder ? "payui.payByOrder" : "payui.payBy", { time: fmt.dateTime(deadline) })
            : null
        }
        footer={help}
      />
    </div>
  );
}

export default function PayPage({ params }: PageProps<"/[locale]/pay/[id]">) {
  return (
    <div className="container-page grid min-h-[70svh] py-6 md:py-10">
      {/* The result screens stay narrow; the payment form uses a checkout layout from lg. */}
      <div className="mx-auto w-full max-w-5xl">
        <Private rows={4}>
          <Pay params={params} />
        </Private>
      </div>
    </div>
  );
}
