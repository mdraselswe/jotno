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
/**
 * Search engines and AI crawlers may index this deploy. False on the demo site
 * (NEXT_PUBLIC_DEMO): noindex everywhere, robots.txt shuts AI crawlers out, no
 * sitemap or llms.txt, so only the real site is found and suggested.
 */
export const isIndexable = !publicEnv.NEXT_PUBLIC_DEMO;
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
