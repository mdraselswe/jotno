import { PawPrint, Phone, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import { Skeleton } from "@/components/ui/skeleton";
import type { Formatter, MessageKey, Translate } from "@/i18n";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface VetVisit {
  id: string;
  startsAt: Date;
  status: string;
  reason: string | null;
  petName: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  visitFee: number;
}

const STATUS: Record<string, { key: MessageKey; tone: BadgeTone }> = {
  confirmed: { key: "appt.status.confirmed", tone: "primary" },
  completed: { key: "appt.status.completed", tone: "success" },
  cancelled: { key: "appt.status.cancelled", tone: "neutral" },
  no_show: { key: "appt.status.no_show", tone: "danger" },
  pending_payment: { key: "appt.status.pending_payment", tone: "warning" },
};

/**
 * One clinic visit for the vet: a time block (Dhaka time), the pet and owner
 * (tap to call), the reason, a status pill and the row's actions.
 */
export function VetVisitCard({
  visit,
  t,
  fmt,
  actions,
  compact = false,
}: {
  visit: VetVisit;
  t: Translate;
  fmt: Formatter;
  actions?: ReactNode;
  /** Dashboard list: time only (the day is today). */
  compact?: boolean;
}) {
  const status = STATUS[visit.status] ?? { key: "appt.status.confirmed", tone: "primary" };
  const muted = visit.status === "cancelled" || visit.status === "no_show";
  return (
    <article
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-(--radius-xl) bg-card p-3.5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:flex-nowrap sm:items-center sm:p-4",
        muted && "bg-card/70",
      )}
    >
      <time
        dateTime={visit.startsAt.toISOString()}
        className={cn(
          "grid w-18 shrink-0 justify-items-center gap-0.5 rounded-(--radius-lg) px-2 py-2 text-center tabular-nums",
          muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {compact ? null : (
          <span className="text-xs font-semibold">
            {fmt.date(visit.startsAt, { weekday: "short", day: "numeric", month: "short" })}
          </span>
        )}
        <span className="font-heading text-base leading-tight font-bold">
          {fmt.date(visit.startsAt, { hour: "numeric", minute: "2-digit" })}
        </span>
      </time>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="flex min-w-0 items-center gap-1.5 font-semibold">
            <PawPrint aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className={cn("truncate", !visit.petName && "font-normal text-muted-foreground")}>
              {visit.petName ?? t("vetui.appt.noPet")}
            </span>
          </p>
          <StatusBadge tone={status.tone}>{t(status.key)}</StatusBadge>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{visit.ownerName ?? "—"}</span>
          </span>
          {visit.ownerPhone ? (
            <a
              href={`tel:${visit.ownerPhone}`}
              aria-label={t("vetui.appt.call", { name: visit.ownerName ?? visit.ownerPhone })}
              className="inline-flex items-center gap-1.5 rounded-(--radius-sm) font-medium text-primary tabular-nums hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Phone aria-hidden="true" className="size-3.5" />
              {visit.ownerPhone}
            </a>
          ) : null}
          {visit.visitFee > 0 ? <span>{t("vetui.appt.fee", { fee: taka(fmt, visit.visitFee) })}</span> : null}
        </p>
        {visit.reason ? <p className="line-clamp-2 text-sm text-pretty">{visit.reason}</p> : null}
      </div>
      {actions ? <div className="flex w-full shrink-0 justify-end sm:w-auto">{actions}</div> : null}
    </article>
  );
}

/** Loading twin of VetVisitCard. */
export function VetVisitCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-(--radius-xl) bg-card p-3.5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-4">
      <Skeleton className="h-14 w-18 shrink-0 rounded-(--radius-lg)" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3.5 w-56 max-w-full" />
      </div>
    </div>
  );
}
