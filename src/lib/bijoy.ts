/**
 * Bijoy (SutonnyMJ) text to Unicode Bangla. Government PDFs such as the BVC
 * voter list are typed in Bijoy: the letters are ASCII/Latin-1 characters
 * drawn with a Bangla font, so "Wvt" is "ডাঃ". This maps them back and puts
 * the vowel signs and reph where Unicode wants them.
 *
 * Used by scripts/bvc-import.ts; pure, so it is tested on its own.
 */

/** Stands in for the Bijoy reph (©) until it is moved; private use, never in real text. */
const REPH = "\uE000";

/** Several characters for one Unicode piece; tried longest first. */
const MULTI: Record<string, string> = {
  Av: "আ",
  "i¨": "র‍্য",
  "ª¨": "্র্য",
  "¯Œ": "স্ক্র",
  "K¡": "ক্ব",
  "K¬": "ক্ল",
  Mœ: "গ্ন",
  "M¥": "গ্ম",
  Mø: "গ্ল",
  "•¶": "ঙ্ক্ষ",
  "•L": "ঙ্খ",
  "•N": "ঙ্ঘ",
  "”P": "চ্চ",
  "”Q": "চ্ছ",
  "”T": "চ্ঞ",
  "¾¡": "জ্জ্ব",
  "R¡": "জ্ব",
  "U¡": "ট্ব",
  "U¥": "ট্ম",
  "š‘": "ন্তু",
  "Ë¡": "ত্ত্ব",
  Zœ: "ত্ন",
  "Z¥": "ত্ম",
  "šÍ¡": "ন্ত্ব",
  "Z¡": "ত্ব",
  "_¡": "থ্ব",
  "˜M": "দ্গ",
  "˜N": "দ্ঘ",
  "˜¡": "দ্ব",
  "™¢": "দ্ভ",
  aŸ: "ধ্ব",
  "a¥": "ধ্ম",
  "›U": "ন্ট",
  šÍ: "ন্ত",
  "š¿": "ন্ত্র",
  "š’": "ন্থ",
  "›`": "ন্দ",
  "›Ø": "ন্দ্ব",
  bœ: "ন্ন",
  "b¥": "ন্ম",
  cœ: "প্ন",
  cø: "প্ল",
  "d¬": "ফ্ল",
  eŸ: "ব্ব",
  eø: "ব্ল",
  gœ: "ম্ন",
  "¤ú": "ম্প",
  "¤^": "ম্ব",
  "¤¢": "ম্ভ",
  "¤£": "ম্ভ্র",
  "¤§": "ম্ম",
  "¤ø": "ম্ল",
  iæ: "রু",
  iƒ: "রূ",
  "j¦": "ল্ব",
  "j¥": "ল্ম",
  jø: "ল্ল",
  kœ: "শ্ন",
  "k¦": "শ্ব",
  "k¥": "শ্ম",
  kø: "শ্ল",
  "®‹": "ষ্ক",
  "®Œ": "ষ্ক্র",
  "®ú": "ষ্প",
  "®§": "ষ্ম",
  "¯‹": "স্ক",
  "¯Í": "স্ত",
  "¯‘": "স্তু",
  "¯’": "স্থ",
  mœ: "স্ন",
  "¯ú": "স্প",
  "¯^": "স্ব",
  "¯§": "স্ম",
  "¯ø": "স্ল",
  nè: "হ্ণ",
  nŸ: "হ্ব",
  "n¬": "হ্ল",
  "„„": "ৃ",
};

/** One character for one Unicode piece. */
const SINGLE: Record<string, string> = {
  // Conjuncts drawn as one glyph.
  "°": "ক্ক",
  "±": "ক্ট",
  "³": "ক্ত",
  µ: "ক্র",
  "¶": "ক্ষ",
  ÿ: "ক্ষ",
  "·": "ক্স",
  "•": "ক্স",
  "¸": "গু",
  "»": "গ্ধ",
  "¼": "ঙ্ক",
  "½": "ঙ্গ",
  "¾": "জ্জ",
  À: "জ্ঝ",
  Á: "জ্ঞ",
  Â: "ঞ্চ",
  Ã: "ঞ্ছ",
  Ä: "ঞ্জ",
  Å: "ঞ্ঝ",
  Æ: "ট্ট",
  Ç: "ড্ড",
  È: "ণ্ট",
  É: "ণ্ঠ",
  Ê: "ণ্ড",
  Ë: "ত্ত",
  Ì: "ত্থ",
  Î: "ত্র",
  Ï: "দ্দ",
  "×": "দ্ধ",
  Ø: "দ্ব",
  Ù: "দ্ম",
  Ú: "ন্ঠ",
  Û: "ন্ড",
  Ü: "ন্ধ",
  Ý: "ন্স",
  Þ: "প্ট",
  ß: "প্ত",
  à: "প্প",
  á: "প্স",
  â: "ব্জ",
  ã: "ব্দ",
  ä: "ব্ধ",
  å: "ভ্র",
  ç: "ম্ফ",
  é: "ল্ক",
  ê: "ল্গ",
  ë: "ল্ট",
  ì: "ল্ড",
  í: "ল্প",
  î: "ল্ফ",
  ï: "শু",
  ð: "শ্চ",
  ñ: "শ্ছ",
  ò: "ষ্ণ",
  ó: "ষ্ট",
  ô: "ষ্ঠ",
  õ: "ষ্ফ",
  ö: "স্খ",
  "÷": "স্ট",
  ù: "স্ফ",
  û: "হু",
  ü: "হৃ",
  ý: "হ্ন",
  þ: "হ্ম",
  // Half letters that join the next one.
  "¯": "স্",
  "¤": "ম্",
  š: "ন্",
  "›": "ন্",
  "®": "ষ্",
  "˜": "দ্",
  "™": "দ্",
  // Letters.
  A: "অ",
  B: "ই",
  C: "ঈ",
  D: "উ",
  E: "ঊ",
  F: "ঋ",
  G: "এ",
  H: "ঐ",
  I: "ও",
  J: "ঔ",
  K: "ক",
  L: "খ",
  M: "গ",
  N: "ঘ",
  O: "ঙ",
  P: "চ",
  Q: "ছ",
  R: "জ",
  S: "ঝ",
  T: "ঞ",
  U: "ট",
  V: "ঠ",
  W: "ড",
  X: "ঢ",
  Y: "ণ",
  Z: "ত",
  _: "থ",
  "`": "দ",
  a: "ধ",
  b: "ন",
  c: "প",
  d: "ফ",
  e: "ব",
  f: "ভ",
  g: "ম",
  h: "য",
  i: "র",
  j: "ল",
  k: "শ",
  l: "ষ",
  m: "স",
  n: "হ",
  o: "ড়",
  p: "ঢ়",
  q: "য়",
  r: "ৎ",
  s: "ং",
  t: "ঃ",
  u: "ঁ",
  // Vowel signs (ি ে ৈ come before their letter in Bijoy; fixed below).
  v: "া",
  w: "ি",
  x: "ী",
  y: "ু",
  z: "ু",
  "“": "ু",
  æ: "ু",
  "~": "ূ",
  ƒ: "ূ",
  "‚": "ূ",
  "„": "ৃ",
  "…": "ৃ",
  "†": "ে",
  "‡": "ে",
  ˆ: "ৈ",
  "‰": "ৈ",
  Š: "ৗ",
  // Signs after a letter: ্র ্য ্ব ্ম ্ল ্ন… and reph (র্, moved before its letter below).
  ª: "্র",
  Ö: "্র",
  "«": "্র",
  "¨": "্য",
  "&": "্",
  "^": "্ব",
  "¦": "্ব",
  Ÿ: "্ব",
  "¡": "্ব",
  "¢": "্ভ",
  "£": "্ভ্র",
  "¥": "্ম",
  "§": "্ম",
  "¬": "্ল",
  ø: "্ল",
  œ: "্ন",
  è: "্ণ",
  "‹": "্ক",
  Œ: "্ক্র",
  ú: "্প",
  Í: "্ত",
  "‘": "্তু",
  "’": "্থ",
  // Reph: a marker until it is moved in front of its letter (see REPH).
  "©": REPH,
  // Punctuation and digits.
  "|": "।",
  Ñ: "—",
  Ò: "“",
  Ó: "”",
  Ô: "‘",
  Õ: "’",
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

/**
 * Look-alikes some PDFs put in place of the Bijoy character (a Word-to-PDF
 * export maps a few glyphs to the wrong code): read them as the original.
 */
const ALIASES: Record<string, string> = {
  "\u203C": "†", // ‼ for †
  "\u203D": "‡", // ‽ for ‡
  "\u2023": "‰", // ‣ for ‰
  "\u2024": "Š", // ․ for Š
  "\u2025": "‹", // ‥ for ‹
  "\u201B": "”", // ‛ for ”
  "\u03BC": "µ", // Greek mu for the micro sign
  "\u00D0": "Ê", // Ð for Ê
  "\u20AC": "", // a stray € before some names
};
const ALIAS = new RegExp(`[${Object.keys(ALIASES).join("")}]`, "g");

const MULTI_KEYS = Object.keys(MULTI).sort((a, b) => b.length - a.length);

// A consonant (with nukta), optionally joined to more by hasanta: ক, ক্ষ, স্ত্র, প্র.
const C = "[\\u0995-\\u09B9\\u09CE\\u09DC\\u09DD\\u09DF]\\u09BC?";
const CLUSTER = `${C}(?:\\u09CD${C})*`;
const PRE_BASE = new RegExp(`([\\u09BF\\u09C7\\u09C8])(${CLUSTER})`, "g");
// Reph after its letter and the letter's vowel signs: move it in front.
const REPH_AFTER = new RegExp(`(${CLUSTER})([\\u09BE-\\u09C4\\u09C7\\u09C8\\u09D7]*)\\uE000`, "g");

/**
 * Converts Bijoy text to Unicode. Characters that are already Bangla or are
 * plain spaces pass through, so running it twice is harmless for Unicode.
 */
export function bijoyToUnicode(text: string): string {
  const input = text
    .replace(ALIAS, (c) => ALIASES[c] ?? c)
    // Some copies type ৈ with the ক্স key (• or ·): at the start of a word, where
    // ক্স can't be, it is ৈ ("•mq`" is সৈয়দ).
    .replace(/(^|[\s\-.(])[\u2022\u00B7]/g, "$1ˆ");
  let out = "";
  for (let i = 0; i < input.length;) {
    const multi = MULTI_KEYS.find((k) => input.startsWith(k, i));
    if (multi) {
      out += MULTI[multi];
      i += multi.length;
      continue;
    }
    const ch = input[i] ?? "";
    out += SINGLE[ch] ?? ch;
    i += 1;
  }
  return (
    out
      // A half letter followed by a sign that starts with ্ ("ন্" + "্ত").
      .replace(/\u09CD\u09CD/g, "\u09CD")
      // ি ে ৈ typed before the letter go after it.
      .replace(PRE_BASE, "$2$1")
      // Reph typed after its letter goes before it.
      .replace(REPH_AFTER, "\u09B0\u09CD$1$2")
      .replace(/\uE000/g, "\u09B0\u09CD")
      // উ/ঊ/ঋ-kar typed before ্য or ্র ("দু্য") goes after it ("দ্যু").
      .replace(/([\u09C1-\u09C4])(\u09CD[\u09AF\u09B0])/g, "$2$1")
      // A hasanta between a vowel sign and ঁ, and a vowel sign typed twice (or া after আ), are typos.
      .replace(/([\u09BE-\u09CC])\u09CD(?=\u0981)/g, "$1")
      .replace(/\u0986\u09BE/g, "\u0986")
      .replace(/([\u09BE-\u09CC])\1+/g, "$1")
      // ে + া = ো, ে + ৗ = ৌ.
      .replace(/\u09C7\u09BE/g, "\u09CB")
      .replace(/\u09C7\u09D7/g, "\u09CC")
      .normalize("NFC")
  );
}
