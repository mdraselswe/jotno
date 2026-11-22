import { PawPrint } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * An endless ribbon of short phrases (pure CSS). The list is drawn twice and
 * slides by half its width, so the loop has no seam. Pauses on hover; with
 * reduced motion it stands still.
 */
export function Marquee({
  items,
  className,
  reverse,
  speed = 38,
}: {
  items: readonly string[];
  className?: string;
  reverse?: boolean;
  /** Seconds for one loop. */
  speed?: number;
}) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-8 pe-8">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-8 whitespace-nowrap">
          <span>{item}</span>
          <PawPrint aria-hidden="true" className="size-5 shrink-0 opacity-60" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("group flex overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max group-hover:[animation-play-state:paused] motion-safe:animate-[marquee_var(--marquee-speed)_linear_infinite]",
          reverse && "[animation-direction:reverse]",
        )}
        style={{ "--marquee-speed": `${speed}s` } as CSSProperties}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
