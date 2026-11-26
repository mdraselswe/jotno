/**
 * Comparing a vet's name as on their NID with the name in the BVC register.
 * Both are Bangla, but spelt by different people: "ডাঃ মোঃ আসাদুল ইসলাম" and
 * "আসাদুল ইসলাম" are the same person, "সুদীপ দেবনাথ" and "সুদীপ দেব নাথ" too.
 * The result only guides the admin; the list is public, so a match is not proof.
 */

/** Titles and short forms that are left out or written differently. */
const TITLES = new Set([
  "ডাঃ",
  "ডা",
  "ডাক্তার",
  "ড",
  "মোঃ",
  "মো",
  "মোহাম্মদ",
  "মোহাম্মাদ",
  "মুহাম্মদ",
  "মুহাম্মাদ",
  "মোহম্মদ",
  "মুহম্মদ",
  "মোছাঃ",
  "মোসাঃ",
  "মোছা",
  "মোসা",
  "মোছাম্মৎ",
  "মোসাম্মৎ",
  "মোসাম্মাৎ",
  "মোছাম্মাৎ",
  "dr",
  "md",
  "mohammad",
  "muhammad",
  "mohammed",
]);

/** Letters people swap when spelling a name: ী/ি, ূ/ু, ণ/ন, শ/ষ/স, য়/য, ড়/র, ঁ dropped. */
const FOLD: [RegExp, string][] = [
  [/ী/g, "ি"],
  [/ূ/g, "ু"],
  [/ণ/g, "ন"],
  [/[শষ]/g, "স"],
  [/য়/g, "য"],
  [/[ডঢ]়/g, "র"],
  [/ৎ/g, "ত"],
  [/ঁ/g, ""],
];

/** The words of a name without titles, punctuation or spelling differences. */
export function nameWords(name: string | null | undefined): string[] {
  if (!name) return [];
  return name
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.,:;'"()\-–—/\\|।]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !TITLES.has(w) && !TITLES.has(w.replace(/ঃ$/, "")))
    .map((w) => {
      // NFD splits য় ড় ঢ় into letter + nukta, which FOLD expects.
      let s = w.normalize("NFD").replace(/ঃ/g, "");
      for (const [from, to] of FOLD) s = s.replace(from, to);
      return s;
    })
    .filter(Boolean);
}

/** True when the text has Bangla letters (the NID name must be written in Bangla). */
export function hasBangla(text: string | null | undefined): boolean {
  return /[\u0985-\u09B9]/.test(text ?? "");
}

/** Edit distance between two short strings. */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}

export type NameMatch = "same" | "close" | "different";

/**
 * "same": the same words (spaces and common spelling swaps aside);
 * "close": one name is the other plus or minus a word, or a letter or two off;
 * "different": anything else, or a name is missing.
 */
export function compareNames(a: string | null | undefined, b: string | null | undefined): NameMatch {
  const wa = nameWords(a);
  const wb = nameWords(b);
  if (wa.length === 0 || wb.length === 0) return "different";
  const ja = wa.join("");
  const jb = wb.join("");
  if (ja === jb) return "same";
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  if (short.length >= 2 && short.every((w) => long.includes(w))) return "close";
  const d = distance(ja, jb);
  return d / Math.max(ja.length, jb.length) <= 0.2 ? "close" : "different";
}

/** A short key for comparing names in the database: the folded words joined. */
export function nameKey(name: string | null | undefined): string | null {
  const key = nameWords(name).join("");
  return key || null;
}
