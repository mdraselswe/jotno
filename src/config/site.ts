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
    // Royal blue (from the sticker-footer reference): trust and care, the one
    // brand colour. Deep enough for white text (5:1). Buttons themselves are ink.
    primary: { light: "oklch(0.53 0.2 268)", dark: "oklch(0.74 0.13 268)" },
    primaryForeground: { light: "oklch(0.99 0 0)", dark: "oklch(0.18 0.03 268)" },
    // Warm paper (light) and soft ink (dark), like the orbit reference.
    background: { light: "#f5f3ef", dark: "#121212" },
    // Sunny yellow (doodle-footer reference): highlights, the logo's cross, the footer.
    highlight: { light: "oklch(0.89 0.16 92)", dark: "oklch(0.86 0.15 92)" },
    highlightForeground: { light: "oklch(0.2 0.004 70)", dark: "oklch(0.2 0.004 70)" },
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
