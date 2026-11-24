import { buildEnv, publicEnv } from "./env.ts";
import { businessConfig } from "./business.ts";
import { designConfig } from "./design.ts";
import { featuresConfig } from "./features.ts";
import { siteConfig } from "./site.ts";

/** Resolved configuration: config files plus environment overrides. Import from "@/config". */
export const site = {
  ...siteConfig,
  url: (publicEnv.NEXT_PUBLIC_SITE_URL ?? siteConfig.url).replace(/\/$/, ""),
  render: buildEnv.RENDER_MODE ?? siteConfig.render,
};

export const features = {
  ...featuresConfig,
  installPrompt: {
    ...featuresConfig.installPrompt,
    enabled: featuresConfig.pwa && featuresConfig.installPrompt.enabled,
  },
};

/** Prices, commissions, time windows (src/config/business.ts). Money in poisha. */
export const business = businessConfig;

/** The project's look as knobs (src/config/design.ts). */
export const design = designConfig;

export const isProduction = buildEnv.NODE_ENV === "production";
/** CPUs for a small shared build machine (BUILD_CPUS); undefined for a normal build. */
export const buildCpus = buildEnv.BUILD_CPUS;

export type { BusinessConfig, DesignConfig, Host, RenderMode, ThemeMode, ToastPosition } from "./schema.ts";
export {
  BORDERS,
  CONTROL_SHAPES,
  DENSITIES,
  ELEVATIONS,
  HOSTS,
  MOTIONS,
  TEXTURES,
  THEME_MODES,
  TOAST_POSITIONS,
} from "./schema.ts";
