/**
 * ✏️ The Jotno mark: a paw whose main pad is a heart ("care" for animals).
 * Plain SVG data in a 100×100 box, shared by the header logo
 * (components/brand/logo.tsx) and the generated app icons (scripts/generate-assets.ts).
 */
export const MARK_VIEWBOX = "0 0 100 100";

/** The heart pad (filled with the highlight colour). */
export const MARK_HEART =
  "M50 84C33 73 23 64 25.5 53.5 27.8 44 39.5 41 50 50.5 60.5 41 72.2 44 74.5 53.5 77 64 67 73 50 84Z";

/** Four toe beans: [cx, cy, rx, ry, rotate]. */
export const MARK_TOES: readonly (readonly [number, number, number, number, number])[] = [
  [24, 37, 7.5, 9.5, -22],
  [40, 23, 7.5, 10, -6],
  [60, 23, 7.5, 10, 6],
  [76, 37, 7.5, 9.5, 22],
];

/** SVG markup of the mark (no outer <svg>), for scripts. */
export function markSvg(toe: string, heart: string): string {
  const toes = MARK_TOES.map(
    ([cx, cy, rx, ry, r]) =>
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="${toe}"/>`,
  ).join("");
  return `${toes}<path d="${MARK_HEART}" fill="${heart}"/>`;
}
