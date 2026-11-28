import { site } from "@/config";
import { localePath } from "@/config/locale";
import { pageUrl, ROUTES } from "@/config/routes";

/**
 * schema.org JSON-LD builders (render with `<JsonLd data={…} />`). Search
 * engines use them for rich results and the site name; AI assistants use them
 * to know what Jotno is. Every URL is absolute.
 */
type Ld = Record<string, unknown>;

const base = () => site.url.replace(/\/$/, "");

/** Absolute URL of `route` in `locale`. */
export function absoluteUrl(route: string, locale: string): string {
  return base() + pageUrl(localePath(locale, route));
}

export const ORGANIZATION_ID = () => `${base()}/#organization`;
export const WEBSITE_ID = () => `${base()}/#website`;

/** Other names people search for: the Bangla name and the domain. */
const ALTERNATE_NAMES = ["যত্ন", "Jotno Care", "jotnocare", "jotnocare.com"];

/** The company behind the site (home page). `description` is in the page's language. */
export function organizationLd(description: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID(),
    name: site.name,
    alternateName: ALTERNATE_NAMES,
    url: `${base()}/`,
    logo: { "@type": "ImageObject", url: `${base()}/icons/icon-512.png`, width: 512, height: 512 },
    image: `${base()}/og.png`,
    description,
    email: site.contact.email,
    areaServed: { "@type": "Country", name: "Bangladesh" },
    knowsLanguage: site.i18n.locales,
    knowsAbout: [
      "Veterinary medicine",
      "Pet care",
      "Livestock health",
      "Online veterinary consultation",
      "Pet vaccination",
      "Livestock vaccination",
      "Poultry diseases",
      "Pet food and supplies",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: site.contact.email,
        areaServed: "BD",
        availableLanguage: ["Bengali", "English"],
      },
    ],
    sameAs: site.socials.map((s) => s.url),
  };
}

/** The About page, tied to the organisation it describes. */
export function aboutPageLd(locale: string, name: string, description: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl(ROUTES.about, locale),
    name,
    description,
    inLanguage: locale,
    about: { "@id": ORGANIZATION_ID() },
    isPartOf: { "@id": WEBSITE_ID() },
  };
}

/** The site itself: its name in search results and the vet search box. */
export function websiteLd(locale: string, description: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    name: site.name,
    alternateName: ALTERNATE_NAMES,
    url: `${base()}/`,
    description,
    inLanguage: locale,
    publisher: { "@id": ORGANIZATION_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(ROUTES.vets, locale)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Home → … → this page. `route` of each crumb is from ROUTES or a path helper. */
export function breadcrumbLd(locale: string, crumbs: readonly { name: string; route: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.route, locale),
    })),
  };
}

/** Questions and answers shown on the page (the text must be visible there too). */
export function faqLd(items: readonly { q: string; a: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
