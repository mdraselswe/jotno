import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, localePath, PREFIXED_LOCALES, splitLocale } from "@/config/locale";
import { format, formatter, pickLocale, plural, translator } from "./index";
import { CATALOGUE } from "./messages";

describe("i18n", () => {
  it("fills placeholders and keeps unknown ones", () => {
    expect(format("Hi {name} {x}", { name: "Ana" })).toBe("Hi Ana {x}");
  });

  it("translates typed keys per locale", () => {
    expect(translator("en")("pwa.title", { name: "App" })).toBe("Install App");
    expect(translator("bn")("pwa.title", { name: "App" })).toBe("App ইনস্টল করুন");
  });

  it("has the same keys in every language", () => {
    const keys = Object.keys(CATALOGUE.en ?? {}).sort();
    for (const [locale, messages] of Object.entries(CATALOGUE)) {
      expect(Object.keys(messages).sort(), locale).toEqual(keys);
    }
  });

  it("picks singular or plural messages by the locale's rules", () => {
    const en = translator("en");
    const key = (n: number) => plural("en", n, "vets.resultsOne", "vets.results");
    expect(en(key(1), { n: 1 })).toBe("1 vet");
    expect(en(key(0), { n: 0 })).toBe("0 vets");
    expect(en(key(2), { n: 2 })).toBe("2 vets");
    const bn = translator("bn");
    expect(bn(plural("bn", 1, "vets.resultsOne", "vets.results"), { n: "১" })).toBe("১ জন ভেট");
    expect(bn(plural("bn", 5, "vets.resultsOne", "vets.results"), { n: "৫" })).toBe("৫ জন ভেট");
  });

  it("falls back to the default locale for content", () => {
    expect(pickLocale({ [DEFAULT_LOCALE]: "default" }, "xx")).toBe("default");
    expect(pickLocale({ bn: "বাংলা", en: "English" }, "en")).toBe("English");
  });

  it("formats money and dates in the site's currency and time zone", () => {
    expect(formatter("en").money(1250)).toContain("1,250");
    expect(formatter("bn").number(25)).toBe("২৫");
    // 18:30 UTC is 00:30 the next day in Dhaka (UTC+6).
    expect(formatter("en").date(Date.UTC(2026, 0, 1, 18, 30), { day: "numeric" })).toBe("2");
  });
});

// Uses the configured languages, so it holds for any project.
const other = PREFIXED_LOCALES[0];

describe("locale paths", () => {
  it("keeps the default locale unprefixed", () => {
    expect(localePath(DEFAULT_LOCALE, "/about")).toBe("/about");
    expect(splitLocale("/about/")).toEqual({ locale: DEFAULT_LOCALE, path: "/about/" });
  });

  it("reads the internal default-locale prefix (a rewritten usePathname)", () => {
    expect(splitLocale(`/${DEFAULT_LOCALE}/login/`)).toEqual({ locale: DEFAULT_LOCALE, path: "/login/" });
    expect(splitLocale(`/${DEFAULT_LOCALE}`)).toEqual({ locale: DEFAULT_LOCALE, path: "/" });
  });

  it.runIf(other)("prefixes the other locales", () => {
    const l = other ?? "";
    expect(localePath(l, "/about")).toBe(`/${l}/about`);
    expect(localePath(l, "/")).toBe(`/${l}`);
    expect(splitLocale(`/${l}/about/`)).toEqual({ locale: l, path: "/about/" });
    expect(splitLocale(`/${l}`)).toEqual({ locale: l, path: "/" });
  });
});

describe("numbers in messages", () => {
  it("writes numbers in the locale's digits", () => {
    expect(translator("bn")("quick.step2", { n: 60 })).toContain("৬০");
    expect(translator("en")("quick.step2", { n: 60 })).toContain("60");
  });
});
