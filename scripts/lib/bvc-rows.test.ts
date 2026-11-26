import { describe, expect, it } from "vitest";
import { pageRows, type PageState, type TextBit } from "./bvc-rows.ts";

const bit = (s: string, x: number, y: number, w = s.length * 4): TextBit => ({ s, x, y, w });

// A page laid out like the 2026 voter list (x, y in PDF points).
const header = [
  bit("X", 488, 726, 4),
  bit("vKv wefvM", 492, 726),
  bit("‡fvUvi bs", 67, 714),
  bit("bvg", 177, 714),
  bit("‡iwRt bs", 269, 714),
  bit("¯’vqx wVKvbv", 409, 714),
];

describe("pageRows", () => {
  it("reads number, name and division, and skips the address", () => {
    const state: PageState = { division: null, regX: null, last: null };
    const rows = pageRows(
      [
        ...header,
        bit("739.", 85, 704),
        bit("Wvt my`xc †`e bv_ Rq", 113, 704),
        bit("3047", 273, 703),
        bit("MÖvg: ‡eKvi‡KvYv", 315, 704),
        bit("740.", 85, 683),
        bit("Wvt †gvnv¤§` MvRx", 113, 683),
        // The name wraps onto a second line.
        bit("kvn Avjg", 113, 673),
        bit("3063", 273, 683),
        bit("433, cwðg †fjvbMi", 315, 683),
        bit("1 |", 36, 45),
      ],
      20,
      state,
    );
    expect(rows).toEqual([
      {
        voterNo: 739,
        regNo: "3047",
        name: "ডাঃ সুদীপ দেব নাথ জয়",
        readable: true,
        division: "ঢাকা বিভাগ",
        page: 20,
      },
      {
        voterNo: 740,
        regNo: "3063",
        name: "ডাঃ মোহাম্মদ গাজী শাহ আলম",
        readable: true,
        division: "ঢাকা বিভাগ",
        page: 20,
      },
    ]);
  });

  it("adds a name that runs onto the next page to the last row", () => {
    const state: PageState = { division: null, regX: null, last: null };
    const first = pageRows(
      [...header, bit("740.", 85, 120), bit("Wvt †gvnv¤§`", 113, 120), bit("3063", 273, 120)],
      1,
      state,
    );
    const next = pageRows(
      [
        ...header,
        bit("Avjg", 113, 704),
        bit("741.", 85, 690),
        bit("Wvt BKivj", 113, 690),
        bit("3081", 273, 690),
      ],
      2,
      state,
    );
    expect(state.last?.voterNo).toBe(741);
    expect(next[0]?.name).toBe("ডাঃ ইকরাল");
    expect(first[0]?.name).toBe("ডাঃ মোহাম্মদ আলম");
  });
});
