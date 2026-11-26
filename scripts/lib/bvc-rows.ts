/**
 * Rows of the BVC voter list from the text pieces of its PDF pages. Each page
 * has a division heading ("XvKv wefvM"), a column header (voter no, name,
 * reg no, address) and rows; a long name wraps onto a second line, so pieces
 * belong to the nearest row number at or above them. Addresses are skipped:
 * we keep only the number, the name and the division.
 *
 * Pure (no PDF library), so scripts/lib/bvc-rows.test.ts checks it on its own.
 */
import { bijoyToUnicode } from "../../src/lib/bijoy.ts";

/** A text piece: Bijoy text, its left edge, baseline (up from the bottom) and width. */
export interface TextBit {
  s: string;
  x: number;
  y: number;
  w: number;
}

export interface VoterRow {
  voterNo: number;
  /** As printed (ASCII digits, leading zeros kept). */
  regNo: string;
  /** Unicode Bangla; "" when the PDF's text for it can't be read (see `readable`). */
  name: string;
  /**
   * False when the name was typed in a Unicode font whose PDF text is broken
   * (only some letters come out). The row is kept so the admin can open the
   * page, but the name is not compared.
   */
  readable: boolean;
  division: string | null;
  page: number;
}

export interface PageState {
  division: string | null;
  regX: number | null;
  /** The last row of the previous page, for a name that wraps onto this one. */
  last: VoterRow | null;
}

const SAME_LINE = 2.5;
/** How far above the first row number a piece may sit and still be part of that row. */
const ROW_SLACK = 5;
const ROW_NO = /^(\d{1,5})\.?$/;
/** Bangla letters in the PDF text: Bijoy text has none, so these come from a broken font. */
const UNICODE_BN = /[\u0980-\u09FF]/;
/** A reg no piece; Bangla digits here come from the broken font and spoil the number. */
const REG_NO = /^[\d\u09E6-\u09EF]{1,5}$/;
/** Text below this baseline is the page footer (file name, page number). */
const FOOTER_Y = 60;

/** Pieces on one line, left to right, with a space where there is a gap. */
function joinLine(bits: TextBit[]): string {
  const sorted = [...bits].sort((a, b) => a.x - b.x);
  let out = "";
  let end = -Infinity;
  for (const b of sorted) {
    out += out && b.x > end + 1.5 ? ` ${b.s}` : b.s;
    end = b.x + b.w;
  }
  return out.trim();
}

/** Pieces grouped into lines, top line first. */
function lines(bits: TextBit[]): TextBit[][] {
  const out: TextBit[][] = [];
  for (const b of [...bits].sort((p, q) => q.y - p.y)) {
    const line = out.at(-1);
    const first = line?.[0];
    if (line && first && Math.abs(first.y - b.y) <= SAME_LINE) line.push(b);
    else out.push([b]);
  }
  return out;
}

const DIVISION = /(বিভাগ|ভেটেরিনারিয়ান)\s*$/;
const DIVISIONS = ["ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী", "রংপুর", "খুলনা", "বরিশাল", "ময়মনসিংহ"];
const letters = (s: string) => new Set(s.normalize("NFD").match(/[\u0995-\u09B9]/g) ?? []);

/**
 * A heading in the broken font keeps only some letters ("ম মস"): the division
 * whose name has all of them, when exactly one does.
 */
export function guessDivision(broken: string): string | null {
  const seen = letters(broken);
  if (seen.size < 2) return null;
  const fits = DIVISIONS.filter((d) => [...seen].every((l) => letters(d).has(l)));
  return fits.length === 1 && fits[0] ? `${fits[0]} বিভাগ` : null;
}

/** The rows on one page. `state` carries the division and columns between pages. */
export function pageRows(bits: TextBit[], page: number, state: PageState): VoterRow[] {
  const text = bits.filter((b) => b.s.trim() && b.y > FOOTER_Y);
  const header = lines(text).find((l) => l.some((b) => b.s.trim() === "bvg"));
  const headerY = header?.[0]?.y ?? Infinity;
  // The reg column header may sit on two lines ("‡iwRt" over "bs").
  const regHead = text.find((b) => b.s.includes("iwRt") && Math.abs(b.y - headerY) < 8);
  if (regHead) state.regX = regHead.x;
  // The division heading is the line just above the column header.
  for (const l of lines(text.filter((b) => b.y > headerY + 8 && b.x > 300))) {
    const raw = joinLine(l);
    const t = bijoyToUnicode(raw);
    if (DIVISION.test(t)) state.division = t.replace(/\s+/g, " ");
    else if (UNICODE_BN.test(raw)) state.division = guessDivision(raw) ?? state.division;
  }
  const regX = state.regX;
  if (regX == null) return [];

  const body = text.filter((b) => b.y < headerY - SAME_LINE);
  const anchors = body.filter((b) => b.x < regX - 120 && ROW_NO.test(b.s.trim())).sort((a, b) => b.y - a.y);
  const rows = anchors.map((a) => ({
    anchor: a,
    name: [] as TextBit[],
    reg: [] as TextBit[],
  }));
  // The nearest row number (the upper one on a tie): rows are top-aligned on most
  // pages and centred on the number on others, and a wrapped line sits between.
  const top = anchors[0]?.y ?? -Infinity;
  const owner = (b: TextBit) => {
    if (b.y > top + ROW_SLACK) return undefined;
    let found: (typeof rows)[number] | undefined;
    for (const r of rows) {
      if (!found || Math.abs(r.anchor.y - b.y) < Math.abs(found.anchor.y - b.y)) found = r;
    }
    return found;
  };

  const carry: TextBit[] = [];
  for (const b of body) {
    if (anchors.includes(b)) continue;
    const isReg = b.x >= regX - 4 && b.x < regX + 40 && REG_NO.test(b.s.trim());
    const isName = !isReg && b.x > (anchors[0]?.x ?? 0) + 20 && b.x < regX - 4;
    if (!isReg && !isName) continue;
    const r = owner(b);
    if (!r) {
      if (isName) carry.push(b);
      continue;
    }
    (isReg ? r.reg : r.name).push(b);
  }
  const last = state.last;
  if (carry.length && last) {
    const raw = lines(carry).map(joinLine).join(" ");
    if (UNICODE_BN.test(raw)) Object.assign(last, { readable: false, name: "" });
    else if (last.readable) last.name = `${last.name} ${bijoyToUnicode(raw)}`.trim();
  }

  const out: VoterRow[] = [];
  for (const r of rows) {
    const no = Number(ROW_NO.exec(r.anchor.s.trim())?.[1]);
    const raw = lines(r.name).map(joinLine).join(" ");
    const readable = !UNICODE_BN.test(raw);
    out.push({
      voterNo: no,
      // One number per row; two mean a row number was missed, so trust neither.
      regNo: r.reg.length !== 1 || UNICODE_BN.test(r.reg[0]?.s ?? "") ? "" : (r.reg[0]?.s.trim() ?? ""),
      name: readable ? bijoyToUnicode(raw).replace(/\s+/g, " ").trim() : "",
      readable,
      division: state.division,
      page,
    });
  }
  state.last = out.at(-1) ?? state.last;
  return out;
}
