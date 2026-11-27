import type { Metadata } from "next";
import { site } from "@/config";
import { LOCALES, localePath } from "@/config/locale";
import { pageUrl } from "@/config/routes";
import { ogImages } from "./og";
import { stripAccent } from "./rich-text";

/**
 * hreflang links for one page: every language, plus `x-default` (the default
 * language, served at the unprefixed URL). `route` is from ROUTES or a path helper.
 */
export function languageAlternates(route: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [l, pageUrl(localePath(l, route))])),
    "x-default": pageUrl(localePath(site.i18n.defaultLocale, route)),
  };
}

/** Open Graph locale (`bn` → `bn_BD`): Facebook and LinkedIn expect language_TERRITORY. */
export function ogLocale(locale: string): string {
  const territory: Record<string, string> = { bn: "BD", en: "US" };
  const t = territory[locale];
  return t ? `${locale}_${t}` : locale;
}

/** Canonical URL of `route` in `locale`, plus its hreflang links. */
export function pageAlternates(route: string, locale: string): NonNullable<Metadata["alternates"]> {
  return { canonical: pageUrl(localePath(locale, route)), languages: languageAlternates(route) };
}

/**
 * Per-page metadata with a canonical URL and hreflang links to the same page
 * in every language. Titles may contain [accent] markup. `route` is from ROUTES.
 */
export function pageMetadata(title: string, description: string, route: string, locale: string): Metadata {
  const plain = stripAccent(title);
  const url = pageUrl(localePath(locale, route));
  return {
    title: plain,
    description,
    alternates: pageAlternates(route, locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      title: plain,
      description,
      url,
      locale: ogLocale(locale),
      images: ogImages(),
    },
  };
}
