import { describe, expect, it } from "vitest";
import { site } from "@/config";
import { LOCALES } from "@/config/locale";
import { languageAlternates, ogLocale, pageMetadata } from "./metadata";

describe("page metadata", () => {
  it("links every language and x-default (the default language)", () => {
    const links = languageAlternates("/vets");
    for (const l of LOCALES) expect(links[l]).toMatch(/\/vets\/$/);
    expect(links["x-default"]).toBe(links[site.i18n.defaultLocale]);
  });

  it("uses the page's own URL as canonical", () => {
    const meta = pageMetadata("[Find] a vet", "d", "/vets", site.i18n.defaultLocale);
    expect(meta.title).toBe("Find a vet");
    expect(meta.alternates?.canonical).toBe("/vets/");
  });

  it("gives Open Graph a territory", () => {
    expect(ogLocale("bn")).toBe("bn_BD");
    expect(ogLocale("xx")).toBe("xx");
  });
});
