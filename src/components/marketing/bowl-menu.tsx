"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface BowlItem {
  key: string;
  label: string;
  href: Route;
  active: boolean;
}

const LEVELS = [0.82, 0.58, 0.7, 0.46, 0.64, 0.52, 0.76, 0.6];
const TONES = [
  "var(--band-dog)",
  "var(--band-cat)",
  "var(--band-bird)",
  "var(--band-rabbit)",
  "var(--band-cow)",
  "var(--band-chicken)",
  "var(--band-goat)",
  "var(--band-care)",
];

/**
 * The shop's category menu: pointing at (or focusing) a category pours kibble
 * into the bowl, which fills to that category's level in its colour. The
 * links are ordinary links; the bowl is decoration.
 */
export function BowlMenu({ items, label }: { items: readonly BowlItem[]; label: string }) {
  const reduce = useReducedMotion();
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.active),
  );
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? activeIndex;
  const level = LEVELS[shown % LEVELS.length] ?? 0.6;
  const tone = TONES[shown % TONES.length] ?? "var(--band-care)";
  // Bowl interior spans y 52 → 92 in the SVG.
  const fillY = 92 - 40 * level;

  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_15rem]">
      <nav aria-label={label} onPointerLeave={() => setHover(null)}>
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium shadow-(--shadow-control) transition-[transform,background-color,color] duration-(--motion-fast) ease-spring hover:-translate-y-0.5 active:scale-95",
                  item.active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-card/70",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div aria-hidden="true" className="relative mx-auto w-48 max-md:hidden md:w-full">
        <svg viewBox="0 0 120 100" className="w-full overflow-visible">
          <defs>
            <clipPath id="bowl-inside">
              <path d="M14 52h92c0 22-20 40-46 40S14 74 14 52Z" />
            </clipPath>
          </defs>
          {/* Falling kibble, replayed for every new category. */}
          <AnimatePresence>
            {reduce
              ? null
              : [0, 1, 2, 3, 4, 5].map((k) => (
                  <motion.ellipse
                    key={`${shown}-${k}`}
                    cx={46 + ((k * 7) % 28)}
                    rx={3.2}
                    ry={2.4}
                    fill={tone}
                    stroke="currentColor"
                    strokeOpacity={0.25}
                    initial={{ cy: -10 - k * 9, opacity: 1, rotate: 0 }}
                    animate={{ cy: fillY + 2, opacity: [1, 1, 0], rotate: 160 }}
                    transition={{ duration: 0.7 + k * 0.05, ease: [0.5, 0, 0.75, 0], delay: k * 0.05 }}
                  />
                ))}
          </AnimatePresence>
          <g clipPath="url(#bowl-inside)">
            <motion.rect
              x="0"
              width="120"
              height="60"
              initial={false}
              animate={{ y: fillY, fill: tone }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 14 }}
            />
            {/* Kibble texture on top of the fill. */}
            <motion.g
              initial={false}
              animate={{ y: fillY - 52 }}
              transition={{ type: "spring", stiffness: 90, damping: 14 }}
            >
              {[22, 34, 46, 58, 70, 82, 94].map((x, i) => (
                <ellipse
                  key={x}
                  cx={x}
                  cy={54 + (i % 2) * 2}
                  rx="4"
                  ry="2.6"
                  className="fill-foreground/10"
                />
              ))}
            </motion.g>
          </g>
          <path
            d="M10 52h100c0 25-22 44-50 44S10 77 10 52Z"
            className="fill-none stroke-foreground"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M10 52h100" className="stroke-foreground" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="60" cy="98" rx="30" ry="2" className="fill-foreground/15" />
        </svg>
      </div>
    </div>
  );
}
