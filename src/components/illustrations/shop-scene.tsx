import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The shop header's scene: a delivery box with a cat that pops up out of it,
 * looks left and right and blinks, a dog peeking round the side, and a bone,
 * a fish and a yarn ball floating about. Same flat-pastel + ink style as
 * the peeking pets (pets.tsx). Decorative; reduced motion keeps it still.
 */
const INK = "#141414";
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const d = (i: number) => ({ "--i": i }) as CSSProperties;

export function ShopScene({ className }: { className?: string }) {
  const clip = `shop-scene-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 320 260" aria-hidden="true" className={cn("h-auto w-full select-none", className)}>
      <defs>
        <clipPath id={clip}>
          <rect width="320" height="166" />
        </clipPath>
      </defs>
      {/* backdrop blob + dots */}
      <path
        d="M58 70c30-44 128-58 190-26 52 27 64 96 38 142-26 48-104 62-170 46C46 216 10 168 22 124c6-22 20-38 36-54Z"
        className="fill-card/70"
      />
      {[
        [40, 40],
        [282, 60],
        [300, 200],
        [24, 210],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" className="twinkle fill-primary/50" style={d(i)} />
      ))}

      {/* floating bits */}
      <g className="float" style={d(0)}>
        <g transform="translate(36 92) rotate(-20)">
          <path
            d="M10 6a7 7 0 1 1 9 9l22 0a7 7 0 1 1 9-9 7 7 0 1 1-9 9H19a7 7 0 1 1-9-9Z"
            fill="#fff6ec"
            {...S}
            strokeWidth={2.5}
          />
        </g>
      </g>
      <g className="float" style={d(1)}>
        <g transform="translate(246 96) rotate(14)">
          <path d="M2 16C12 2 34 2 44 16 34 30 12 30 2 16Z" fill="#9fcbe8" {...S} strokeWidth={2.5} />
          <path d="M44 16l12-10v20Z" fill="#9fcbe8" {...S} strokeWidth={2.5} />
          <circle cx="14" cy="14" r="2.4" fill={INK} />
        </g>
      </g>
      <g className="float" style={d(2)}>
        <g transform="translate(262 178)">
          <circle cx="16" cy="16" r="15" fill="#f2a6c6" {...S} strokeWidth={2.5} />
          <path d="M4 10c8 2 16 8 22 18M8 26c4-8 10-14 20-16" fill="none" {...S} strokeWidth={2} />
        </g>
      </g>

      {/* dog peeking round the box's right side */}
      <g className="scene-peek-side">
        <path d="M214 150c18-6 34 6 34 24s-14 28-30 26Z" fill="#f6a37c" {...S} />
        <path d="M238 152c10-6 20 0 20 10-8 2-14 0-20-6Z" fill="#c98a5e" {...S} strokeWidth={2.5} />
        <circle cx="232" cy="170" r="3.6" fill={INK} className="pet-eyes" />
        <ellipse cx="246" cy="184" rx="5" ry="4" fill={INK} />
      </g>

      {/* the cat, rising out of the box (drawn before the box front so it sits inside) */}
      <g clipPath={`url(#${clip})`}>
        <g className="scene-pop">
          <g className="scene-look">
            <path d="M118 104 124 70l22 22Z" fill="#f5d26a" {...S} className="pet-ear-l" />
            <path d="M202 104 196 70l-22 22Z" fill="#f5d26a" {...S} className="pet-ear-r" />
            <ellipse cx="160" cy="122" rx="46" ry="36" fill="#f5d26a" {...S} />
            <path
              d="M146 92c3 5 3 10 0 14M160 89v15M174 92c-3 5-3 10 0 14"
              fill="none"
              {...S}
              strokeWidth={2.5}
              opacity="0.3"
            />
            <g className="pet-eyes">
              <ellipse cx="143" cy="120" rx="5" ry="6.5" fill={INK} />
              <ellipse cx="177" cy="120" rx="5" ry="6.5" fill={INK} />
              <circle cx="145" cy="117.5" r="1.7" fill="#fff" />
              <circle cx="179" cy="117.5" r="1.7" fill="#fff" />
            </g>
            <path d="M156 131h8l-4 4.5Z" fill="#f2a6c6" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <path d="M160 135.5c-1 5-6 6-10 4M160 135.5c1 5 6 6 10 4" fill="none" {...S} strokeWidth={2.5} />
            <path
              d="M112 124l18 2M112 134l18-1M208 124l-18 2M208 134l-18-1"
              fill="none"
              {...S}
              strokeWidth={2}
            />
          </g>
          <ellipse cx="132" cy="158" rx="15" ry="9" fill="#f5d26a" {...S} />
          <ellipse cx="188" cy="158" rx="15" ry="9" fill="#f5d26a" {...S} />
        </g>
      </g>

      {/* the box */}
      <path d="M84 160h152l-12 76H96Z" fill="#e4cdb0" {...S} />
      <path d="M84 160l-22-26 96-4 2 30M236 160l22-26-96-4" fill="#d7b994" {...S} />
      <path d="M118 196h84" fill="none" {...S} strokeWidth={2.5} opacity="0.45" />
      {/* paw stamp on the box */}
      <g transform="translate(144 204)" className="fill-primary">
        <ellipse cx="16" cy="18" rx="9" ry="7" />
        <circle cx="5" cy="8" r="3.2" />
        <circle cx="12" cy="3" r="3.2" />
        <circle cx="20" cy="3" r="3.2" />
        <circle cx="27" cy="8" r="3.2" />
      </g>
    </svg>
  );
}
