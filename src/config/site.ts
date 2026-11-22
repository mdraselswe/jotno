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
    // Deep care green: health and growth, calm and trustworthy, never hospital-cold.
    primary: { light: "oklch(0.44 0.09 165)", dark: "oklch(0.8 0.12 165)" },
    primaryForeground: { light: "oklch(0.985 0.01 120)", dark: "oklch(0.2 0.04 165)" },
    // Warm studio paper (light) and warm charcoal (dark), like a photo backdrop.
    background: { light: "#f2efe8", dark: "#151412" },
    // Apricot: warmth, the mascot, "available now", the blobs behind the animals.
    highlight: { light: "oklch(0.8 0.12 55)", dark: "oklch(0.76 0.12 55)" },
    highlightForeground: { light: "oklch(0.26 0.05 45)", dark: "oklch(0.2 0.05 45)" },
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
