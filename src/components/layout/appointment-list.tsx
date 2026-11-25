import { Clock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Formatter, MessageKey, Translate } from "@/i18n";
import { cn } from "@/lib/utils";
import { StatusBadge, type BadgeTone } from "./app-ui";

export interface AppointmentRow {
  id: string;
  startsAt: Date;
  status: string;
  reason: string | null;
  title: string;
  detail: string | null;
  /** Optional labelled lines with an icon (clinic, phone, pet…); shown under the time. */
  meta?: { icon: LucideIcon; text: string; href?: string }[];
}

const STATUS: Record<string, { label: MessageKey; tone: BadgeTone }> = {
  confirmed: { label: "appt.status.confirmed", tone: "primary" },
  completed: { label: "appt.status.completed", tone: "success" },
  cancelled: { label: "appt.status.cancelled", tone: "neutral" },
  no_show: { label: "appt.status.no_show", tone: "warning" },
  pending_payment: { label: "appt.status.pending_payment", tone: "warning" },
};

/**
 * A list of visits as cards: a date block, who, the time (in the site's time
 * zone, through the formatter), a status pill and an optional action per row.
 * Used by the owner's bookings and the vet's appointments.
 */
export function AppointmentList({
  rows,
  t,
  fmt,
  action,
}: {
  rows: AppointmentRow[];
  t: Translate;
  fmt: Formatter;
  action?: (row: AppointmentRow) => ReactNode;
}) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => {
        const status = STATUS[r.status] ?? { label: "appt.status.confirmed", tone: "primary" };
        const live = r.status === "confirmed";
        const act = action?.(r);
        return (
          <li
            key={r.id}
            className="flex gap-3 rounded-(--radius-2xl) bg-card p-3 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:gap-4 sm:p-4"
          >
            <time
              dateTime={r.startsAt.toISOString()}
              className={cn(
                "grid h-fit w-15 shrink-0 justify-items-center gap-0.5 rounded-(--radius-xl) py-2.5 text-center sm:w-17",
                live ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <span className="text-[0.6875rem] font-semibold">
                {fmt.date(r.startsAt, { weekday: "short" })}
              </span>
              <span className="font-heading text-2xl leading-none font-bold tabular-nums">
                {fmt.date(r.startsAt, { day: "numeric" })}
              </span>
              <span className="text-xs font-medium">{fmt.date(r.startsAt, { month: "short" })}</span>
            </time>
            <div className="grid min-w-0 flex-1 content-start gap-1.5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 font-heading font-semibold break-words">{r.title}</p>
                <StatusBadge tone={status.tone}>{t(status.label)}</StatusBadge>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
                <Clock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                {fmt.date(r.startsAt, { hour: "numeric", minute: "2-digit" })}
              </p>
              {r.meta?.map((m) => {
                const Icon = m.icon;
                const body = (
                  <>
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 break-words">{m.text}</span>
                  </>
                );
                return m.href ? (
                  <a
                    key={m.text}
                    href={m.href}
                    className="flex w-fit items-start gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {body}
                  </a>
                ) : (
                  <p key={m.text} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    {body}
                  </p>
                );
              })}
              {r.detail ? <p className="text-xs break-words text-muted-foreground">{r.detail}</p> : null}
              {r.reason ? (
                <p className="line-clamp-3 rounded-(--radius-lg) bg-muted/60 px-2.5 py-1.5 text-sm text-pretty">
                  {r.reason}
                </p>
              ) : null}
              {act ? <div className="flex flex-wrap items-center gap-2 pt-1">{act}</div> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Loading twin of AppointmentList. */
export function AppointmentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="grid gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-(--radius-2xl) bg-card p-3 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:gap-4 sm:p-4"
        >
          <Skeleton className="h-19 w-15 shrink-0 rounded-(--radius-xl) sm:w-17" />
          <div className="grid flex-1 content-start gap-2">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
