import { siteSchema, type SiteConfig } from "./schema.ts";

/**
 * ✏️ The main file to edit for a new project: brand, colours, languages,
 * contact, SEO and render mode. Everything here is validated by `siteSchema`.
 * Fonts: src/config/fonts.ts · UI text: src/i18n/messages · page content: src/content.
 */
const site: SiteConfig = {
  name: "Jotno",
  shortName: "Jotno",
  /** Web app manifest and package description. Page meta text is `meta.description` in each language file. */
  description: "Verified vets near you, answers to pet questions and paid chat with a vet, in Bangla.",
  // Until the domain is bought, the deploy sets NEXT_PUBLIC_SITE_URL to the workers.dev address.
  url: "https://jotnocare.com",
  i18n: {
    defaultLocale: "bn",
    locales: ["bn", "en"],
    timeZone: "Asia/Dhaka",
    currency: "BDT",
  },
  render: "server",
  renderLocked: true,
  host: "cloudflare",
  privatePaths: ["/account", "/dashboard", "/admin", "/chat", "/onboarding", "/pay", "/api", "/auth"],
  theme: {
    defaultMode: "system",
    // Warm teal: health and nature, trustworthy but not hospital-cold.
    primary: { light: "oklch(0.52 0.1 180)", dark: "oklch(0.78 0.11 176)" },
    primaryForeground: { light: "oklch(0.99 0.01 180)", dark: "oklch(0.2 0.04 182)" },
    // Cream, not pure white; warm black in dark mode.
    background: { light: "#fbf7f0", dark: "#14110e" },
    // Soft amber: warmth, the mascot, "available now".
    highlight: { light: "oklch(0.8 0.14 70)", dark: "oklch(0.78 0.13 70)" },
    highlightForeground: { light: "oklch(0.28 0.06 60)", dark: "oklch(0.22 0.05 60)" },
  },
  contact: {
    email: "hello@jotnocare.com",
  },
  socials: [{ kind: "facebook", url: "https://facebook.com/jotnocare" }],
  seo: {
    title: "Jotno · যত্ন: verified vets near you",
    keywords: ["vet", "veterinary", "Dhaka", "pet", "ভেট", "পশু ডাক্তার", "বিড়াল", "কুকুর", "Bangladesh"],
  },
};

export const siteConfig = siteSchema.parse(site);
