import { designSchema, type DesignConfig } from "./schema.ts";

/**
 * ✏️ Jotno's look, as knobs (docs/design-system.md → Design knobs).
 * Ink on warm paper with flat bold accents (royal blue, sunny yellow, pastel
 * species bands), after the user's references. One radius scale (10px
 * controls, 16px cards, 24px at most), soft shadows, smooth eased motion.
 */
const design: DesignConfig = {
  radius: "0.625rem",
  controlShape: "rounded",
  border: "none",
  elevation: "tactile",
  density: "airy",
  motion: "smooth",
  texture: "none",
  neutral: { hue: 75, chroma: 0.006 },
};

export const designConfig = designSchema.parse(design);
