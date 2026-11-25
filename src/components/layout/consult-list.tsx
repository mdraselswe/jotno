import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { site } from "@/config";
import { chatPath } from "@/config/routes";
import { chatDayKey } from "@/features/consults";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StatusBadge, type BadgeTone } from "./app-ui";

export interface ConsultRowData {
  id: string;
  status: "pending_payment" | "active" | "closed" | "refunded" | "cancelled";
  summary: string;
  fee: number;
  createdAt: Date;
  otherName: string | null;
  /** The other person's photo (the vet's, on the owner side). */
  otherPhoto?: string | null;
  /** The vet hasn't answered yet ("New" on the vet side). */
  firstReplyAt?: Date | null;
  unread: number;
}

const STATUS_TONE: Record<ConsultRowData["status"], BadgeTone> = {
  active: "success",
  pending_payment: "warning",
  closed: "neutral",
  refunded: "info",
  cancelled: "neutral",
};

/** "3:40 PM" today, "Mon" this week, else "12 Nov". */
function when(date: Date, now: Date, fmt: Formatter) {
  const tz = site.i18n.timeZone;
  if (chatDayKey(date, tz) === chatDayKey(now, tz)) return fmt.date(date, { timeStyle: "short" });
  if (now.getTime() - date.getTime() < 6 * 86_400_000) return fmt.date(date, { weekday: "short" });
  return fmt.date(date, { day: "numeric", month: "short" });
}

/** An inbox of chats (owner or vet side): who, the case, when, unread count, status. */
export function ConsultList({
  items,
  locale,
  t,
  fmt,
  side = "owner",
}: {
  items: ConsultRowData[];
  locale: string;
  t: Translate;
  fmt: Formatter;
  side?: "owner" | "vet";
}) {
  const now = new Date();
  return (
    <ul className="grid gap-0.5 rounded-(--radius-2xl) bg-card p-1.5 shadow-(--shadow-card) ring-1 ring-foreground/6">
      {items.map((c) => {
        const name = c.otherName ?? "—";
        const unread = c.unread > 0;
        const waiting = side === "vet" && c.status === "active" && !c.firstReplyAt;
        return (
          <li key={c.id}>
            <Link
              href={localeHref(locale, chatPath(c.id))}
              className="flex items-center gap-3 rounded-(--radius-xl) px-2.5 py-3 transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-3"
            >
              <span className="relative shrink-0">
                <Avatar className="size-12 bg-muted">
                  {c.otherPhoto ? <AvatarImage src={c.otherPhoto} alt="" className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/12 text-base font-semibold text-primary">
                    {name.trim().charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {c.status === "active" ? (
                  <span
                    aria-hidden="true"
                    className="absolute end-0 bottom-0 size-3.5 rounded-full bg-success ring-2 ring-card"
                  />
                ) : null}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex items-baseline gap-2">
                  <span className={cn("min-w-0 truncate", unread || waiting ? "font-bold" : "font-semibold")}>
                    {name}
                  </span>
                  <time
                    dateTime={c.createdAt.toISOString()}
                    className={cn(
                      "ms-auto shrink-0 text-xs",
                      unread ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {when(c.createdAt, now, fmt)}
                  </time>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      unread ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.summary}
                  </span>
                  {unread ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                      <span aria-hidden="true">{fmt.number(c.unread)}</span>
                      <span className="sr-only">{t("chatui.list.unread", { n: c.unread })}</span>
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {waiting ? (
                    <StatusBadge tone="danger">{t("chatui.list.waiting")}</StatusBadge>
                  ) : (
                    <StatusBadge tone={STATUS_TONE[c.status]}>{t(`consult.status.${c.status}`)}</StatusBadge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">{taka(fmt, c.fee)}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
