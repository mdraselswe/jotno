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
- [ ] SSLCommerz: sandbox store → test a chat, a booking, a featured pack and a shop order end to end → live store; set `PAYMENT_PROVIDER=sslcommerz`, `SSLCOMMERZ_SANDBOX=false`.
- [ ] Google sign-in: OAuth client in Google Cloud, add it in Supabase Auth, set `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- [ ] Domain (`jotnocare.com`): add to Cloudflare, attach to the worker, set `NEXT_PUBLIC_SITE_URL`, update Supabase Auth URLs.
- [ ] Turn on the backup: secret `DATABASE_URL_DIRECT`, variable `BACKUP_ENABLED=true`.
- [ ] Sentry DSN (optional).

## Not built yet (later phases)

- Map view of vets (list only now; the home page has a dot map).
- SMS (OTP or reminders) and video consults.
- Automatic refunds for vet-cancelled bookings and cancelled shop orders (admin refunds in the gateway panel for now).
- Prescriptions, clinic/organisation accounts, multi-vet clinics.
