import { cn } from "@/lib/utils";

/**
 * Mishu, Jotno's cat. Hand-drawn SVG, every part its own group so CSS can
 * move it (keyframes `mishu-*` in globals.css). Moods:
 *
 * - idle: tail sways, blinks, breathes
 * - listening: ears up, eyes wide, head tilts (someone is typing a question)
 * - happy: smiling eyes, little hop, quick tail (payment done, booked)
 * - worried: ears back, brows up, still (emergency, errors; calm, not scary)
 * - sleeping: eyes shut, Zzz, slow breath (offline, empty at night)
 *
 * Reduced motion: every animation is `motion-safe:` so Mishu stays still.
 * Decorative by default; pass `label` when the mood carries meaning.
 */
export type MishuMood = "idle" | "listening" | "happy" | "worried" | "sleeping";

export function Mishu({
  mood = "idle",
  className,
  label,
}: {
  mood?: MishuMood;
  className?: string;
  label?: string;
}) {
  const eyesOpen = mood === "idle" || mood === "listening" || mood === "worried";
  return (
    <svg
      viewBox="0 0 120 120"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-mood={mood}
      className={cn("size-32 overflow-visible text-foreground", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Shadow */}
      <ellipse cx="60" cy="112" rx="30" ry="3.5" className="fill-foreground/8" stroke="none" />

      <g
        className={cn(
          "origin-[60px_112px]",
          mood === "happy" && "motion-safe:animate-[mishu-hop_900ms_var(--ease-spring,ease)_infinite]",
          (mood === "idle" || mood === "sleeping") &&
            "motion-safe:animate-[mishu-breathe_3.6s_ease-in-out_infinite]",
          mood === "sleeping" && "[animation-duration:5s]",
        )}
      >
        {/* Tail */}
        <path
          d="M84 98c14 2 22-6 20-17-1.5-8-9-9-11-3"
          strokeWidth={6}
          className={cn(
            "origin-[84px_98px] stroke-highlight",
            mood === "idle" && "motion-safe:animate-[mishu-tail_2.4s_ease-in-out_infinite]",
            mood === "happy" && "motion-safe:animate-[mishu-tail_700ms_ease-in-out_infinite]",
          )}
        />

        {/* Body */}
        <path d="M38 108c-6-16-4-34 8-44h28c12 10 14 28 8 44Z" className="fill-card" />
        <path d="M50 108v-8M70 108v-8" />
        {/* Belly patch */}
        <path d="M52 92c2-8 14-8 16 0" className="stroke-highlight/70" />

        {/* Head */}
        <g
          className={cn(
            "origin-[60px_62px] transition-transform duration-(--motion-slow) ease-spring",
            mood === "listening" && "-rotate-8",
            mood === "worried" && "translate-y-0.5",
          )}
        >
          {/* Ears */}
          <g
            className={cn(
              "origin-[40px_34px] transition-transform duration-(--motion-base) ease-spring",
              mood === "listening" && "-translate-y-1.5 -rotate-6",
              mood === "worried" && "translate-y-1 -rotate-[22deg]",
              mood === "idle" && "motion-safe:animate-[mishu-ear_5s_ease-in-out_infinite]",
            )}
          >
            <path d="M33 40 36 16l16 14" className="fill-card" />
            <path d="M38 27l1.5-5 5.5 5" className="stroke-highlight" />
          </g>
          <g
            className={cn(
              "origin-[80px_34px] transition-transform duration-(--motion-base) ease-spring",
              mood === "listening" && "-translate-y-1.5 rotate-6",
              mood === "worried" && "translate-y-1 rotate-[22deg]",
            )}
          >
            <path d="M87 40 84 16 68 30" className="fill-card" />
            <path d="M82 27l-1.5-5-5.5 5" className="stroke-highlight" />
          </g>
          <ellipse cx="60" cy="48" rx="28" ry="23" className="fill-card" />

          {/* Eyes */}
          {eyesOpen ? (
            <g
              className={cn(
                "origin-[60px_46px]",
                mood === "idle" && "motion-safe:animate-[mishu-blink_4.5s_ease-in-out_infinite]",
              )}
            >
              <ellipse
                cx="49"
                cy="46"
                rx={mood === "listening" ? 3.6 : mood === "worried" ? 2.4 : 3}
                ry={mood === "listening" ? 4.4 : mood === "worried" ? 2.8 : 3.8}
                className="fill-foreground"
                stroke="none"
              />
              <ellipse
                cx="71"
                cy="46"
                rx={mood === "listening" ? 3.6 : mood === "worried" ? 2.4 : 3}
                ry={mood === "listening" ? 4.4 : mood === "worried" ? 2.8 : 3.8}
                className="fill-foreground"
                stroke="none"
              />
              {mood !== "worried" ? (
                <>
                  <circle cx="50.2" cy="44.6" r="1.1" className="fill-card" stroke="none" />
                  <circle cx="72.2" cy="44.6" r="1.1" className="fill-card" stroke="none" />
                </>
              ) : null}
            </g>
          ) : mood === "happy" ? (
            <>
              <path d="M45 47q4-5 8 0" />
              <path d="M67 47q4-5 8 0" />
            </>
          ) : (
            <>
              <path d="M45 46q4 3 8 0" />
              <path d="M67 46q4 3 8 0" />
            </>
          )}

          {/* Brows when worried */}
          {mood === "worried" ? (
            <>
              <path d="M44 38l8-2" />
              <path d="M76 38l-8-2" />
            </>
          ) : null}

          {/* Cheeks */}
          <ellipse cx="42" cy="55" rx="4" ry="2.4" className="fill-highlight/45" stroke="none" />
          <ellipse cx="78" cy="55" rx="4" ry="2.4" className="fill-highlight/45" stroke="none" />

          {/* Nose and mouth */}
          <path d="M58 52h4l-2 2.4Z" className="fill-highlight stroke-highlight" strokeWidth={1.4} />
          {mood === "worried" ? (
            <path d="M55 60q5-3 10 0" />
          ) : (
            <path d={mood === "happy" ? "M54 57q3 5 6 0q3 5 6 0" : "M55 57q2.5 3 5 0q2.5 3 5 0"} />
          )}
          {/* Whiskers */}
          <path d="M34 50l-9-2M34 54l-9 1M86 50l9-2M86 54l9 1" strokeWidth={1.4} className="opacity-60" />
        </g>

        {/* Collar with the Jotno heart tag */}
        <path d="M44 69q16 7 32 0" strokeWidth={4} className="stroke-primary" />
        <path
          d="M60 80c-3.8-2.5-6-4.6-5.4-7 .5-2 3.2-2.7 5.4-.6 2.2-2.1 4.9-1.4 5.4.6.6 2.4-1.6 4.5-5.4 7Z"
          className="fill-highlight stroke-highlight"
          strokeWidth={1.2}
        />
      </g>

      {mood === "sleeping" ? (
        <g className="fill-none stroke-muted-foreground" strokeWidth={1.8}>
          <path
            d="M92 22h7l-7 8h7"
            className="[animation-delay:0.8s] motion-safe:animate-[mishu-zzz_3s_ease-in-out_infinite]"
          />
          <path d="M101 8h5l-5 6h5" className="motion-safe:animate-[mishu-zzz_3s_ease-in-out_infinite]" />
        </g>
      ) : null}
      {mood === "happy" ? (
        <g
          className="stroke-highlight motion-safe:animate-[mishu-sparkle_1.2s_ease-out_infinite]"
          strokeWidth={2}
        >
          <path d="M18 30v8M14 34h8" />
          <path d="M100 26v6M97 29h6" />
        </g>
      ) : null}
    </svg>
  );
}
