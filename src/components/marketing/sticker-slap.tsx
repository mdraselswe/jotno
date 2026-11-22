"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SPOTS = [
  { className: "top-[8%] left-[4%]", rotate: -8, tone: "bg-highlight text-highlight-foreground" },
  { className: "top-[14%] right-[6%]", rotate: 7, tone: "bg-card text-foreground" },
  { className: "bottom-[16%] left-[8%]", rotate: 5, tone: "bg-band-bird text-foreground" },
  { className: "bottom-[10%] right-[10%]", rotate: -6, tone: "bg-band-rabbit text-foreground" },
  { className: "top-[48%] right-[2%] max-md:hidden", rotate: 10, tone: "bg-band-dog text-foreground" },
  { className: "top-[44%] left-[1%] max-md:hidden", rotate: -12, tone: "bg-card text-foreground" },
] as const;

/**
 * A call-to-action panel that stickers get slapped onto as it scrolls into
 * view. Each sticker can be dragged around (and springs a little). With
 * reduced motion they are simply there.
 */
export function StickerSlap({
  stickers,
  children,
  className,
  mascot,
}: {
  stickers: readonly string[];
  children: ReactNode;
  className?: string;
  mascot?: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  return (
    <div
      ref={area}
      className={cn(
        "relative isolate overflow-hidden rounded-(--radius-4xl) bg-primary px-6 py-20 text-primary-foreground shadow-(--shadow-card) sm:px-12 md:py-28",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [background-image:radial-gradient(currentColor_1px,transparent_1.5px)] [background-size:22px_22px] opacity-25"
      />
      <div className="relative z-10 mx-auto grid max-w-2xl justify-items-center gap-5 text-center">
        {children}
      </div>
      {stickers.slice(0, SPOTS.length).map((s, i) => {
        const spot = SPOTS[i];
        if (!spot) return null;
        return (
          <motion.span
            key={s}
            drag={!reduce}
            dragConstraints={area}
            dragElastic={0.25}
            whileDrag={{ scale: 1.12, rotate: 0, cursor: "grabbing" }}
            initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: spot.rotate + 35 }}
            whileInView={{ scale: 1, opacity: 1, rotate: spot.rotate }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ type: "spring", stiffness: 520, damping: 17, delay: 0.15 + i * 0.12 }}
            className={cn(
              "absolute z-20 cursor-grab touch-none rounded-2xl border-4 border-background px-4 py-2 font-script text-xl whitespace-nowrap shadow-[0_10px_24px_-10px_oklch(0_0_0/0.45)] select-none sm:text-2xl",
              spot.className,
              spot.tone,
            )}
          >
            {s}
          </motion.span>
        );
      })}
      {mascot ? (
        <motion.div
          aria-hidden="true"
          initial={reduce ? false : { y: 80, rotate: -10, opacity: 0 }}
          whileInView={{ y: 0, rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.6 }}
          className="pointer-events-none absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 max-sm:hidden"
        >
          {mascot}
        </motion.div>
      ) : null}
    </div>
  );
}
