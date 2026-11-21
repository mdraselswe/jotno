import { cn } from "@/lib/utils";

export interface RingPart {
  label: string;
  /** 0–1: how much of the protection is left. */
  value: number;
}

const TONES = ["stroke-primary", "stroke-highlight", "stroke-info"] as const;

/**
 * Three concentric rings (vaccine, deworming, check-up) like an activity ring:
 * full = recently done, empty = due. Pure SVG, animates in with the `draw` utility.
 */
export function HealthRing({
  parts,
  className,
  label,
}: {
  parts: RingPart[];
  className?: string;
  label: string;
}) {
  const size = 120;
  const stroke = 10;
  const gap = 3;
  return (
    <figure className={cn("flex items-center gap-4", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-28 shrink-0 -rotate-90"
        role="img"
        aria-label={label}
      >
        {parts.map((part, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          return (
            <g key={part.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className="stroke-muted"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.max(0.001, part.value))}
                className={cn(
                  TONES[i % TONES.length],
                  "transition-[stroke-dashoffset] duration-700 ease-out",
                )}
              />
            </g>
          );
        })}
      </svg>
      <figcaption className="grid gap-1.5 text-sm">
        {parts.map((part, i) => (
          <span key={part.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-full", ["bg-primary", "bg-highlight", "bg-info"][i % 3])}
            />
            {part.label}
            <span className="text-muted-foreground tabular-nums">{Math.round(part.value * 100)}%</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
