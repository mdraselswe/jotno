import { ImageResponse } from "next/og";
import { site } from "@/config";
import { OG_SIZE } from "@/lib/og";

/**
 * The brand card shown when a Jotno link is shared (1200×630 PNG, built once).
 * Latin text only: the image renderer can't join Bangla letters correctly, so
 * the Bangla title and description travel in the page's own preview text.
 * Colours are fixed here (an image has no light/dark theme): the brand indigo.
 */
const INK = "#1e1b4b";
const BRAND = "#4f46e5";
const SOFT = "#eef2ff";

export function GET() {
  const host = new URL(site.url).host;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: `linear-gradient(135deg, ${SOFT} 0%, #ffffff 55%, ${SOFT} 100%)`,
        color: INK,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Paw />
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>{site.name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
          Verified vets, free pet questions and quick help
        </div>
        <div style={{ fontSize: 32, color: "#4338ca" }}>For dogs, cats, cows and birds across Bangladesh</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }}>
        <div
          style={{
            display: "flex",
            padding: "14px 28px",
            borderRadius: 999,
            background: BRAND,
            color: "#ffffff",
            fontWeight: 700,
          }}
        >
          Chat with a vet
        </div>
        <div style={{ fontWeight: 600 }}>{host}</div>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}

/** A paw print in the brand colour. */
function Paw() {
  const toe = (left: number, top: number) => (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 26,
        height: 32,
        borderRadius: 999,
        background: BRAND,
      }}
    />
  );
  return (
    <div style={{ display: "flex", position: "relative", width: 104, height: 104 }}>
      {toe(8, 30)}
      {toe(30, 6)}
      {toe(58, 6)}
      {toe(80, 30)}
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 50,
          width: 60,
          height: 48,
          borderRadius: 999,
          background: BRAND,
        }}
      />
    </div>
  );
}
