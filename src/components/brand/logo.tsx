import { MARK_HEART, MARK_TOES, MARK_VIEWBOX } from "@/config/brand-mark";
import { cn } from "@/lib/utils";

/** The Jotno mark: toes in the brand colour, the heart pad in the highlight colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      {MARK_TOES.map(([cx, cy, rx, ry, r]) => (
        <ellipse
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          transform={`rotate(${r} ${cx} ${cy})`}
          className="fill-primary"
        />
      ))}
      <path d={MARK_HEART} className="fill-highlight" />
    </svg>
  );
}

/** Mark + wordmark ("Jotno" in Latin, "যত্ন" in Bangla). */
export function Logo({ locale, className }: { locale: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="transition-transform duration-(--motion-base) ease-spring group-hover:-rotate-12" />
      <span className="font-heading text-xl leading-none font-bold tracking-tight">
        {locale === "bn" ? "যত্ন" : "Jotno"}
      </span>
    </span>
  );
}
