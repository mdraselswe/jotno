import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Peeking pets: flat pastel animals with an ink outline (the doodle-footer
 * reference) that peek over an edge, look around, blink and duck back down,
 * on a loop. Put one inside a `relative` box; it sits on that box's top edge
 * (or bottom edge with `edge="bottom"`) and is clipped so it rises from behind.
 * Decorative (aria-hidden); reduced motion shows it peeking, still.
 */
export type PetKind = "cat" | "dog" | "bird";

const INK = "#141414";
// Fixed pastel fills (the references): the pets read the same on light and dark sections.
const CAT = "#f5d26a";
const DOG = "#f6a37c";
const BIRD = "#bcd98e";
const STROKE = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function Cat() {
  return (
    <>
      <g className="pet-ear-l">
        <path d="M30 46 37 12l20 22Z" fill={CAT} {...STROKE} />
        <path d="M36 36 39 22l9 10Z" fill="#f2a6c6" />
      </g>
      <g className="pet-ear-r">
        <path d="M90 46 83 12 63 34Z" fill={CAT} {...STROKE} />
        <path d="M84 36 81 22l-9 10Z" fill="#f2a6c6" />
      </g>
      <ellipse cx="60" cy="60" rx="35" ry="29" fill={CAT} {...STROKE} />
      <path
        d="M48 36c3 5 3 9 0 13M60 33v14M72 36c-3 5-3 9 0 13"
        fill="none"
        {...STROKE}
        strokeWidth={2.5}
        opacity="0.35"
      />
      <g className="pet-eyes">
        <ellipse cx="47" cy="60" rx="4.2" ry="5.5" fill={INK} />
        <ellipse cx="73" cy="60" rx="4.2" ry="5.5" fill={INK} />
        <circle cx="48.5" cy="58" r="1.4" fill="#fff" />
        <circle cx="74.5" cy="58" r="1.4" fill="#fff" />
      </g>
      <path d="M57 68h6l-3 3.5Z" fill="#f2a6c6" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 71.5c-1 4-5 5-8 3M60 71.5c1 4 5 5 8 3" fill="none" {...STROKE} strokeWidth={2.5} />
      <path d="M22 62l14 2M22 70l14-1M98 62l-14 2M98 70l-14-1" fill="none" {...STROKE} strokeWidth={2} />
      <ellipse cx="38" cy="97" rx="13" ry="8" fill={CAT} {...STROKE} />
      <ellipse cx="82" cy="97" rx="13" ry="8" fill={CAT} {...STROKE} />
    </>
  );
}

function Dog() {
  return (
    <>
      <g className="pet-ear-l">
        <path d="M34 36C16 36 10 62 20 80c10-2 16-18 18-34Z" fill="#c98a5e" {...STROKE} />
      </g>
      <g className="pet-ear-r">
        <path d="M86 36c18 0 24 26 14 44-10-2-16-18-18-34Z" fill="#c98a5e" {...STROKE} />
      </g>
      <path d="M28 58c0-20 14-32 32-32s32 12 32 32-14 32-32 32-32-12-32-32Z" fill={DOG} {...STROKE} />
      <path d="M66 40c8-3 16 2 17 11-6 4-14 3-18-3Z" fill="#c98a5e" />
      <g className="pet-eyes">
        <ellipse cx="47" cy="56" rx="4.2" ry="5" fill={INK} />
        <ellipse cx="73" cy="56" rx="4.2" ry="5" fill={INK} />
        <circle cx="48.4" cy="54.4" r="1.4" fill="#fff" />
        <circle cx="74.4" cy="54.4" r="1.4" fill="#fff" />
      </g>
      <ellipse cx="60" cy="74" rx="15" ry="11" fill="#fff6ec" {...STROKE} strokeWidth={2.5} />
      <ellipse cx="60" cy="68.5" rx="5.5" ry="4" fill={INK} />
      <path d="M60 72.5v4c-2 3-6 3-8 1M60 76.5c2 3 6 3 8 1" fill="none" {...STROKE} strokeWidth={2.5} />
      <path
        className="pet-tongue"
        d="M56 80c0 7 8 7 8 0Z"
        fill="#f2a6c6"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="37" cy="97" rx="13" ry="8" fill={DOG} {...STROKE} />
      <ellipse cx="83" cy="97" rx="13" ry="8" fill={DOG} {...STROKE} />
    </>
  );
}

function Bird() {
  return (
    <>
      <path
        className="pet-ear-l"
        d="M58 30c-2-10 4-16 10-16-1 6-3 10-6 14Z"
        fill="#f6a37c"
        {...STROKE}
        strokeWidth={2.5}
      />
      <path d="M30 70c0-24 13-40 30-40s30 16 30 40c0 14-13 24-30 24S30 84 30 70Z" fill={BIRD} {...STROKE} />
      <path
        d="M40 74c6 8 14 10 20 10s14-2 20-10"
        fill="#fff6ec"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g className="pet-eyes">
        <ellipse cx="49" cy="56" rx="4" ry="5" fill={INK} />
        <ellipse cx="71" cy="56" rx="4" ry="5" fill={INK} />
        <circle cx="50.4" cy="54.4" r="1.3" fill="#fff" />
        <circle cx="72.4" cy="54.4" r="1.3" fill="#fff" />
      </g>
      <path d="M54 64h12l-6 9Z" fill="#f5d26a" {...STROKE} strokeWidth={2.5} />
      <path d="M44 96l-4 4M48 96v5M72 96v5M76 96l4 4" fill="none" {...STROKE} strokeWidth={2.5} />
    </>
  );
}

const ART: Record<PetKind, () => React.JSX.Element> = { cat: Cat, dog: Dog, bird: Bird };

/** One peeking pet. `delay` (s) staggers several on a page; `edge` picks the edge it peeks over. */
export function PeekingPet({
  kind,
  className,
  delay = 0,
  edge = "top",
}: {
  kind: PetKind;
  className?: string;
  delay?: number;
  edge?: "top" | "bottom";
}) {
  const Art = ART[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 block h-20 w-24 overflow-hidden select-none sm:h-24 sm:w-28",
        edge === "top" ? "bottom-full" : "top-full rotate-180",
        className,
      )}
    >
      <svg
        viewBox="0 0 120 100"
        className="pet-peek absolute inset-x-0 bottom-0 h-full w-full"
        style={{ "--pet-delay": `${delay}s` } as CSSProperties}
      >
        <Art />
      </svg>
    </span>
  );
}

/** A yarn ball that rolls back and forth along an edge (pair it with a pet). */
export function RollingBall({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute block size-9", className)}>
      <svg viewBox="0 0 40 40" className="pet-roll size-full">
        <circle cx="20" cy="20" r="17" fill="#f2a6c6" {...STROKE} />
        <path
          d="M6 14c10 2 20 10 26 22M10 30c4-10 12-18 24-20M20 3c-6 10-6 24 2 34"
          fill="none"
          {...STROKE}
          strokeWidth={2}
        />
      </svg>
    </span>
  );
}
