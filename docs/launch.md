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
- Auth → email: the free mailer is rate limited (a few emails an hour). Add Resend SMTP before real users.

## 3. First deploy

- Push to `main` → CI → Deploy. Or run the Deploy workflow by hand.
- Check `/`, `/vets/`, `/robots.txt`, `/sitemap.xml`, `/sitemap-content.xml`.
- Sign in with an email listed in `ADMIN_EMAILS`, then open `/admin/`.

## 4. Before real users

- [ ] `pnpm db:clear-demo --dry-run`, then `pnpm db:clear-demo` against the cloud DB; set `NEXT_PUBLIC_DEMO=false`; redeploy.
- [ ] Legal pages (`src/content/legal.ts`) reviewed by a lawyer; first-aid text (`src/content/emergency.ts`) reviewed by a vet.
- [ ] **Payments (manual, the default)**: open `/admin/settings`, enter the bKash and Nagad numbers (personal, agent or merchant), the charge people add on top (default bKash 1.85%, Nagad 1.49%), cash on delivery and delivery fees, and the support phone. Then test a chat, a booking, a featured pack and a shop order end to end (see "Payments day to day" below).
- [ ] Later, if you want a gateway: SSLCommerz sandbox → live; set `PAYMENT_PROVIDER=sslcommerz`, `SSLCOMMERZ_SANDBOX=false`.
- [ ] Google sign-in: OAuth client in Google Cloud, add it in Supabase Auth, set `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- [ ] Domain (`jotnocare.com`): add to Cloudflare, attach to the worker, set `NEXT_PUBLIC_SITE_URL`, update Supabase Auth URLs.
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

## Not built yet (later phases)

- Map view of vets (list only now; the home page has a dot map).
- SMS (OTP or reminders) and video consults.
- Automatic payment checking (a bKash/Nagad merchant API or SSLCommerz); for now an admin approves each TrxID.
- Courier API booking (Steadfast/Pathao): the courier and tracking number are typed in by hand.
- Prescriptions, clinic/organisation accounts, multi-vet clinics.
