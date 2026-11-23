/**
 * Patches the OpenNext Cloudflare bundle after `opennextjs-cloudflare build`.
 *
 * Next.js 16.4 lets a request join another request's in-flight "use cache" fill
 * (cross-request dedupe). On Cloudflare Workers that fill's I/O belongs to the
 * first request: once it ends, every request waiting on it hangs ("Worker's code
 * had hung", error 1101). Until OpenNext handles it
 * (github.com/opennextjs/opennextjs-cloudflare/issues/1464), turn the dedupe off
 * in the Worker bundle only. Each request then fills the cache entry itself.
 *
 * Fails when nothing matched, so a Next.js upgrade that moves the code can't
 * silently ship a Worker that hangs.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".open-next/server-functions";
const PATCHES: [RegExp, string][] = [
  // Readable source (next/dist/server/use-cache/use-cache-wrapper.js).
  [/const skipCrossRequestDedupe = [^;]+;/g, "const skipCrossRequestDedupe = true;"],
  // Minified Turbopack chunks: `let x=a&&!0||w.isDraftMode;try{for(;`
  [/([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*&&!0\|\|[A-Za-z_$][\w$]*\.isDraftMode;(?=try\{for\(;)/g, "$1=!0;"],
];

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(c|m)?js$/.test(name)) yield path;
  }
}

let patched = 0;
for (const file of files(ROOT)) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("isDraftMode")) continue;
  let next = source;
  for (const [pattern, replacement] of PATCHES) next = next.replace(pattern, replacement);
  if (next !== source) {
    writeFileSync(file, next);
    patched++;
    console.log(`patch-open-next: cross-request "use cache" dedupe off in ${file}`);
  }
}

if (patched === 0) {
  console.error(
    'patch-open-next: found no "use cache" dedupe flag to turn off. Next.js changed: check issue 1464 and update this script.',
  );
  process.exit(1);
}
