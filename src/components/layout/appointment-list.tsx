import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

import type { Formatter, MessageKey, Translate } from "@/i18n";

export interface AppointmentRow {
  id: string;
  startsAt: Date;
  status: string;
  reason: string | null;
  title: string;
  detail: string | null;
}

const STATUS: Record<string, MessageKey> = {
  confirmed: "appt.status.confirmed",
  completed: "appt.status.completed",
  cancelled: "appt.status.cancelled",
  no_show: "appt.status.no_show",
  pending_payment: "appt.status.pending_payment",
};

/** A list of visits: time, who, status and an optional action per row. */
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
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center gap-3 rounded-(--control-radius) border-(length:--border-w) bg-card px-4 py-3"
        >
          <time
            dateTime={r.startsAt.toISOString()}
            className="grid min-w-20 rounded-(--control-radius) bg-muted px-2 py-1 text-center text-sm tabular-nums"
          >
            <span className="font-medium">
              {fmt.date(r.startsAt, { day: "numeric", month: "short", timeZone: "Asia/Dhaka" })}
            </span>
            <span className="text-xs text-muted-foreground">
              {fmt.date(r.startsAt, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" })}
            </span>
          </time>
          <span className="grid min-w-0 flex-1">
            <span className="font-medium">{r.title}</span>
            {r.detail ? <span className="truncate text-xs text-muted-foreground">{r.detail}</span> : null}
            {r.reason ? <span className="truncate text-sm">{r.reason}</span> : null}
          </span>
          <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
            {t(STATUS[r.status] ?? "appt.status.confirmed")}
          </Badge>
          {action?.(r)}
        </li>
      ))}
    </ul>
  );
}
