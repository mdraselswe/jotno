/**
 * Loads a BVC voter list PDF into the BVC register (bvc_register): reg no,
 * Bangla name and division per vet; addresses are not kept. Run it again when
 * BVC publishes a new list: rows are matched on the reg no, so existing vets
 * are updated and new ones added, never doubled.
 *
 *   pnpm bvc:import <file.pdf> --title "Final voter list 2026" \
 *     --url https://bvc.gov.bd/… --published 2026-05-14 [--dry-run]
 *
 * DATABASE_URL comes from the environment or .env.local (the local database
 * by default). --dry-run reads the PDF and prints what it found, nothing else.
 * Single additions (a registration notice) go in by hand on /admin/bvc.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import postgres from "postgres";
import { nameKey } from "../src/lib/bangla-name.ts";
import { bvcKey } from "../src/lib/bvc.ts";
import { pageRows, type PageState, type TextBit, type VoterRow } from "./lib/bvc-rows.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    title: { type: "string" },
    url: { type: "string" },
    published: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
const file = positionals[0];
if (!file || !existsSync(file)) {
  console.error("Usage: pnpm bvc:import <file.pdf> --title … [--url …] [--published YYYY-MM-DD] [--dry-run]");
  process.exit(1);
}
if (values.published && !/^\d{4}-\d{2}-\d{2}$/.test(values.published)) {
  console.error("--published must look like 2026-05-14.");
  process.exit(1);
}
const dryRun = values["dry-run"];

const bytes = readFileSync(file);
const hash = createHash("sha256").update(bytes).digest("hex");
const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;

const state: PageState = { division: null, regX: null, last: null };
const rows: VoterRow[] = [];
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  const bits: TextBit[] = [];
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    bits.push({ s: item.str, x: item.transform[4] ?? 0, y: item.transform[5] ?? 0, w: item.width });
  }
  rows.push(...pageRows(bits, n, state));
  page.cleanup();
}

// One row per reg no; a readable one wins over an unreadable one, else the first.
const byKey = new Map<string, VoterRow>();
const doubled: VoterRow[] = [];
const noReg: VoterRow[] = [];
const odd: VoterRow[] = [];
for (const r of rows) {
  const key = bvcKey(r.regNo);
  if (!key) {
    noReg.push(r);
    continue;
  }
  // Latin letters or symbols left in a name mean the converter missed a character.
  if (/[^ঀ-৿\s.,:;'()\-–—]/.test(r.name)) odd.push(r);
  const seen = byKey.get(key);
  if (seen) doubled.push(r);
  if (!seen || (!seen.readable && r.readable)) byKey.set(key, r);
}

const voterNos = new Set(rows.map((r) => r.voterNo));
const maxVoter = Math.max(0, ...voterNos);
const gaps = Array.from({ length: maxVoter }, (_, i) => i + 1).filter((n) => !voterNos.has(n));
const divisions = new Map<string, number>();
for (const r of byKey.values()) divisions.set(r.division ?? "?", (divisions.get(r.division ?? "?") ?? 0) + 1);

const show = (r: VoterRow) =>
  `  #${r.voterNo} p${r.page} ${r.regNo || "—"} ${r.name || "—"} (${r.division ?? "?"})`;
console.log(`${file}: ${doc.numPages} pages, ${rows.length} rows, ${byKey.size} reg numbers.`);
console.log(
  `Voter numbers 1–${maxVoter}; missing: ${gaps.length}${gaps.length ? ` (${gaps.slice(0, 20).join(", ")}…)` : ""}`,
);
for (const [d, n] of divisions) console.log(`  ${d}: ${n}`);
const unreadable = [...byKey.values()].filter((r) => !r.readable);
console.log(`Names the PDF text can't give (kept with reg no and page): ${unreadable.length}`);
if (noReg.length)
  console.log(
    `Rows without a readable reg no (skipped): ${noReg.length}\n${noReg.slice(0, 10).map(show).join("\n")}`,
  );
if (doubled.length)
  console.log(
    `Reg numbers listed twice (first kept): ${doubled.length}\n${doubled.slice(0, 10).map(show).join("\n")}`,
  );
if (odd.length)
  console.log(`Names with unconverted characters: ${odd.length}\n${odd.slice(0, 10).map(show).join("\n")}`);
const all = [...byKey.values()];
console.log("Samples:");
for (const r of [0, 1, 2, Math.floor(all.length / 2), all.length - 2, all.length - 1].flatMap(
  (i) => all[i] ?? [],
))
  console.log(show(r));

if (dryRun) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql.begin(async (tx) => {
    const [source] = await tx<{ id: string }[]>`
      insert into public.bvc_sources (title, url, published_on, file_hash, row_count)
      values (${values.title ?? file}, ${values.url ?? null}, ${values.published ?? null}, ${hash}, ${byKey.size})
      on conflict (file_hash) do update set title = excluded.title, url = excluded.url,
        published_on = excluded.published_on, row_count = excluded.row_count
      returning id`;
    if (!source) throw new Error("Could not record the source.");
    const records = all.map((r) => ({
      reg_key: bvcKey(r.regNo) ?? "",
      reg_no: r.regNo,
      name_bn: r.readable && r.name ? r.name : null,
      name_key: r.readable ? nameKey(r.name) : null,
      division: r.division,
      source_id: source.id,
      page: r.page,
    }));
    for (let i = 0; i < records.length; i += 500) {
      await tx`
        insert into public.bvc_register ${tx(records.slice(i, i + 500))}
        on conflict (reg_key) do update set reg_no = excluded.reg_no, name_bn = excluded.name_bn,
          name_key = excluded.name_key, division = excluded.division, source_id = excluded.source_id,
          page = excluded.page, updated_at = now()
        -- A list with an unreadable name doesn't wipe a name read from an earlier one.
        where excluded.name_bn is not null or bvc_register.name_bn is null`;
    }
    const [{ count } = { count: 0 }] = await tx<
      { count: number }[]
    >`select count(*)::int as count from public.bvc_register`;
    console.log(`Saved ${records.length} rows. The register now has ${count} vets.`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
