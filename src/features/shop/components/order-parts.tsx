import { Check, CircleX, CreditCard, PackageCheck, ShoppingCart, Truck, type LucideIcon } from "lucide-react";
import { StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import type { Translate } from "@/i18n";
import { cn } from "@/lib/utils";
import { ORDER_STATUS, ORDER_STEPS, orderStep, type OrderStatus } from "../status";

/** The colour of an order's status pill. */
export const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  pending_payment: "warning",
  placed: "info",
  paid: "primary",
  processing: "primary",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

/** An order's status as a coloured pill. */
export function OrderStatusBadge({ status, t }: { status: OrderStatus; t: Translate }) {
  return <StatusBadge tone={ORDER_TONE[status]}>{t(ORDER_STATUS[status])}</StatusBadge>;
}

const STEP_ICON: Record<(typeof ORDER_STEPS)[number], LucideIcon> = {
  ordered: ShoppingCart,
  processing: PackageCheck,
  shipped: Truck,
  delivered: Check,
};

/**
 * The four-step progress line on an order (ordered → packing → on the way →
 * delivered). Server-safe: labels come in already translated. A cancelled or
 * returned order shows one stopped marker instead.
 */
export function OrderTimeline({
  status,
  labels,
  dates,
  stoppedLabel,
}: {
  status: OrderStatus;
  labels: Record<(typeof ORDER_STEPS)[number], string>;
  dates?: Partial<Record<(typeof ORDER_STEPS)[number], string>>;
  /** Shown instead of the steps when the order stopped (cancelled, returned). */
  stoppedLabel?: string;
}) {
  const at = orderStep(status);
  if (at < 0 && stoppedLabel)
    return (
      <p className="flex items-center gap-3 rounded-(--radius-xl) bg-destructive/8 p-3 text-sm font-medium text-destructive">
        <CircleX aria-hidden="true" className="size-5 shrink-0" />
        {stoppedLabel}
      </p>
    );
  return (
    <ol className="grid grid-cols-4">
      {ORDER_STEPS.map((step, i) => {
        const done = at >= i;
        const current = at === i;
        const Icon = STEP_ICON[step];
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className="grid min-w-0 justify-items-center gap-2 text-center"
          >
            <span className="relative flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "invisible" : done ? "bg-primary" : "bg-foreground/10",
                )}
              />
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-(--motion-base) sm:size-10",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  current && "ring-4 ring-primary/20",
                )}
              >
                {done && !current ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Icon aria-hidden="true" className="size-4" />
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1",
                  i === ORDER_STEPS.length - 1 ? "invisible" : at > i ? "bg-primary" : "bg-foreground/10",
                )}
              />
            </span>
            <span
              className={cn(
                "px-0.5 text-xs leading-tight sm:text-sm",
                done ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {labels[step]}
            </span>
            {dates?.[step] ? (
              <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{dates[step]}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const CHECKOUT_STEPS = [
  { key: "shopui.step.cart", icon: ShoppingCart },
  { key: "shopui.step.payment", icon: CreditCard },
  { key: "shopui.step.done", icon: Check },
] as const;

/** Where the buyer is in checkout: cart and delivery → payment → done. Server-safe. */
export function CheckoutSteps({
  current,
  t,
  className,
}: {
  current: 0 | 1 | 2;
  t: Translate;
  className?: string;
}) {
  return (
    <ol
      aria-label={t("shopui.checkoutSteps")}
      className={cn("flex items-center gap-2 text-xs font-medium sm:text-sm", className)}
    >
      {CHECKOUT_STEPS.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const Icon = done ? Check : s.icon;
        return (
          <li key={s.key} aria-current={now ? "step" : undefined} className="flex min-w-0 items-center gap-2">
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn("h-px w-4 shrink-0 sm:w-8", done || now ? "bg-primary" : "bg-foreground/15")}
              />
            ) : null}
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full",
                done
                  ? "bg-primary text-primary-foreground"
                  : now
                    ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <span
              className={cn(
                "truncate",
                now ? "text-foreground" : "text-muted-foreground",
                !now && "max-sm:sr-only",
              )}
            >
              {t(s.key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
