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
    defaultMode: "light",
    // Care teal: health and trust, calm, never hospital-cold. The only strong colour.
    primary: { light: "oklch(0.47 0.085 185)", dark: "oklch(0.78 0.1 180)" },
    primaryForeground: { light: "oklch(0.985 0.005 180)", dark: "oklch(0.18 0.03 185)" },
    // Clean paper white (light) and deep teal-charcoal (dark).
    background: { light: "#fbfbfa", dark: "#101413" },
    // Amber: used sparingly (the logo's dot, highlights, "popular").
    highlight: { light: "oklch(0.8 0.13 72)", dark: "oklch(0.78 0.12 72)" },
    highlightForeground: { light: "oklch(0.27 0.06 60)", dark: "oklch(0.2 0.05 60)" },
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
