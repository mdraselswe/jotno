import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Spot illustrations: one flat style for the whole app. A soft teal backdrop,
 * objects in the card colour with a dark outline, teal and amber accents.
 * Theme tokens only, so they follow light and dark mode. Decorative (aria-hidden).
 */
export type SpotName =
  "search" | "chat" | "care" | "shop" | "empty" | "question" | "vet" | "emergency" | "welcome";

const LINE = "stroke-foreground/80";
const OBJ = `fill-card ${LINE}`;
const SOFT = "fill-none stroke-foreground/20";

const ART: Record<SpotName, ReactNode> = {
  search: (
    <>
      <rect x="32" y="30" width="80" height="62" rx="12" className={OBJ} />
      <path d="M32 66c18-10 34 10 50 0s22-8 30-4" className={SOFT} strokeDasharray="3 6" />
      <path d="M44 44h22M44 52h14" className={SOFT} strokeWidth="4" />
      <path
        d="M76 22c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16Z"
        className={`fill-primary ${LINE}`}
      />
      <circle cx="76" cy="38" r="5.5" className="fill-card" />
      <circle cx="114" cy="80" r="15" className={OBJ} />
      <path d="M106 75a9 9 0 0 1 8-5" className={SOFT} strokeWidth="3" />
      <path d="M125 91l11 11" className={LINE} strokeWidth="7" />
      <circle cx="40" cy="22" r="4" className="float fill-highlight" />
    </>
  ),
  chat: (
    <>
      <path
        d="M44 26h50a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H60L46 84V72a14 14 0 0 1-14-14V40a14 14 0 0 1 12-14Z"
        className={OBJ}
      />
      <path d="M48 42h40M48 54h26" className={SOFT} strokeWidth="4" />
      <path
        d="M90 60h32a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12h-2v10l-12-10H90a12 12 0 0 1-12-12V72a12 12 0 0 1 12-12Z"
        className={`fill-primary ${LINE}`}
      />
      <path
        d="M106 88s-8-5-8-10.5a4.2 4.2 0 0 1 8-1.8 4.2 4.2 0 0 1 8 1.8C114 83 106 88 106 88Z"
        className="fill-highlight"
      />
      <circle cx="132" cy="40" r="4" className="float fill-highlight" />
    </>
  ),
  care: (
    <>
      <path d="M80 100S42 79 42 53a19 19 0 0 1 38-6 19 19 0 0 1 38 6c0 26-38 47-38 47Z" className={OBJ} />
      <path d="M48 62h17l7-13 11 25 7-12h22" className="fill-none stroke-primary" strokeWidth="4.5" />
      <circle cx="120" cy="30" r="13" className={`fill-highlight ${LINE}`} />
      <path d="M120 24v12M114 30h12" className={LINE} strokeWidth="3" />
      <circle cx="38" cy="30" r="3.5" className="float fill-primary" />
    </>
  ),
  shop: (
    <>
      <path d="M62 46v-6a18 18 0 0 1 36 0v6" className={`fill-none ${LINE}`} strokeWidth="3.5" />
      <rect x="42" y="44" width="76" height="58" rx="12" className={OBJ} />
      <path
        d="M65 69.5a5 5 0 1 1 5.5-6.5h19a5 5 0 1 1 5.5 6.5 5 5 0 1 1-5.5 6.5h-19a5 5 0 1 1-5.5-6.5Z"
        className={`fill-primary ${LINE}`}
        strokeWidth="2"
      />
      <circle cx="118" cy="44" r="9" className={`fill-highlight ${LINE}`} />
      <circle cx="118" cy="44" r="2.5" className="fill-card" />
      <circle cx="36" cy="34" r="3.5" className="float fill-primary" />
    </>
  ),
  empty: (
    <>
      <path d="M44 60 80 46l36 14-36 14Z" className="fill-muted stroke-foreground/80" />
      <path d="M44 60v32l36 14V74Z" className={OBJ} />
      <path d="M116 60v32l-36 14V74Z" className={OBJ} />
      <path d="M44 60 32 74l36 14 12-14ZM116 60l12 14-36 14-12-14Z" className={OBJ} />
      <circle cx="80" cy="28" r="6" className="float fill-highlight" />
      <circle cx="100" cy="20" r="3" className="fill-primary" />
      <circle cx="62" cy="18" r="2.5" className="fill-primary/60" />
    </>
  ),
  question: (
    <>
      <path
        d="M80 20c25 0 42 15 42 35S105 90 80 90c-6 0-11-1-16-3l-18 9 5-16c-8-7-13-16-13-25 0-20 17-35 42-35Z"
        className={OBJ}
      />
      <path
        d="M69 46a11 11 0 1 1 15 10c-3 2-4 4-4 7"
        className="fill-none stroke-primary"
        strokeWidth="6.5"
      />
      <circle cx="80" cy="74" r="4" className="fill-primary" />
      <circle cx="128" cy="28" r="6" className="float fill-highlight" />
      <circle cx="34" cy="30" r="3" className="fill-primary/60" />
    </>
  ),
  vet: (
    <>
      <rect x="48" y="26" width="62" height="78" rx="12" className={OBJ} />
      <rect x="65" y="19" width="28" height="13" rx="5" className={`fill-primary ${LINE}`} />
      <path d="M60 52h36M60 64h26M60 76h32" className={SOFT} strokeWidth="4" />
      <circle cx="110" cy="90" r="15" className={`fill-primary ${LINE}`} />
      <path d="m103 90 5 5 9-10" className="fill-none stroke-primary-foreground" strokeWidth="3.5" />
      <circle cx="40" cy="38" r="3.5" className="float fill-highlight" />
    </>
  ),
  emergency: (
    <>
      <path
        d="M66 44v-7a7 7 0 0 1 7-7h14a7 7 0 0 1 7 7v7"
        className={`fill-none ${LINE}`}
        strokeWidth="3.5"
      />
      <rect x="40" y="42" width="80" height="58" rx="12" className={OBJ} />
      <path d="M80 56v30M65 71h30" className="stroke-destructive" strokeWidth="9" />
      <path d="M128 36l8-6M130 50h10M32 36l-8-6M30 50H20" className="stroke-highlight" strokeWidth="4" />
    </>
  ),
  welcome: (
    <>
      <path d="M80 18l38 13v26c0 24-17 39-38 45-21-6-38-21-38-45V31Z" className={OBJ} />
      <path
        d="M80 78s-17-9.5-17-21a8.5 8.5 0 0 1 17-3 8.5 8.5 0 0 1 17 3c0 11.5-17 21-17 21Z"
        className="fill-primary"
      />
      <circle cx="126" cy="28" r="4.5" className="float fill-highlight" />
      <circle cx="34" cy="74" r="3" className="fill-primary/60" />
    </>
  ),
};

/** A spot illustration (160×120). Size it with a width class, e.g. "w-40". */
export function Spot({ name, className }: { name: SpotName; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      fill="none"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-auto w-40 shrink-0", className)}
    >
      <ellipse cx="80" cy="64" rx="66" ry="50" className="fill-primary/8" />
      {ART[name]}
    </svg>
  );
}
