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
  /** Baseline of the row number on its page, to cut the row out of the page image. */
  y: number;
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
/** Bangla letters (and দাঁড়ি) in the PDF text: Bijoy text has none, so these come from a broken font. */
const UNICODE_BN = /[\u0964\u0965\u0980-\u09FF]/;
/** A reg no piece; Bangla digits here come from the broken font and spoil the number. */
const REG_NO = /^[\d\u09E6-\u09EF]{1,5}$/;
/** Text below this baseline is the page footer (file name, page number). */
const FOOTER_Y = 47;

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

/** "-ঢাকা বিভাগ সমাপ্ত-": the line under a division's last row, which sits in the name column. */
const DIVISION_END = /\s*-\s*\S+\s+বিভাগ(?:\s+সমাপ্ত)?\s*-?\s*$/;
/** A reg no typed in Bangla digits lands in the name column on some pages. */
const TRAILING_REG = /\s+([\u09E6-\u09EF]{1,5})$/;

/** The name without the division's end line, and the reg no from it when the reg column had none. */
function cleanName(name: string, regNo: string): { name: string; regNo: string } {
  let clean = name.replace(/\s+/g, " ").trim().replace(DIVISION_END, "");
  const typed = TRAILING_REG.exec(clean)?.[1];
  if (typed && !regNo) {
    clean = clean.slice(0, -typed.length).trim();
    return { name: clean, regNo: typed.replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09e6)) };
  }
  return { name: clean, regNo };
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
  const inRegColumn = (b: TextBit) => b.x >= regX - 4 && b.x < regX + 40 && REG_NO.test(b.s.trim());
  // Where each row's text sits. Usually on its number's line; but on some pages the
  // numbers sit at the bottom of tall cells and the text at the top. When there are
  // as many reg no lines as row numbers, each row's text is on its reg no's line.
  const regLines = lines(body.filter(inRegColumn)).map((l) => l[0]?.y ?? 0);
  const paired =
    regLines.length === anchors.length &&
    anchors.every((a, i) => Math.abs((regLines[i] ?? Infinity) - a.y) < 30);
  const rows = anchors.map((a, i) => ({
    anchor: a,
    line: paired ? (regLines[i] ?? a.y) : a.y,
    name: [] as TextBit[],
    reg: [] as TextBit[],
  }));
  // The nearest row (the upper one on a tie): rows are top-aligned on most pages and
  // centred on the number on others, and a wrapped line sits between.
  const top = Math.max(...rows.map((r) => r.line));
  const owner = (b: TextBit) => {
    if (b.y > top + ROW_SLACK) return undefined;
    let found: (typeof rows)[number] | undefined;
    for (const r of rows) {
      if (!found || Math.abs(r.line - b.y) < Math.abs(found.line - b.y)) found = r;
    }
    return found;
  };

  const carry: TextBit[] = [];
  for (const b of body) {
    if (anchors.includes(b)) continue;
    const isReg = inRegColumn(b);
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
    // One number per row; two mean a row number was missed, so trust neither.
    const reg = r.reg.length !== 1 || UNICODE_BN.test(r.reg[0]?.s ?? "") ? "" : (r.reg[0]?.s.trim() ?? "");
    out.push({
      voterNo: no,
      ...cleanName(readable ? bijoyToUnicode(raw) : "", reg),
      readable,
      division: state.division,
      page,
      y: Math.max(r.anchor.y, r.line),
    });
  }
  state.last = out.at(-1) ?? state.last;
  return out;
}

/** A row read by eye from the page image, for one the PDF text can't give. */
export interface RowFix {
  voterNo: number;
  page: number | null;
  regNo: string;
  /** "" when even the image can't show it (the font's glyphs are missing). */
  name: string;
}

/** One CSV line into fields: commas split, double quotes wrap a field ("" is a quote). */
function csvFields(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/**
 * The fixes file the import writes with --review and reads with --fixes:
 * `voter_no,page,reg_no,name_bn`, one row per line. Rows with a blank reg no
 * are left out (not read yet); a blank name keeps the row unreadable.
 */
export function parseFixes(text: string): RowFix[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const fixes: RowFix[] = [];
  for (const line of lines.slice(1)) {
    const [voter, page, reg, name] = csvFields(line);
    const voterNo = Number(voter);
    if (!Number.isInteger(voterNo) || voterNo <= 0 || !reg?.trim()) continue;
    fixes.push({
      voterNo,
      page: page && Number.isInteger(Number(page)) ? Number(page) : null,
      // Bangla digits typed in come out as ASCII, like the rest of the register.
      regNo: reg.replace(/\s+/g, "").replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09e6)),
      name: (name ?? "").replace(/\s+/g, " ").trim(),
    });
  }
  return fixes;
}

/** A CSV field, quoted when it needs to be. */
export const csvField = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A row to read by eye from the page image: its name or reg no didn't come through. */
export const needsReview = (r: VoterRow) => !r.readable || !r.name || !r.regNo;

/**
 * Rows read by eye put in place of the parsed ones (matched on the voter no); a
 * voter no the PDF text lost altogether is added, in its neighbour's division.
 */
export function applyFixes(
  rows: VoterRow[],
  fixes: RowFix[],
): { rows: VoterRow[]; changed: number; added: number } {
  const out = rows.map((r) => ({ ...r }));
  let changed = 0;
  let added = 0;
  for (const f of fixes) {
    const fixed = { regNo: f.regNo, name: f.name, readable: Boolean(f.name) };
    const same = out.filter((r) => r.voterNo === f.voterNo);
    if (same.length) {
      for (const r of same) Object.assign(r, fixed, { page: f.page ?? r.page });
      changed++;
      continue;
    }
    const before = out.filter((r) => r.voterNo < f.voterNo).at(-1) ?? out[0];
    out.push({
      voterNo: f.voterNo,
      ...fixed,
      division: before?.division ?? null,
      page: f.page ?? before?.page ?? 0,
      y: 0,
    });
    added++;
  }
  out.sort((a, b) => a.voterNo - b.voterNo);
  return { rows: out, changed, added };
}

/**
 * Rows whose reg no breaks the rising order of their division's list (the list
 * is sorted by reg no within each division): most likely misread, so check them.
 */
export function outOfOrder(rows: VoterRow[]): VoterRow[] {
  const withReg = rows.filter((r) => /^\d+$/.test(r.regNo)).sort((a, b) => a.voterNo - b.voterNo);
  const out: VoterRow[] = [];
  withReg.forEach((r, i) => {
    const near = (n: VoterRow | undefined) => (n && n.division === r.division ? Number(n.regNo) : null);
    const prev = near(withReg[i - 1]);
    const next = near(withReg[i + 1]);
    const v = Number(r.regNo);
    if (prev != null && next != null && prev <= next && (v < prev || v > next)) out.push(r);
  });
  return out;
}
