import { designSchema, type DesignConfig } from "./schema.ts";

/**
 * ✏️ Jotno's look, as knobs (docs/design-system.md → Design knobs). Chosen on
 * /dev/directions: "Warm care" (soft, rounded, gentle spring, warm greys,
 * a little paper grain). The other two directions there are one edit away.
 */
const design: DesignConfig = {
  radius: "1rem",
  controlShape: "rounded",
  border: "none",
  elevation: "soft",
  density: "comfortable",
  motion: "bouncy",
  texture: "grain",
  neutral: { hue: 70, chroma: 0.008 },
};

export const designConfig = designSchema.parse(design);
