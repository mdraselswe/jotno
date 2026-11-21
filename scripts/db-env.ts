/**
 * Writes the local Supabase keys (and generated secrets) into .env.local, so
 * `pnpm dev` talks to the local database. Keeps every other line as it is.
 *
 *   pnpm db:start && pnpm db:env
 *
 * Also creates, once: CRON_SECRET and a VAPID key pair for web push.
 */
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = ".env.local";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (key: string) => new RegExp(`^${key}=.+$`, "m").test(current);

const status = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const local: Record<string, string> = {};
for (const line of status.split(/\r?\n/)) {
  const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
  if (match?.[1] && match[2] !== undefined) local[match[1]] = match[2];
}

const values: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.PUBLISHABLE_KEY ?? local.ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: local.SECRET_KEY ?? local.SERVICE_ROLE_KEY ?? "",
  DATABASE_URL: local.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  NEXT_PUBLIC_DEMO: "true",
  PAYMENT_PROVIDER: "mock",
};

if (!has("CRON_SECRET")) values.CRON_SECRET = randomBytes(24).toString("base64url");
if (!has("VAPID_PRIVATE_KEY")) {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  const raw = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(pub.x ?? "", "base64url"),
    Buffer.from(pub.y ?? "", "base64url"),
  ]);
  values.NEXT_PUBLIC_VAPID_PUBLIC_KEY = raw.toString("base64url");
  values.VAPID_PRIVATE_KEY = priv.d ?? "";
}

const BEGIN = "# ── Local Supabase (written by pnpm db:env) ──";
const END = "# ── end of pnpm db:env ──";
const kept = current.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`), "");
const generatedOnce = ["CRON_SECRET", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
const block = [
  BEGIN,
  ...Object.entries(values)
    .filter(([key]) => !generatedOnce.includes(key))
    .map(([key, value]) => `${key}=${value}`),
  END,
  "",
].join("\n");
const once = Object.entries(values)
  .filter(([key]) => generatedOnce.includes(key))
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

writeFileSync(
  file,
  `${block}${kept.trimEnd()}\n${once ? `\n# Generated once by pnpm db:env\n${once}\n` : ""}`,
);
console.log(`db:env: wrote local Supabase keys to ${file}`);
