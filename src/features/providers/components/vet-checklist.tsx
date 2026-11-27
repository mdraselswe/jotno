import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { formatter, type MessageKey, type Translate } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ChecklistTarget } from "../checklist";

const LABEL: Record<ChecklistItem["key"], MessageKey> = {
  photo: "vetui.check.photo",
  bvc: "vetui.check.bvc",
  nidName: "vetui.check.nidName",
  area: "vetui.check.area",
  species: "vetui.check.species",
  docBvc: "vetui.check.docBvc",
  docNid: "vetui.check.docNid",
  bio: "vetui.check.bio",
  degrees: "vetui.check.degrees",
  experience: "vetui.check.experience",
  clinic: "vetui.check.clinic",
  address: "vetui.check.address",
  location: "vetui.check.location",
  phone: "vetui.check.phone",
  hours: "vetui.check.hours",
};

/** Profile form section ids (vet-profile-form.tsx), so a checklist link lands on the right card. */
export const PROFILE_ANCHOR: Record<Exclude<ChecklistTarget, "schedule">, string> = {
  basics: "vp-basic",
  creds: "vp-cred",
  place: "vp-place",
  services: "vp-services",
  documents: "vp-docs",
};

function hrefFor(locale: string, target: ChecklistTarget) {
  if (target === "schedule") return localeHref(locale, ROUTES.vetSchedule);
  return localeHref(locale, `${ROUTES.vetProfile}/#${PROFILE_ANCHOR[target]}`);
}

/** Progress bar + the items still to do (required ones first), each linking to where it is filled in. */
export function VetChecklist({
  items,
  locale,
  t,
  showDone = false,
  className,
}: {
  items: ChecklistItem[];
  locale: string;
  t: Translate;
  /** Also list the finished items (ticked). */
  showDone?: boolean;
  className?: string;
}) {
  const num = formatter(locale).number;
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const shown = [...items]
    .filter((i) => showDone || !i.done)
    .sort((a, b) => Number(a.done) - Number(b.done) || Number(b.required) - Number(a.required));
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{t("vetui.check.title")}</span>
          <span className="text-muted-foreground tabular-nums">
            {t("vetui.check.progress", { done: num(done), total: num(items.length) })}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={t("vetui.check.title")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-(--motion-slow) ease-(--ease-ui)"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <Check aria-hidden="true" className="size-4" />
          {t("vetui.check.allDone")}
        </p>
      ) : (
        <ul className="grid gap-1">
          {shown.map((item) => (
            <li key={item.key}>
              <Link
                href={hrefFor(locale, item.target)}
                className="group flex min-h-11 items-center gap-3 rounded-(--radius-lg) px-2 py-1.5 text-sm transition-colors duration-(--motion-fast) hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full ring-1",
                    item.done
                      ? "bg-success text-success-foreground ring-success"
                      : "bg-card ring-foreground/20",
                  )}
                >
                  {item.done ? <Check className="size-3" /> : null}
                </span>
                <span className="grid min-w-0 flex-1 justify-items-start gap-0.5">
                  <span className={cn(item.done && "text-muted-foreground line-through")}>
                    {t(LABEL[item.key])}
                  </span>
                  {item.required && !item.done ? (
                    <span className="rounded-full bg-warning/25 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:text-warning">
                      {t("vetui.check.required")}
                    </span>
                  ) : null}
                </span>
                {!item.done ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
                    {t("vetui.check.add")}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
