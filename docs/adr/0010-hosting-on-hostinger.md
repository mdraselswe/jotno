# 0010. Production hosting moves to Hostinger

**Status:** accepted · **Date:** 2026-11-24 · Replaces the hosting and cron parts of 0007

## Context

0007 put Jotno on Cloudflare Workers (OpenNext). In practice Workers can't serve Next.js Cache Components yet: requests that use `"use cache"` hang, and later ones fail with "promise was created by a request that has since ended" (OpenNext PR 1318 is not merged). The free Workers plan also allows only 10 ms of CPU per request. Netlify's free plan worked but runs functions in us-east-2 only, far from Bangladesh. Vercel's free plan is for non-commercial use, and the owner did not want a card on file.

## Decision

- **Hostinger Business ("Unlimited") web hosting, Node.js web app**, data center Malaysia, domain `jotnocare.com`. Hostinger builds from GitHub `main` on every push (`pnpm run build`, Node 24, `output: "standalone"` merged in by Hostinger).
- The shared server lets one account run only ~115 processes + threads. `BUILD_CPUS=2` (env var) makes the build fit: `scripts/build.ts` pins `next build` to 2 CPUs with `taskset`, and `next.config.ts` runs Turbopack loaders, page data and prerendering in worker threads and skips the type check (CI keeps it).
- **Scheduled jobs**: Supabase `pg_cron` + `pg_net` POST to `/api/cron/frequent/` every 5 minutes and `/api/cron/daily/` at 02:00 UTC, with `CRON_SECRET` from Supabase Vault (`jotno_cron_secret`). This replaces Cloudflare Cron Triggers.
- The Cloudflare (`deploy.yml`) and Netlify (`deploy-netlify.yml`) workflows stay, run by hand only, so a move back stays cheap.

## Consequences

- 120 s request limit, no WebSocket server (Realtime is on Supabase, so it's fine), an idle app sleeps and cold-starts; the 5-minute cron keeps it warm.
- Setup and limits: docs/launch.md → "Production host".
