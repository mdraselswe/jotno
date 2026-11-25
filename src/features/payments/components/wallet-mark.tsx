import { Banknote, Smartphone } from "lucide-react";
import type { PayMethod } from "@/features/settings";
import { cn } from "@/lib/utils";

/** Each way of paying's colour (wallet brand colours come from the bkash/nagad tokens only). */
export const PAY_BRAND: Record<PayMethod, string> = {
  bkash: "bg-bkash text-white",
  nagad: "bg-nagad text-white",
  cod: "bg-primary text-primary-foreground",
};

/**
 * A payment method's mark: a pill with its name (`pill`) or an icon tile
 * (`tile`). Server-safe; the label comes in translated.
 */
export function WalletMark({
  method,
  label,
  variant = "pill",
  className,
}: {
  method: PayMethod;
  label: string;
  variant?: "pill" | "tile";
  className?: string;
}) {
  const Icon = method === "cod" ? Banknote : Smartphone;
  if (variant === "tile")
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-(--radius-lg) shadow-(--shadow-control)",
          PAY_BRAND[method],
          className,
        )}
      >
        <Icon className="size-5" />
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-bold whitespace-nowrap",
        PAY_BRAND[method],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
