# 0007. Jotno platform: data, money, jobs and hosting

**Status:** accepted · **Date:** 2026-11-22

## Context

Jotno is a vet marketplace for Bangladesh (owners, vets, admins) with paid chat consults, clinic bookings, featured listings and a small shop. It runs on free tiers until it earns, is Bangla first, and is used mostly on phones.

## Decision

- **Server mode, locked** (`site.renderLocked`): auth, payments and per-person pages need a server. Hosted on **Cloudflare Workers** through OpenNext (free plan allows commercial use), first on `jotno.<sub>.workers.dev`, a custom domain later.
- **Supabase** for Postgres, Auth (email OTP, Google later), Storage (`media` public bucket, `private` bucket with signed URLs) and Realtime (chat). App code talks to Postgres through **Drizzle + postgres.js** (`prepare: false` for the transaction pooler); RLS stays on for every table as defence in depth, and the server checks ownership itself.
- **Money** is integer poisha. Every money event is a `ledger_entries` row; balances are sums, never stored. Payment settlement is idempotent: a payment moves `pending → paid` once (conditional update + unique gateway transaction id), and the amount must match. The gateway sits behind an adapter (`mock` for demo/tests, `sslcommerz` live).
- **Scheduled jobs** (chat refunds/closing, booking holds, reminders) are idempotent route handlers under `/api/cron/<job>`, protected by `CRON_SECRET`. Cloudflare **Cron Triggers** call them through a small wrapper (`worker/cron-worker.js`), because a 5-minute GitHub schedule on a private repo would spend the free Actions minutes.
- **Web push** with VAPID and RFC 8291 encryption in pure WebCrypto (`src/infrastructure/push`), so it runs on Workers without Node crypto.
- **Uploads** go from the browser straight to Storage with signed upload URLs; images are compressed to WebP in the browser first. Paths are `<kind>/<userId>/<uuid>.<ext>` and the server checks ownership before saving a path.
- **Content trust**: vets show as verified only after an admin checks the BVC register; questions and answers can be reported and hidden; article bodies are plain text with three light rules, never HTML.
- **Backups**: a nightly `pg_dump` artifact (GitHub Actions, 14 days), since the free plan has no point-in-time restore.

## Consequences

- OpenNext must support the Next.js major in use (checked on upgrade; 1.20.x supports 16.4.5+). Its build runs only in CI (Linux).
- Refunds for vet-cancelled bookings and cancelled shop orders are manual for now (admin uses the gateway's panel); chat refunds are automatic.
- Legal pages are drafts until a Bangladeshi lawyer reviews them; first-aid text until a vet reviews it.
