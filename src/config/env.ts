import { z } from "zod";
import { RENDER_MODES } from "./schema.ts";

/**
 * The only place that reads process.env (ESLint enforces this).
 * Every variable is listed in .env.example. Add server-only secrets to
 * `serverSchema` and import `serverEnv` only from server code.
 *
 * NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
 * they must be read with a literal `process.env.NEXT_PUBLIC_X`.
 */
const flag = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  /** Supabase project URL (local: http://127.0.0.1:54321). */
  NEXT_PUBLIC_SUPABASE_URL: z.url().default("http://127.0.0.1:54321"),
  /** Supabase publishable (anon) key; safe in the browser, RLS protects the data. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  /** Web push public key (VAPID). Empty: push is off. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().default(""),
  /** Pre-launch demo: shows a banner and allows the mock payment gateway. */
  NEXT_PUBLIC_DEMO: flag,
  /** Google sign-in button (true once the Google OAuth client is set up in Supabase). */
  NEXT_PUBLIC_GOOGLE_AUTH: flag,
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const buildSchema = z.object({
  RENDER_MODE: z.enum(RENDER_MODES).optional(),
  /**
   * Small shared build machines (Hostinger): build with this many CPUs. It pins
   * `next build` to them (scripts/build.ts), runs Turbopack's loaders in worker
   * threads and skips the type check (CI runs it). Unset: a normal build.
   * See docs/launch.md → Production host.
   */
  BUILD_CPUS: z.coerce.number().int().positive().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const serverSchema = z.object({
  /** Postgres connection string (local: postgresql://postgres:postgres@127.0.0.1:54322/postgres). */
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
  /** Supabase service role key: storage uploads and admin auth calls. Server only. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  /** "manual" (bKash/Nagad send money + trx id, cash on delivery; checked by an admin), "mock" or "sslcommerz". */
  PAYMENT_PROVIDER: z.enum(["manual", "mock", "sslcommerz"]).default("manual"),
  SSLCOMMERZ_STORE_ID: z.string().default(""),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default(""),
  SSLCOMMERZ_SANDBOX: flag.default(true),
  /** Shared secret for /api/cron/* (the Cloudflare cron worker sends it, worker/cron-worker.js). */
  CRON_SECRET: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:hello@jotnocare.com"),
  /**
   * Cloudflare Realtime TURN key (dashboard → Realtime → TURN). Relays calls that
   * can't connect directly (common on mobile data). Empty: STUN only, so some
   * calls won't connect. Free up to 1,000 GB a month.
   */
  CLOUDFLARE_TURN_KEY_ID: z.string().default(""),
  CLOUDFLARE_TURN_API_TOKEN: z.string().default(""),
  /** Comma-separated emails that become admin when they first sign in. */
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  NEXT_PUBLIC_DEMO: process.env.NEXT_PUBLIC_DEMO || undefined,
  NEXT_PUBLIC_GOOGLE_AUTH: process.env.NEXT_PUBLIC_GOOGLE_AUTH || undefined,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
});

export const buildEnv = buildSchema.parse({
  RENDER_MODE: process.env.RENDER_MODE || undefined,
  BUILD_CPUS: process.env.BUILD_CPUS || undefined,
  NODE_ENV: process.env.NODE_ENV,
});

let warned = false;
/**
 * Values a live site can't do without. Missing ones are logged loudly (once)
 * instead of failing quietly: payment expiry, refunds and chat closing never
 * run without CRON_SECRET, uploads fail without the service key, and a
 * DATABASE_URL left on localhost means the real database was never set.
 */
function warnMissing(env: z.infer<typeof serverSchema>) {
  if (warned || process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build")
    return;
  warned = true;
  const missing = [
    env.DATABASE_URL.includes("127.0.0.1") && "DATABASE_URL (still the local default)",
    !env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !env.CRON_SECRET && "CRON_SECRET",
    env.ADMIN_EMAILS.length === 0 && "ADMIN_EMAILS",
    !env.CLOUDFLARE_TURN_KEY_ID && "CLOUDFLARE_TURN_KEY_ID (calls on mobile data may not connect)",
  ].filter(Boolean);
  if (missing.length > 0)
    console.error(`[jotno] Missing production settings: ${missing.join(", ")}. See docs/launch.md.`);
}

/** Server-only values. Never import this from a client component. */
export const serverEnv = () => {
  const env = serverSchema.parse(process.env);
  warnMissing(env);
  return env;
};
