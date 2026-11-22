/**
 * ✏️ The Jotno mark: an open hand (a cradle) holding a dot. Care for a life,
 * and a lowercase "j" for Jotno: the tall right arm is the stem, the curl the hook.
 * Plain SVG data in a 100×100 box, shared by the header logo
 * (components/brand/logo.tsx) and the generated app icons (scripts/generate-assets.ts).
 */
export const MARK_VIEWBOX = "0 0 100 100";

/** The cradle, drawn as a thick round-capped stroke (brand colour). */
export const MARK_CRADLE = "M19 50C19 70 33 84 51 84S83 70 83 47V17";
export const MARK_STROKE = 14;

/** The life it holds (highlight colour): [cx, cy, r]. */
export const MARK_DOT = [50, 47, 13] as const;

/** SVG markup of the mark (no outer <svg>), for scripts. */
export function markSvg(cradle: string, dot: string): string {
  const [cx, cy, r] = MARK_DOT;
  return `<path d="${MARK_CRADLE}" fill="none" stroke="${cradle}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${dot}"/>`;
}
