/**
 * ✏️ The Jotno mark: a paw with a medical cross cut out of its main pad, so
 * it reads at a glance as care for animals (a vet app). Plain SVG data in a
 * 100×100 box, shared by the header logo (components/brand/logo.tsx) and the
 * generated app icons (scripts/generate-assets.ts).
 */
export const MARK_VIEWBOX = "0 0 100 100";

/** The main pad. */
export const MARK_PAD =
  "M50 46C35 46 22 58 19.5 71 17.6 81 24 88 33 87.2 39.5 86.6 44 84 50 84S60.5 86.6 67 87.2C76 88 82.4 81 80.5 71 78 58 65 46 50 46Z";

/** Four toes: [cx, cy, rx, ry, rotate]. */
export const MARK_TOES: readonly (readonly [number, number, number, number, number])[] = [
  [17, 40, 8.5, 10.5, -24],
  [35, 21, 9, 11.5, -8],
  [65, 21, 9, 11.5, 8],
  [83, 40, 8.5, 10.5, 24],
];

/** The cross, cut out of the pad. */
export const MARK_CROSS = "M45.5 55h9v8h8v9h-8v8h-9v-8h-8v-9h8Z";

/** SVG markup of the mark (no outer <svg>) for scripts: the cross drawn in `cross` on top. */
export function markSvg(paw: string, cross: string): string {
  const toes = MARK_TOES.map(
    ([cx, cy, rx, ry, r]) =>
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="${paw}"/>`,
  ).join("");
  return `${toes}<path d="${MARK_PAD}" fill="${paw}"/><path d="${MARK_CROSS}" fill="${cross}" stroke="${cross}" stroke-width="2" stroke-linejoin="round"/>`;
}
