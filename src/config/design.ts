import { designSchema, type DesignConfig } from "./schema.ts";

/**
 * ✏️ Jotno's look, as knobs (docs/design-system.md → Design knobs).
 * Calm and professional: one radius scale (10px controls, 16px cards, 24px
 * at most), soft layered shadows, smooth eased motion, cool neutral greys.
 */
const design: DesignConfig = {
  radius: "0.625rem",
  controlShape: "rounded",
  border: "none",
  elevation: "tactile",
  density: "airy",
  motion: "smooth",
  texture: "none",
  neutral: { hue: 180, chroma: 0.006 },
};

export const designConfig = designSchema.parse(design);
