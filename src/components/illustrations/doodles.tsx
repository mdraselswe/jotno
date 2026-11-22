import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-drawn hairline doodles (cat, dog, bone, paw, fish, bird, heart, ball)
 * for the footer and empty corners. currentColor strokes; `pathLength` lets
 * the `draw` utility sketch them in.
 */
export type DoodleName = "cat" | "dog" | "bone" | "paw" | "fish" | "bird" | "heart" | "ball";

const PATHS: Record<DoodleName, readonly string[]> = {
  cat: [
    "M14 30c-2-8 0-17 3-22l7 8c4-1 12-1 16 0l7-8c3 5 5 14 3 22 3 4 4 8 3 12-2 10-12 16-21 16S13 52 11 42c-1-4 0-8 3-12Z",
    "M24 34h.01M40 34h.01",
    "M29 41c2 2 4 2 6 0M32 39v2",
    "M8 38l10 1M8 44l10-1M56 38l-10 1M56 44l-10-1",
  ],
  dog: [
    "M18 18c4-5 9-7 14-7s10 2 14 7c4 5 5 13 3 21-2 10-9 16-17 16s-15-6-17-16c-2-8-1-16 3-21Z",
    "M18 18c-6-1-10 4-9 12 1 6 4 9 7 10M46 18c6-1 10 4 9 12-1 6-4 9-7 10",
    "M25 31h.01M39 31h.01",
    "M28 40c2-2 6-2 8 0-1 3-3 4-4 4s-3-1-4-4Z",
    "M32 44v4M28 50c2 1 6 1 8 0",
  ],
  bone: [
    "M16 22c-5-4-12 2-8 7-5 3-2 11 4 9l20 0c6 2 9-6 4-9 4-5-3-11-8-7",
    "M16 22c2 4 2 10 0 16M36 22c-2 4-2 10 0 16",
  ],
  paw: [
    "M22 40c0-6 5-10 10-10s10 4 10 10c0 5-4 7-10 7s-10-2-10-7Z",
    "M18 28a4 5 0 1 0 0.01 0M28 21a4 5 0 1 0 .01 0M38 21a4 5 0 1 0 .01 0M47 28a4 5 0 1 0 .01 0",
  ],
  fish: ["M10 32c8-10 22-14 34-6l10-8v28l-10-8c-12 8-26 4-34-6Z", "M20 30h.01M30 26c2 4 2 8 0 12"],
  bird: [
    "M14 36c0-10 8-18 18-18 6 0 10 3 12 7l8-2-5 6c1 9-6 17-16 17-6 0-11-3-14-6l-8 4 5-8Z",
    "M38 26h.01M24 36c4 2 9 2 13-2",
  ],
  heart: ["M32 50S12 38 12 25c0-6 5-11 11-11 4 0 7 2 9 6 2-4 5-6 9-6 6 0 11 5 11 11 0 13-20 25-20 25Z"],
  ball: ["M32 12a20 20 0 1 0 .01 0Z", "M14 26c8 4 28 4 36 0M14 38c8-4 28-4 36 0M32 12c-6 6-6 34 0 40"],
};

export function Doodle({
  name,
  className,
  style,
}: {
  name: DoodleName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-12", className)}
      style={style}
    >
      {PATHS[name].map((d, i) => (
        <path key={d} d={d} pathLength={1} style={{ "--i": i } as CSSProperties} />
      ))}
    </svg>
  );
}
