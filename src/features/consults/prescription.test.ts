import { describe, expect, it } from "vitest";
import {
  canWriteRx,
  emptyRxItem,
  followUpDay,
  rxErrors,
  rxSchema,
  withoutBlankRows,
  RX_MAX_ITEMS,
} from "./prescription";

const item = { name: "Meloxicam 1.5 mg/ml", dose: "0.5 ml", frequency: "once a day after food", days: 5 };

describe("rxSchema", () => {
  it("accepts a normal prescription and trims text", () => {
    const r = rxSchema.parse({
      diagnosis: "  Soft-tissue sprain, left hind leg ",
      items: [item],
      followUpDays: 5,
    });
    expect(r.diagnosis).toBe("Soft-tissue sprain, left hind leg");
    expect(r.items).toHaveLength(1);
  });
  it("allows advice only (no medicine)", () => {
    expect(
      rxSchema.safeParse({ diagnosis: "Mild cold", items: [], advice: "Keep warm", followUpDays: null })
        .success,
    ).toBe(true);
  });
  it("rejects a half-written medicine row", () => {
    const r = rxSchema.safeParse({
      diagnosis: "Ear infection",
      items: [{ ...item, dose: "" }],
      followUpDays: null,
    });
    expect(r.success).toBe(false);
  });
  it("caps the number of medicines", () => {
    const items = Array.from({ length: RX_MAX_ITEMS + 1 }, () => item);
    expect(rxSchema.safeParse({ diagnosis: "Many things", items, followUpDays: null }).success).toBe(false);
  });
  it("only links real ids to the shop", () => {
    expect(
      rxSchema.safeParse({
        diagnosis: "Fleas",
        items: [{ ...item, productId: "not-a-uuid" }],
        followUpDays: null,
      }).success,
    ).toBe(false);
  });
});

describe("withoutBlankRows", () => {
  it("drops untouched rows only", () => {
    const half = { ...emptyRxItem(), name: "Drops" };
    expect(withoutBlankRows([emptyRxItem(), item, half])).toEqual([item, half]);
  });
});

describe("canWriteRx", () => {
  const now = new Date("2026-01-02T10:00:00Z");
  it("while open", () => {
    expect(canWriteRx({ status: "active", closedAt: null, firstReplyAt: null }, now)).toBe(true);
  });
  it("up to a day after the chat ended", () => {
    const replied = new Date("2026-01-01T08:00:00Z");
    expect(
      canWriteRx(
        { status: "closed", closedAt: new Date("2026-01-01T12:00:00Z"), firstReplyAt: replied },
        now,
      ),
    ).toBe(true);
    expect(
      canWriteRx(
        { status: "closed", closedAt: new Date("2026-01-01T09:00:00Z"), firstReplyAt: replied },
        now,
      ),
    ).toBe(false);
  });
  it("never for refunded or unanswered chats", () => {
    expect(canWriteRx({ status: "refunded", closedAt: now, firstReplyAt: null }, now)).toBe(false);
    expect(canWriteRx({ status: "closed", closedAt: now, firstReplyAt: null }, now)).toBe(false);
  });
});

describe("followUpDay", () => {
  it("adds days", () => {
    expect(followUpDay(new Date("2026-01-30T10:00:00Z"), 5)).toBe("2026-02-04");
    expect(followUpDay(new Date("2026-01-30T10:00:00Z"), null)).toBeNull();
  });
});

describe("rxErrors", () => {
  it("is null when the form can be saved (blank rows ignored)", () => {
    expect(rxErrors({ diagnosis: "Mild gastritis", items: [item, emptyRxItem()] })).toBeNull();
  });

  it("marks a short diagnosis and the missing fields of half-filled rows", () => {
    expect(
      rxErrors({ diagnosis: "x", items: [emptyRxItem(), { ...emptyRxItem(), name: "Meloxicam" }] }),
    ).toEqual({ diagnosis: true, items: { 1: ["dose", "frequency"] } });
  });
});
