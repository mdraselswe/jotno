import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, PREFIXED_LOCALES } from "@/config/locale";
import { isActivePath } from "./active-link";

const other = PREFIXED_LOCALES[0];

describe("isActivePath", () => {
  it("matches a page and, with prefix, the pages under it", () => {
    expect(isActivePath("/vets/", "/vets", "prefix")).toBe(true);
    expect(isActivePath("/vets/dhaka/", "/vets", "prefix")).toBe(true);
    expect(isActivePath("/vets/dhaka/", "/vets", "exact")).toBe(false);
    expect(isActivePath("/vetsx/", "/vets", "prefix")).toBe(false);
  });

  it("reads the proxy's internal default-locale path as the public URL", () => {
    expect(isActivePath(`/${DEFAULT_LOCALE}/vets/`, "/vets", "prefix")).toBe(true);
    expect(isActivePath(`/${DEFAULT_LOCALE}`, "/", "exact")).toBe(true);
  });

  it.runIf(other)("keeps other locales' prefixes", () => {
    const l = other ?? "";
    expect(isActivePath(`/${l}/vets/`, `/${l}/vets`, "prefix")).toBe(true);
    expect(isActivePath(`/${l}/vets/`, "/vets", "prefix")).toBe(false);
  });
});
