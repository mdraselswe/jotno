import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Hero scenes for the two onboarding pages, in the peeking-pets style
 * (flat pastels, ink outline). No words inside the art, so one drawing
 * serves every language. Decorative; reduced motion keeps them still.
 *   OwnerScene: a phone where a chat with a vet plays out, a cat watching
 *               over its edge, a reminder card and a heart floating.
 *   VetScene:   a verified vet card, "new chat" chips sliding in, coins
 *               stacking up, and a dog looking up at it all.
 */
const INK = "#141414";
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const i = (n: number) => ({ "--i": n }) as CSSProperties;

function Backdrop() {
  return (
    <>
      <path
        d="M70 52c46-34 150-40 206 6 50 41 46 132-4 172-52 42-150 44-204 6C14 198 4 120 30 86c10-13 24-24 40-34Z"
        className="fill-card/70"
      />
      {[
        [34, 50],
        [300, 40],
        [318, 210],
        [20, 230],
      ].map(([x, y], n) => (
        <circle key={n} cx={x} cy={y} r="4" className="twinkle fill-primary/50" style={i(n)} />
      ))}
    </>
  );
}

export function OwnerScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 280" aria-hidden="true" className={cn("h-auto w-full select-none", className)}>
      <Backdrop />
      {/* phone */}
      <g className="float" style={{ ...i(0), "--float-duration": "8s" } as CSSProperties}>
        <rect x="104" y="30" width="132" height="226" rx="22" fill="#fff" {...S} />
        <rect x="150" y="40" width="40" height="7" rx="3.5" fill={INK} />
        {/* vet header */}
        <circle cx="130" cy="70" r="12" fill="#9fcbe8" {...S} strokeWidth={2.5} />
        <path d="M124 70c0 5 4 8 6 8s6-3 6-8" fill="none" {...S} strokeWidth={2} />
        <rect x="148" y="62" width="50" height="6" rx="3" fill={INK} opacity="0.75" />
        <rect x="148" y="73" width="32" height="5" rx="2.5" fill={INK} opacity="0.3" />
        <circle cx="206" cy="65" r="6" className="fill-primary" />
        <path
          d="M203 65l2 2 4-4"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M116 90h108" stroke={INK} strokeWidth="2" opacity="0.12" />
        {/* chat bubbles, appearing one by one */}
        <g className="chat-pop" style={i(0)}>
          <rect x="146" y="102" width="78" height="30" rx="12" className="fill-primary" />
          <rect x="156" y="111" width="54" height="5" rx="2.5" fill="#fff" />
          <rect x="156" y="120" width="34" height="5" rx="2.5" fill="#fff" opacity="0.8" />
        </g>
        <g className="chat-pop" style={i(1)}>
          <rect x="116" y="140" width="70" height="44" rx="12" fill="#f5d26a" {...S} strokeWidth={2} />
          <path d="M126 170l10-12 8 8 6-6 10 10Z" fill="#f6a37c" />
          <circle cx="132" cy="152" r="4" fill="#fff" />
        </g>
        <g className="chat-pop" style={i(2)}>
          <rect x="116" y="192" width="86" height="30" rx="12" fill="#eef0f6" />
          <rect x="126" y="201" width="62" height="5" rx="2.5" fill={INK} opacity="0.55" />
          <rect x="126" y="210" width="40" height="5" rx="2.5" fill={INK} opacity="0.3" />
        </g>
        <g className="chat-pop typing" style={i(3)}>
          <rect x="116" y="228" width="44" height="18" rx="9" fill="#eef0f6" />
          {[128, 138, 148].map((cx, n) => (
            <circle
              key={cx}
              cx={cx}
              cy="237"
              r="2.6"
              fill={INK}
              opacity="0.5"
              className="dot-bounce"
              style={i(n)}
            />
          ))}
        </g>
      </g>

      {/* cat watching over the phone's left edge */}
      <g className="peek-side-l">
        <path d="M70 168 74 140l18 16Z" fill="#f5d26a" {...S} className="pet-ear-l" />
        <path d="M112 162 104 136 90 154Z" fill="#f5d26a" {...S} className="pet-ear-r" />
        <ellipse cx="90" cy="178" rx="28" ry="24" fill="#f5d26a" {...S} />
        <g className="pet-eyes">
          <ellipse cx="81" cy="176" rx="3.6" ry="4.6" fill={INK} />
          <ellipse cx="100" cy="176" rx="3.6" ry="4.6" fill={INK} />
        </g>
        <path d="M88 185h5l-2.5 3Z" fill="#f2a6c6" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="108" cy="198" rx="10" ry="7" fill="#f5d26a" {...S} />
      </g>

      {/* reminder card */}
      <g className="float" style={i(2)}>
        <rect x="236" y="70" width="84" height="52" rx="14" fill="#fff" {...S} strokeWidth={2.5} />
        <rect x="246" y="80" width="22" height="22" rx="6" fill="#bcd98e" {...S} strokeWidth={2} />
        <path d="M252 91l4 4 7-8" fill="none" {...S} strokeWidth={2.4} />
        <rect x="274" y="84" width="36" height="5" rx="2.5" fill={INK} opacity="0.7" />
        <rect x="274" y="94" width="24" height="5" rx="2.5" fill={INK} opacity="0.3" />
        <rect x="246" y="108" width="64" height="5" rx="2.5" className="fill-primary" opacity="0.5" />
      </g>
      {/* heart */}
      <g className="float" style={i(3)}>
        <path
          d="M262 190c-10-10-26-2-22 12 3 10 22 22 22 22s19-12 22-22c4-14-12-22-22-12Z"
          fill="#f2a6c6"
          {...S}
          strokeWidth={2.5}
        />
      </g>
    </svg>
  );
}

export function VetScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 280" aria-hidden="true" className={cn("h-auto w-full select-none", className)}>
      <Backdrop />
      {/* vet profile card */}
      <g className="float" style={{ ...i(0), "--float-duration": "8s" } as CSSProperties}>
        <rect x="70" y="48" width="170" height="150" rx="22" fill="#fff" {...S} />
        <circle cx="112" cy="94" r="24" fill="#9fcbe8" {...S} />
        {/* stethoscope */}
        <path d="M102 82v10a10 10 0 0 0 20 0V82" fill="none" {...S} strokeWidth={2.5} />
        <path d="M112 102v8a8 8 0 0 0 16 0v-4" fill="none" {...S} strokeWidth={2.5} />
        <circle cx="128" cy="104" r="3.5" fill="#fff" {...S} strokeWidth={2} />
        <rect x="146" y="80" width="70" height="8" rx="4" fill={INK} opacity="0.8" />
        <rect x="146" y="95" width="48" height="6" rx="3" fill={INK} opacity="0.3" />
        {/* verified badge, pulsing */}
        <g className="badge-pulse">
          <circle cx="132" cy="76" r="10" className="fill-primary" stroke="#fff" strokeWidth="3" />
          <path
            d="M127.5 76l3 3 6-6"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* stars */}
        {[92, 110, 128, 146, 164].map((x) => (
          <path
            key={x}
            d={`M${x} 132l3 6 6.5.9-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.6 6.5-.9Z`}
            fill="#f5d26a"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ))}
        <rect x="88" y="166" width="134" height="18" rx="9" className="fill-primary" />
        <rect x="128" y="172.5" width="54" height="5" rx="2.5" fill="#fff" />
      </g>

      {/* "new chat" chips sliding in */}
      {[0, 1].map((n) => (
        <g key={n} className="chip-in" style={i(n)}>
          <rect
            x={222}
            y={62 + n * 46}
            width="100"
            height="36"
            rx="18"
            fill="#fff"
            {...S}
            strokeWidth={2.5}
          />
          <circle cx={242} cy={80 + n * 46} r="9" fill={n ? "#f6a37c" : "#bcd98e"} {...S} strokeWidth={2} />
          <rect x={258} y={74 + n * 46} width="48" height="5" rx="2.5" fill={INK} opacity="0.7" />
          <rect x={258} y={84 + n * 46} width="30" height="5" rx="2.5" fill={INK} opacity="0.3" />
        </g>
      ))}

      {/* coins stacking */}
      <g transform="translate(246 170)">
        {[0, 1, 2].map((n) => (
          <g key={n} className="coin-drop" style={i(n)}>
            <ellipse cx="34" cy={74 - n * 12} rx="26" ry="9" fill="#f5d26a" {...S} strokeWidth={2.5} />
            <path d={`M8 ${74 - n * 12}v-6M60 ${74 - n * 12}v-6`} stroke={INK} strokeWidth="2.5" />
            <ellipse cx="34" cy={68 - n * 12} rx="26" ry="9" fill="#ffe08a" {...S} strokeWidth={2.5} />
          </g>
        ))}
      </g>

      {/* dog looking up */}
      <g className="peek-up">
        <path d="M44 216c-14 0-18 22-10 34 8-2 12-14 12-26Z" fill="#c98a5e" {...S} className="pet-ear-l" />
        <path d="M112 216c14 0 18 22 10 34-8-2-12-14-12-26Z" fill="#c98a5e" {...S} className="pet-ear-r" />
        <path d="M40 236c0-16 18-28 38-28s38 12 38 28-18 32-38 32-38-16-38-32Z" fill="#f6a37c" {...S} />
        <g className="pet-eyes">
          <ellipse cx="66" cy="230" rx="4" ry="5" fill={INK} />
          <ellipse cx="90" cy="230" rx="4" ry="5" fill={INK} />
          <circle cx="67.4" cy="228.4" r="1.4" fill="#fff" />
          <circle cx="91.4" cy="228.4" r="1.4" fill="#fff" />
        </g>
        <ellipse cx="78" cy="246" rx="6" ry="4.5" fill={INK} />
        <path d="M78 250.5v4c-2 3-6 3-8 1M78 254.5c2 3 6 3 8 1" fill="none" {...S} strokeWidth={2.4} />
      </g>
    </svg>
  );
}
