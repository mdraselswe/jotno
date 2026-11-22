import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { chatPath } from "@/config/routes";
import type { Formatter, Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ConsultRowData {
  id: string;
  status: "pending_payment" | "active" | "closed" | "refunded" | "cancelled";
  summary: string;
  fee: number;
  createdAt: Date;
  otherName: string | null;
  unread: number;
}

/** A list of chats (owner or vet side). */
export function ConsultList({
  items,
  locale,
  t,
  fmt,
}: {
  items: ConsultRowData[];
  locale: string;
  t: Translate;
  fmt: Formatter;
}) {
  return (
    <ul className="grid gap-2">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={localeHref(locale, chatPath(c.id))}
            className="flex items-center gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) hover:bg-muted/40"
          >
            <MessageCircle aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{c.otherName ?? "—"}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.6875rem]",
                    c.status === "active"
                      ? "bg-success/15 text-success-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {t(`consult.status.${c.status}`)}
                </span>
              </span>
              <span className="truncate text-sm text-muted-foreground">{c.summary}</span>
              <span className="text-xs text-muted-foreground">
                {fmt.date(c.createdAt)} · {taka(fmt, c.fee)}
              </span>
            </span>
            {c.unread > 0 ? (
              <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                {fmt.number(c.unread)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
