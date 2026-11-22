import { designSchema, type DesignConfig } from "./schema.ts";

/**
 * ✏️ Jotno's look, as knobs (docs/design-system.md → Design knobs).
 * "Soft & tactile" (direction 1 on /dev/directions): objects you can press,
 * light from above, layered soft shadows, smooth eased motion (no spring wobble on hover), warm greys.
 */
const design: DesignConfig = {
  radius: "1.1rem",
  controlShape: "pill",
  border: "none",
  elevation: "tactile",
  density: "airy",
  motion: "smooth",
  texture: "grain",
  neutral: { hue: 75, chroma: 0.012 },
};

export const designConfig = designSchema.parse(design);
