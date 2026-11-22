import { CheckCircle2, Clock, Phone, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Private } from "@/components/layout/private-page";
import { ButtonLink } from "@/components/ui/button-link";
import { payPath, ROUTES } from "@/config/routes";
import { requireViewer } from "@/features/auth/server";
import { AutoRefresh, ManualPay, type WalletOption } from "@/features/payments";
import { paymentForPayer } from "@/features/payments/server";
import { availableMethods, walletFee, WALLETS } from "@/features/settings";
import { getSettings } from "@/features/settings/server";
import { getFormatter, getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";

export const metadata = { title: "Pay", robots: { index: false } };

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="glow-border relative mx-auto grid w-full max-w-md gap-6 rounded-(--radius-2xl) bg-card p-6 shadow-(--shadow-card) sm:p-8">
      {children}
    </div>
  );
}

function Result({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <span className="grid size-16 reveal place-items-center rounded-full bg-highlight/25 text-primary">
        {icon}
      </span>
      <h1 className="font-heading text-2xl font-semibold text-balance">{title}</h1>
      <p className="text-pretty text-muted-foreground">{sub}</p>
      {children}
    </div>
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
  const help = settings.supportPhone ? (
    <a
      href={`tel:${settings.supportPhone}`}
      className="flex items-center justify-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      <Phone aria-hidden="true" className="size-4" />
      {t("pay.help", { phone: settings.supportPhone })}
    </a>
  ) : null;

  const header = (
    <header className="grid gap-1">
      <p className="text-sm text-muted-foreground">{t("pay.for")}</p>
      <h1 className="font-heading text-xl font-semibold">{p.target.title}</h1>
      {p.target.detail ? <p className="text-sm text-muted-foreground">{p.target.detail}</p> : null}
    </header>
  );

  if (p.status === "paid" || p.status === "refund_due" || p.status === "refunded")
    return (
      <Card>
        <Result
          icon={<CheckCircle2 aria-hidden="true" className="size-8" />}
          title={p.status === "paid" ? t("pay.paidTitle") : t(`pay.status.${p.status}`)}
          sub={p.status === "paid" ? t("pay.paidSub") : (p.note ?? "")}
        >
          <ButtonLink href={back} size="lg">
            {t("pay.go")}
          </ButtonLink>
        </Result>
      </Card>
    );

  if (p.status === "cancelled" || p.status === "failed")
    return (
      <Card>
        <Result
          icon={<XCircle aria-hidden="true" className="size-8" />}
          title={t("pay.cancelledTitle")}
          sub={t("pay.cancelledSub")}
        >
          <ButtonLink
            href={localeHref(locale, p.purpose === "order" ? ROUTES.shop : ROUTES.home)}
            variant="outline"
          >
            {t("common.back")}
          </ButtonLink>
        </Result>
        {help}
      </Card>
    );

  if (p.status === "review") {
    const trx = p.gatewayTxId?.split(":")[1] ?? "";
    const wallet = p.gateway === "bkash" || p.gateway === "nagad" ? t(`pay.method.${p.gateway}`) : "";
    return (
      <Card>
        <AutoRefresh />
        <Result
          icon={<Clock aria-hidden="true" className="size-8 motion-safe:animate-pulse" />}
          title={t("pay.reviewTitle")}
          sub={t("pay.reviewSub", { hours: settings.reviewHours })}
        >
          <p className="rounded-(--radius-lg) bg-muted/60 px-4 py-3 text-sm">
            {t("pay.reviewSent", {
              amount: taka(fmt, p.amount + p.fee),
              wallet,
              phone: p.payerPhone ?? "",
              trx,
            })}
          </p>
          <ButtonLink href={back} variant="outline">
            {t("pay.go")}
          </ButtonLink>
        </Result>
        {help}
      </Card>
    );
  }

  // Cash on delivery chosen: the order is placed; nothing to pay now.
  if (p.gateway === "cod")
    return (
      <Card>
        <Result
          icon={<CheckCircle2 aria-hidden="true" className="size-8" />}
          title={t("pay.codPlaced")}
          sub={t("pay.codSub")}
        >
          <ButtonLink href={back} size="lg">
            {t("shop.viewOrder")}
          </ButtonLink>
        </Result>
        {help}
      </Card>
    );

  const methods = availableMethods(settings, p.purpose, p.amount);
  const wallets: WalletOption[] = WALLETS.filter((w) => methods.includes(w)).map((w) => ({
    method: w,
    number: settings[w].number,
    accountType: settings[w].accountType,
    fee: walletFee(p.amount, settings[w]),
  }));

  return (
    <Card>
      {header}
      <ManualPay
        paymentId={p.id}
        amount={p.amount}
        wallets={wallets}
        cod={methods.includes("cod")}
        note={p.note}
      />
      {help}
    </Card>
  );
}

export default function PayPage({ params }: PageProps<"/[locale]/pay/[id]">) {
  return (
    <div className="container-page grid min-h-[70svh] place-items-center py-10">
      <Private rows={4}>
        <Pay params={params} />
      </Private>
    </div>
  );
}
