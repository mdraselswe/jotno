import { MARK_CRADLE, MARK_DOT, MARK_STROKE, MARK_VIEWBOX } from "@/config/brand-mark";
import { cn } from "@/lib/utils";

/** The Jotno mark: an open hand in the brand colour holding a dot in the highlight colour. */
export function LogoMark({ className }: { className?: string }) {
  const [cx, cy, r] = MARK_DOT;
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <path
        d={MARK_CRADLE}
        fill="none"
        strokeWidth={MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        className="origin-[50px_47px] fill-highlight transition-transform duration-(--motion-base) ease-out-expo group-hover:-translate-y-1.5"
      />
    </svg>
  );
}

/** Mark + wordmark ("Jotno" in Latin, "যত্ন" in Bangla). */
export function Logo({ locale, className }: { locale: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-xl leading-none font-bold tracking-tight">
        {locale === "bn" ? "যত্ন" : "Jotno"}
      </span>
    </span>
  );
}
