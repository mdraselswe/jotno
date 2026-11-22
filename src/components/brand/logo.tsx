import { useId } from "react";
import { MARK_CROSS, MARK_PAD, MARK_TOES, MARK_VIEWBOX } from "@/config/brand-mark";
import { cn } from "@/lib/utils";

/** The Jotno mark: a paw in the brand colour with a medical cross cut out of its pad. */
export function LogoMark({ className }: { className?: string }) {
  const mask = `jotno-cross-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <defs>
        <mask id={mask}>
          <rect width="100" height="100" fill="white" />
          <path d={MARK_CROSS} fill="black" stroke="black" strokeWidth="2" strokeLinejoin="round" />
        </mask>
      </defs>
      <g className="fill-primary">
        {MARK_TOES.map(([cx, cy, rx, ry, r], i) => (
          <ellipse
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${r} ${cx} ${cy})`}
            className="transition-[translate] duration-(--motion-base) ease-out-expo group-hover:-translate-y-1"
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        ))}
        <path d={MARK_PAD} mask={`url(#${mask})`} />
      </g>
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
