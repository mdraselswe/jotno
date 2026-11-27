import { describe, expect, it } from "vitest";
import { site } from "@/config";
import { ROUTES } from "@/config/routes";
import { absoluteUrl, breadcrumbLd, faqLd, organizationLd, websiteLd } from "./structured-data";

describe("structured data", () => {
  it("gives absolute URLs with the language prefix and trailing slash", () => {
    expect(absoluteUrl(ROUTES.vets, site.i18n.defaultLocale)).toBe(`${site.url}/vets/`);
  });

  it("numbers breadcrumbs from 1 and links each crumb", () => {
    const ld = breadcrumbLd(site.i18n.defaultLocale, [
      { name: "Home", route: ROUTES.home },
      { name: "Vets", route: ROUTES.vets },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
      { "@type": "ListItem", position: 2, name: "Vets", item: `${site.url}/vets/` },
    ]);
  });

  it("turns each FAQ item into a question with its answer", () => {
    const ld = faqLd([{ q: "Q?", a: "A." }]);
    expect(ld.mainEntity).toEqual([
      { "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } },
    ]);
  });

  it("links the website to the organization and searches vets", () => {
    const org = organizationLd("d");
    const web = websiteLd(site.i18n.defaultLocale, "d");
    expect(web.publisher).toEqual({ "@id": org["@id"] });
    expect(JSON.stringify(web.potentialAction)).toContain("/vets/?q={search_term_string}");
    expect(org.sameAs).toEqual(site.socials.map((s) => s.url));
  });
});
