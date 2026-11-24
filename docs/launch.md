# Launch checklist

What's built, what needs a person, and the order to go live. Secrets go only in `.env.local` (local) or GitHub/Cloudflare secrets, never in git.

## 1. Accounts (you sign in yourself)

- [ ] **Supabase**: `npx supabase login`, then create the cloud project (region Singapore, closest to Bangladesh). Note the project ref, DB password, anon key and service role key.
- [ ] **Cloudflare** (separate account): Workers & Pages → pick a `workers.dev` subdomain. Create an API token with the "Edit Cloudflare Workers" template. Put `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env.local` and in GitHub secrets.
- [ ] **GitHub** repo secrets and variables: see the header of `.github/workflows/deploy.yml`. Create an environment named `production`.

## 2. Database

```bash
npx supabase link --project-ref <ref>
npx supabase db push            # migrations
psql "$DATABASE_URL_DIRECT" -f supabase/seeds/01_reference.sql   # districts, areas, species, breeds
psql "$DATABASE_URL_DIRECT" -f supabase/seeds/02_demo.sql        # optional: demo vets/Q&A for the preview
```

- Storage buckets `media` (public) and `private` come from the migration.
- Auth → URL configuration: site URL = the workers.dev URL; redirect URL `https://<site>/auth/callback/`.
- Auth → email: **the built-in mailer is for testing only** (a few emails an hour, and it may send only to your project team's addresses). Real users will not get their sign-in code until you add SMTP:
  1. Make a free [Resend](https://resend.com) account, add and verify your domain (DNS records in Cloudflare), create an API key.
  2. Supabase → Project settings → Auth → SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `no-reply@<your domain>`, name `Jotno`.
  3. Auth → Rate limits: raise "emails sent per hour" (e.g. 100).
  4. Auth → Email templates → "Magic Link" **and** "Confirm signup": make sure the body shows `{{ .Token }}` (the 6-digit code people type), copy the HTML from `supabase/templates/sign-in-code.html` (local dev already uses it). The default template shows only a link, and the app signs in with the code.

## 3. First deploy

- Push to `main` → CI → Deploy. Or run the Deploy workflow by hand.
- Check `/`, `/vets/`, `/robots.txt`, `/sitemap.xml`, `/sitemap-content.xml`.
- Sign in with an email listed in `ADMIN_EMAILS`, then open `/admin/`.
- Cloudflare builds run `scripts/patch-open-next.ts` after `opennextjs-cloudflare build`. It turns off Next's cross-request `"use cache"` dedupe, which hangs Workers (OpenNext issue 1464). If a Next.js upgrade makes it fail, update the script or remove it once OpenNext fixes the issue.

## Production host: Hostinger (jotnocare.com)

Cloudflare Workers can't run Cache Components yet (requests hang), so production runs as a **Hostinger Node.js web app** (Business plan, data center Malaysia). The Cloudflare deploy (`deploy.yml`) and Netlify deploy (`deploy-netlify.yml`) only run by hand.

- hPanel → Websites → jotnocare.com → Node.js: GitHub repo `jotno`, branch `main`, framework Next.js, Node 24, pnpm (from the lockfile). **Every push to `main` deploys.**
- Environment variables: hPanel → the app → Environment variables (or "Import .env"). `NEXT_PUBLIC_*` are read at build time, so changing one redeploys.
- `next.config.ts` must export a plain object: Hostinger merges `output: "standalone"` into it and skips a `(phase) => config` function.
- **`BUILD_CPUS=2` must stay in the env vars.** The whole account may run only ~115 processes + threads, and Turbopack/SWC size their thread pools from the server's 64 CPUs, so a plain `next build` hangs at "Creating an optimized production build" until the 15-minute limit. With `BUILD_CPUS`, `scripts/build.ts` pins the build to that many CPUs (`taskset`) and `next.config.ts` runs loaders, page data and prerendering in worker threads and skips the type check (CI runs it). The build then takes about a minute. To debug a build by hand: hPanel → SSH access (key login), Node is at `/opt/alt/alt-nodejs24/root/usr/bin`, the last source is in `~/domains/jotnocare.com/hbuilds/`.
- Scheduled jobs: Supabase `pg_cron` + `pg_net` POST to `https://jotnocare.com/api/cron/frequent/` (every 5 min) and `/api/cron/daily/` (02:00 UTC) with the `CRON_SECRET` stored in Supabase Vault as `jotno_cron_secret`. Check runs: `select * from cron.job_run_details order by start_time desc limit 10;` and `select status_code, content from net._http_response order by created desc limit 10;`. If you change `CRON_SECRET`, update the Vault secret too (`vault.update_secret`).
- Limits: 120 s per request, no WebSocket server (Realtime runs on Supabase, so it's fine), an idle app sleeps and the next request cold-starts (the 5-minute cron keeps it warm).
- Logs: hPanel → the app → Runtime logs / Deployments.

## 4. Before real users

- [ ] `pnpm db:clear-demo --dry-run`, then `pnpm db:clear-demo` against the cloud DB; set `NEXT_PUBLIC_DEMO=false`; redeploy.
- [ ] Legal pages (`src/content/legal.ts`) reviewed by a lawyer; first-aid text (`src/content/emergency.ts`) reviewed by a vet.
- [ ] **Payments (manual, the default)**: open `/admin/settings`, enter the bKash and Nagad numbers (personal, agent or merchant), the charge people add on top (default bKash 1.85%, Nagad 1.49%), cash on delivery and delivery fees, and the support phone. Then test a chat, a booking, a featured pack and a shop order end to end (see "Payments day to day" below).
- [ ] Later, if you want a gateway: SSLCommerz sandbox → live; set `PAYMENT_PROVIDER=sslcommerz`, `SSLCOMMERZ_SANDBOX=false`.
- [ ] Google sign-in: Google Cloud → OAuth consent screen (app name Jotno, your support email, publish it) → Credentials → OAuth client ID (Web). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret in Supabase → Auth → Providers → Google. Set `NEXT_PUBLIC_GOOGLE_AUTH=true` (GitHub variable) and redeploy. Local testing: see `[auth.external.google]` in `supabase/config.toml`.
- [ ] Domain (`jotnocare.com`): add to Cloudflare, attach to the worker, set `NEXT_PUBLIC_SITE_URL`, update Supabase Auth URLs.
- [ ] **Calls** (docs/adr/0009): Cloudflare dashboard → Calls → TURN → create a TURN key. Add `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` as Worker secrets (`npx wrangler secret put …`). Without them calls use STUN only and fail on some mobile networks.
- [ ] Supabase → Realtime → Settings: turn **off** "Allow public access" so only the two people in a consult can join its channel (the policies come from the migrations).
- [ ] Turn on the backup: secret `DATABASE_URL_DIRECT`, variable `BACKUP_ENABLED=true`.
- [ ] Sentry DSN (optional).

## Payments day to day (manual bKash / Nagad)

`PAYMENT_PROVIDER=manual` (default). No gateway, no SSL Commerz.

1. The payer sees `/pay/<id>`: the business number, the amount **plus the wallet charge** (so you receive the full fee), the steps, and fills in the number they sent from and the **TrxID**. Shop orders can choose **cash on delivery** instead.
2. You get a push notification. On **`/admin/payments`**, find that TrxID in the bKash/Nagad app (same amount, same sender), then **Approve** (the chat opens / the booking is confirmed / the order moves to "paid") or **Not found** with a reason (the payer sees it and can send the TrxID again). A TrxID can be used only once.
3. Unpaid holds expire on their own: a booking after 60 min, a chat after 6 h, an order after 24 h, a featured pack after 48 h (not while a TrxID is waiting to be checked).
4. **Refunds** (vet didn't reply, vet cancelled a visit, paid order cancelled or returned) appear under "Refunds to send": send the money back from the wallet to the number shown, then type the refund's TrxID and **Mark sent**. The payer is notified.

## Shop day to day

- **Orders** (`/admin/shop`): "To do" shows everything open. Cash on delivery orders start as "Placed": call the customer, then **Confirm & pack**. Paid orders: **Confirm & pack** → **Hand to courier** (courier name, tracking number, optional tracking link; the customer is notified and sees it on their order page) → **Delivered** (for cash on delivery this also records the cash). Cancel before shipping or mark returned after; stock goes back automatically and paid money is queued as a refund.
- **Stock** is reserved at checkout and returned if the order is cancelled or expires. Change stock on the product page (+ new stock, − correction); every change is in the stock history. A daily job notifies admins about low stock.
- **Coupons** (`/admin/shop/coupons`): percent or taka off, minimum order, cap, uses and last day.
- **Sales** (`/admin/shop/reports`) and **Export CSV** (orders of the last 31 days; `?from=YYYY-MM-DD&to=YYYY-MM-DD` for a range). Each order page prints as an invoice.

## Consults day to day

- **`/admin/consults`** lists every paid chat: first reply time (slow ones marked), messages from each side, photos, calls (talk time, missed), rating, complaints and whether a prescription was written. Filters: open now, late reply, complaints, with calls, refunded. The admin home shows late replies, complaints and missed calls of the last 7 days.
- A consult's page shows its timeline without message text. To read the conversation, write the reason (a complaint, a refund dispute, a safety concern); it is saved in the audit log, shown in the timeline, and gives you 30 minutes of access.
- Each vet's page (`/admin/vets/<id>`) has their last-30-day consult stats.

## Not built yet (later phases)

- Map view of vets (list only now; the home page has a dot map).
- SMS (OTP or reminders).
- Automatic payment checking (a bKash/Nagad merchant API or SSLCommerz); for now an admin approves each TrxID.
- Courier API booking (Steadfast/Pathao): the courier and tracking number are typed in by hand.
- Clinic/organisation accounts, multi-vet clinics.
