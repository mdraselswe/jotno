import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STEPS, orderStep, type OrderStatus } from "../status";

/**
 * The four-step progress line on an order (ordered → packing → on the way →
 * delivered). Server-safe: labels come in already translated.
 */
export function OrderTimeline({
  status,
  labels,
  dates,
}: {
  status: OrderStatus;
  labels: Record<(typeof ORDER_STEPS)[number], string>;
  dates?: Partial<Record<(typeof ORDER_STEPS)[number], string>>;
}) {
  const at = orderStep(status);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={labels[ORDER_STEPS[Math.max(0, at)] ?? "ordered"]}>
      {ORDER_STEPS.map((step, i) => {
        const done = at >= i;
        const current = at === i;
        return (
          <li key={step} className="grid justify-items-center gap-2 text-center">
            <span className="relative flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i === 0 ? "invisible" : done ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-(--motion-base)",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  current && "ring-4 ring-primary/20 motion-safe:animate-pulse",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done && !current ? <Check aria-hidden="true" className="size-4" /> : i + 1}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i === ORDER_STEPS.length - 1 ? "invisible" : at > i ? "bg-primary" : "bg-muted",
                )}
              />
            </span>
            <span className={cn("text-xs", done ? "font-medium" : "text-muted-foreground")}>
              {labels[step]}
            </span>
            {dates?.[step] ? (
              <span className="text-[0.7rem] text-muted-foreground">{dates[step]}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
