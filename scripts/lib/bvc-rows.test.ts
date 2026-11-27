import { describe, expect, it } from "vitest";
import { bijoyToUnicode } from "../../src/lib/bijoy.ts";
import {
  applyFixes,
  csvField,
  outOfOrder,
  pageRows,
  parseFixes,
  type PageState,
  type TextBit,
  type VoterRow,
} from "./bvc-rows.ts";

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
        y: 704,
      },
      {
        voterNo: 740,
        regNo: "3063",
        name: "ডাঃ মোহাম্মদ গাজী শাহ আলম",
        readable: true,
        division: "ঢাকা বিভাগ",
        page: 20,
        y: 683,
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

describe("pageRows names", () => {
  const page = (name: string, reg?: string): TextBit[] => [
    { s: "‡fvUvi bs", x: 80, y: 714, w: 30 },
    { s: "bvg", x: 180, y: 714, w: 15 },
    { s: "‡iwRt bs", x: 268, y: 714, w: 30 },
    { s: "7568.", x: 85, y: 704, w: 20 },
    { s: name, x: 113, y: 704, w: 140 },
    ...(reg ? [{ s: reg, x: 273, y: 704, w: 20 }] : []),
  ];
  const state = (): PageState => ({ division: "রংপুর বিভাগ", regX: null, last: null });

  it("drops the division's end line from the last name", () => {
    const [r] = pageRows(page("Wvt ‡gvt Avjx -Lyjbv wefvM mgvß-", "10660"), 243, state());
    expect(r?.name).toBe(bijoyToUnicode("Wvt ‡gvt Avjx"));
    expect(r?.name).toMatch(/আলী$/);
    expect(r?.regNo).toBe("10660");
  });
});

describe("parseFixes", () => {
  it("reads filled rows, keeps a reg-only row and leaves out unread ones", () => {
    const csv = [
      "\uFEFFvoter_no,page,reg_no,name_bn",
      "894,24,4202,ডাঃ সমর চন্দ্র রায়",
      '895,24,৪২০৯,"ডাঃ এন.ডি, মশিউর রহমান"',
      "896,24,,",
      "897,24,4224,",
      "",
    ].join("\r\n");
    expect(parseFixes(csv)).toEqual([
      { voterNo: 894, page: 24, regNo: "4202", name: "ডাঃ সমর চন্দ্র রায়" },
      { voterNo: 895, page: 24, regNo: "4209", name: "ডাঃ এন.ডি, মশিউর রহমান" },
      { voterNo: 897, page: 24, regNo: "4224", name: "" },
    ]);
  });

  it("round-trips a field with a comma or quote", () => {
    const name = 'ডাঃ "এ" , বি';
    expect(parseFixes(`voter_no,page,reg_no,name_bn\n1,2,3,${csvField(name)}`)[0]?.name).toBe(name);
  });
});

const row = (voterNo: number, regNo: string, division = "ঢাকা বিভাগ"): VoterRow => ({
  voterNo,
  regNo,
  name: "ডাঃ ক",
  readable: true,
  division,
  page: 1,
  y: 700,
});

describe("applyFixes", () => {
  it("replaces a parsed row and adds a lost one in its neighbour's division", () => {
    const rows = [row(1, "10"), { ...row(2, ""), name: "", readable: false }, row(4, "40", "সিলেট বিভাগ")];
    const out = applyFixes(rows, [
      { voterNo: 2, page: null, regNo: "20", name: "ডাঃ খ" },
      { voterNo: 3, page: 2, regNo: "30", name: "ডাঃ গ" },
    ]);
    expect(out.changed).toBe(1);
    expect(out.added).toBe(1);
    expect(out.rows.map((r) => [r.voterNo, r.regNo, r.name, r.readable, r.division, r.page])).toEqual([
      [1, "10", "ডাঃ ক", true, "ঢাকা বিভাগ", 1],
      [2, "20", "ডাঃ খ", true, "ঢাকা বিভাগ", 1],
      [3, "30", "ডাঃ গ", true, "ঢাকা বিভাগ", 2],
      [4, "40", "ডাঃ ক", true, "সিলেট বিভাগ", 1],
    ]);
    expect(rows[1]?.regNo).toBe("");
  });
});

describe("outOfOrder", () => {
  it("flags a reg no that breaks its division's rising order", () => {
    const rows = [
      row(1, "100"),
      row(2, "105"),
      row(3, "901"),
      row(4, "110"),
      row(5, "5", "সিলেট বিভাগ"),
      row(6, "7", "সিলেট বিভাগ"),
    ];
    expect(outOfOrder(rows).map((r) => r.voterNo)).toEqual([3]);
  });
});
