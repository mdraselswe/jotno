import { describe, expect, it } from "vitest";
import {
  availableMethods,
  codAllowed,
  DEFAULT_SETTINGS,
  readSettings,
  trxIdSchema,
  walletFee,
} from "./model";

const ready = {
  ...DEFAULT_SETTINGS,
  bkash: { ...DEFAULT_SETTINGS.bkash, number: "01711000000" },
  nagad: { ...DEFAULT_SETTINGS.nagad, number: "01811000000" },
};

describe("walletFee", () => {
  it("adds the percentage and rounds up to whole taka", () => {
    // ৳450 at 1.85% = ৳8.325 → ৳9
    expect(walletFee(45_000, { feeBps: 185, feeFlat: 0 })).toBe(900);
  });
  it("adds a flat charge", () => {
    expect(walletFee(10_000, { feeBps: 0, feeFlat: 500 })).toBe(500);
  });
  it("is zero with no charge", () => {
    expect(walletFee(10_000, { feeBps: 0, feeFlat: 0 })).toBe(0);
  });
});

describe("availableMethods", () => {
  it("hides wallets without a number", () => {
    expect(availableMethods(DEFAULT_SETTINGS, "consult", 50_000)).toEqual([]);
  });
  it("offers cash on delivery only for shop orders under the limit", () => {
    expect(availableMethods(ready, "consult", 50_000)).toEqual(["bkash", "nagad"]);
    expect(availableMethods(ready, "order", 50_000)).toEqual(["bkash", "nagad", "cod"]);
    expect(availableMethods(ready, "order", 2_000_000)).toEqual(["bkash", "nagad"]);
  });
});

describe("codAllowed", () => {
  it("allows totals up to the limit, any total when the limit is 0, nothing when off", () => {
    expect(codAllowed({ enabled: true, maxOrder: 100_000 }, 100_000)).toBe(true);
    expect(codAllowed({ enabled: true, maxOrder: 100_000 }, 100_001)).toBe(false);
    expect(codAllowed({ enabled: true, maxOrder: 0 }, 99_000_000)).toBe(true);
    expect(codAllowed({ enabled: false, maxOrder: 0 }, 100)).toBe(false);
  });
});

describe("readSettings", () => {
  it("fills missing fields from the defaults", () => {
    const s = readSettings({ bkash: { number: "01711000000" } });
    expect(s.bkash.number).toBe("01711000000");
    expect(s.bkash.feeBps).toBe(DEFAULT_SETTINGS.bkash.feeBps);
    expect(s.cod).toEqual(DEFAULT_SETTINGS.cod);
  });
  it("falls back to the defaults when the row is broken", () => {
    expect(readSettings({ bkash: { number: "nope" } })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("trxIdSchema", () => {
  it("accepts wallet ids in any case", () => {
    expect(trxIdSchema.parse(" 9bk7xa2mlq ")).toBe("9BK7XA2MLQ");
  });
  it("rejects junk", () => {
    expect(trxIdSchema.safeParse("12").success).toBe(false);
    expect(trxIdSchema.safeParse("ABC-DEF-GHI").success).toBe(false);
  });
});
