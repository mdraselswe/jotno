import { Clock } from "lucide-react";
import { business } from "@/config";
import type { Formatter, Translate } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Shown where an owner starts a paid chat with a vet who is not "available
 * now": the chat still works, but the reply may be slower, and the reply
 * window's automatic full refund still applies.
 */
export function VetOfflineNotice({
  t,
  fmt,
  className,
}: {
  t: Translate;
  fmt: Formatter;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-(--radius-xl) bg-warning/12 p-4 text-sm ring-1 ring-warning/30",
        className,
      )}
    >
      <Clock
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0 text-warning-foreground dark:text-warning"
      />
      <div className="grid gap-1">
        <p className="font-semibold">{t("pubui.vet.offlineTitle")}</p>
        <p className="text-pretty text-muted-foreground">
          {t("pubui.vet.offlineBody", { window: fmt.number(business.consult.replyWindowMinutes) })}
        </p>
      </div>
    </div>
  );
}
