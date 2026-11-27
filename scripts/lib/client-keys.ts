/**
 * Which UI text keys can show up in the browser. Only these go into
 * src/i18n/client-messages.ts, the text LocaleProvider ships to the browser,
 * instead of every string in the catalogue (docs/adr/0012).
 *
 * A key counts when it appears as a string literal:
 * - anywhere in a client file (`"use client"`) or a file a client file imports
 *   (not `server-only`, `"use server"` or `/server/` files), or
 * - in any other file, except directly inside `t("…")`: a server file that
 *   hands a key to a client component (a nav label, an action's error) writes
 *   it without calling `t` there.
 * Template-literal keys (`t(\`pay.status.${s}\`)`) keep every key under their prefix.
 * Over-including is harmless; a missing key would show the key itself.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const KEY_DEF = /^\s*"([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)":/gm;
const LITERAL = /["'`]([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)["'`]/g;
const PREFIX = /`([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.)\$\{/g;
const IMPORT = /^\s*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+["']([^"']+)["']/gm;
const SIDE_IMPORT = /^\s*import\s+["']([^"']+)["']/gm;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveImport(src: string, from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(src, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

const isClient = (code: string) => /^\s*["']use client["']/.test(code);
const isServerOnly = (code: string, file: string) =>
  /^\s*import\s+["']server-only["']/m.test(code) ||
  /^\s*["']use server["']/.test(code) ||
  /[\\/]server[\\/]/.test(file);

export interface ClientKeys {
  /** Keys sent as they are. */
  keys: string[];
  /** Every key starting with one of these is sent too. */
  prefixes: string[];
  /** Browser-side files that import values from "@/i18n" (which loads the whole catalogue): should be none. */
  catalogueImports: string[];
}

/** Scans `<root>/src` for the keys the browser may need. */
export function scanClientKeys(root: string): ClientKeys {
  const src = path.join(root, "src");
  const messagesDir = path.join(src, "i18n", "messages");
  // The generated output lists every key it has: scanning it would keep them all forever.
  const generated = path.join(src, "i18n", "client-messages.ts");
  const files = sourceFiles(src).filter((f) => f !== generated);
  const isMessages = (f: string) => f.startsWith(messagesDir + path.sep);

  const defined = new Set<string>();
  for (const file of files.filter(isMessages))
    for (const m of readFileSync(file, "utf8").matchAll(KEY_DEF)) if (m[1]) defined.add(m[1]);

  // Client files and everything they import (minus server-only code and the catalogue itself).
  const reach = new Set<string>();
  const stack = files.filter((f) => isClient(readFileSync(f, "utf8")));
  while (stack.length > 0) {
    const file = stack.pop();
    if (!file || reach.has(file) || isMessages(file)) continue;
    const code = readFileSync(file, "utf8");
    if (!isClient(code) && isServerOnly(code, file)) continue;
    reach.add(file);
    for (const re of [IMPORT, SIDE_IMPORT])
      for (const m of code.matchAll(re)) {
        const next = m[1] ? resolveImport(src, file, m[1]) : null;
        if (next) stack.push(next);
      }
  }

  const keys = new Set<string>();
  const prefixes = new Set<string>();
  for (const file of files) {
    if (isMessages(file)) continue;
    const code = readFileSync(file, "utf8");
    const client = reach.has(file);
    for (const m of code.matchAll(LITERAL)) {
      const key = m[1];
      if (!key || !defined.has(key)) continue;
      // Server code translating it right there doesn't send it anywhere.
      if (!client && /\bt\(\s*$/.test(code.slice(Math.max(0, m.index - 16), m.index))) continue;
      keys.add(key);
    }
    for (const m of code.matchAll(PREFIX)) if (m[1]) prefixes.add(m[1]);
  }
  const catalogueImports = [...reach]
    .filter((f) => /^\s*import\s+(?!type\b)[^;]*?\bfrom\s+["']@\/i18n["']/m.test(readFileSync(f, "utf8")))
    .map((f) => path.relative(root, f).replaceAll("\\", "/"))
    .sort();
  return { keys: [...keys].sort(), prefixes: [...prefixes].sort(), catalogueImports };
}

/** The messages of one language that the browser may need. */
export function pickClientMessages(
  messages: Record<string, string>,
  { keys, prefixes }: Pick<ClientKeys, "keys" | "prefixes">,
): Record<string, string> {
  const wanted = new Set(keys);
  return Object.fromEntries(
    Object.entries(messages).filter(([k]) => wanted.has(k) || prefixes.some((p) => k.startsWith(p))),
  );
}

/** The generated src/i18n/client-messages.ts: per language, only the keys the browser may need. */
export function clientMessagesModule(
  catalogue: Record<string, Record<string, string>>,
  scan: Pick<ClientKeys, "keys" | "prefixes">,
): string {
  const locales = Object.keys(catalogue).sort();
  const body = locales
    .map((locale) => {
      const picked = pickClientMessages(catalogue[locale] ?? {}, scan);
      const lines = Object.keys(picked)
        .sort()
        .map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(picked[k])},`);
      return [`  ${JSON.stringify(locale)}: {`, ...lines, "  },"].join("\n");
    })
    .join("\n");
  return `/* Generated by scripts/generate-assets.ts (scripts/lib/client-keys.ts): do not edit. */
import type { Messages } from "./messages/en";

/** Per language, the UI text client components can use; LocaleProvider ships only this (docs/adr/0012). */
export const CLIENT_MESSAGES: Record<string, Partial<Messages>> = {
${body}
};
`;
}

let hooked = false;

/**
 * Loads src/i18n/messages (written for the bundler, with extensionless
 * imports) in plain Node: a resolve hook tries ".ts" and "/index.ts".
 */
export async function loadCatalogue(root: string): Promise<Record<string, Record<string, string>>> {
  if (!hooked) {
    hooked = true;
    registerHooks({
      resolve(specifier, context, next) {
        try {
          return next(specifier, context);
        } catch (error) {
          if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
          try {
            return next(`${specifier}.ts`, context);
          } catch {
            return next(`${specifier}/index.ts`, context);
          }
        }
      },
    });
  }
  const url = pathToFileURL(path.join(root, "src", "i18n", "messages", "index.ts")).href;
  const mod = (await import(url)) as { CATALOGUE: Record<string, Record<string, string>> };
  return mod.CATALOGUE;
}
