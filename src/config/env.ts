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
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const serverSchema = z.object({
  /** Postgres connection string (local: postgresql://postgres:postgres@127.0.0.1:54322/postgres). */
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
  /** Supabase service role key: storage uploads and admin auth calls. Server only. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  /** "mock" (demo and tests) or "sslcommerz". */
  PAYMENT_PROVIDER: z.enum(["mock", "sslcommerz"]).default("mock"),
  SSLCOMMERZ_STORE_ID: z.string().default(""),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default(""),
  SSLCOMMERZ_SANDBOX: flag.default(true),
  /** Shared secret for /api/cron/* (GitHub Actions schedule sends it). */
  CRON_SECRET: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:hello@jotnocare.com"),
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
  NODE_ENV: process.env.NODE_ENV,
});

/** Server-only values. Never import this from a client component. */
export const serverEnv = () => serverSchema.parse(process.env);
