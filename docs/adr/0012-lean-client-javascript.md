# 0012. Lean client JavaScript for public pages

Date: 2026-11-28 · Status: accepted

## Context

Lighthouse on phones (Slow 4G, 4× CPU) scored the public pages 45–53. Every page shipped about 700 KB of gzipped JavaScript, and the simulated LCP was about 6.8 s, because every script that starts before the first paint counts against it. On desktop a footer jump cost about 0.4 CLS. The big items were:

- The whole message catalogue, every string of every language (81 KB).
- The Supabase SDK (69 KB) on pages for visitors who aren't signed in.
- The call UI, chat room, Rx editor and login form, pulled into every page through feature barrels (`@/features/consults` and others) imported by the root layout.
- `motion/react` for the offline banner.
- All seven 800 px hero photos on the home page, at once.

## Decision

- **Client text is a generated subset.** `scripts/lib/client-keys.ts` scans which keys can reach the browser, and `scripts/generate-assets.ts` writes `src/i18n/client-messages.ts`, with only those keys, per language. `LocaleProvider` reads that file, and the catalogue stays on the server. A key counts when it is a string literal:
  - in a client file, or in a file a client file imports;
  - in any other file, except directly inside `t("…")`;
  - or under a template-literal prefix, like ``t(`pay.status.${s}`)``.

  Client code imports helpers from `@/i18n/core`, never values from `@/i18n`. A unit test checks that the file is current and that no browser-side file imports the catalogue. Messages are not passed as props: the RSC payload would repeat them in every page's HTML (twice, with PPR).

- **Our own modules are side-effect free** (`"sideEffects": ["*.css"]` in package.json). Turbopack then follows a barrel's re-exports to the one that's used, instead of putting every client component of a feature into the page.
- **Supabase loads on demand** on every page (`infrastructure/supabase/browser-lazy.ts`):
  - With no `sb-…` cookie, `useAuthUser` answers "signed out" without loading the SDK. Signing in always reloads the page.
  - Sign-out loads the SDK when it runs.
  - `SignedInAlerts` lazy-loads the call and waiting-chat alerts only for a signed-in person.
  - Pages that need Supabase at once (sign-in, chat) still import it directly.
- **CSS before libraries.** The offline banner uses CSS transitions and `@starting-style`.
- **Images:**
  - The home hero loads only the first big photo, then the rest after the page has loaded.
  - Its `sizes` match the real plate size.
  - The small plates use 160 px files.
- **No layout jump.** `<main>` is at least a screen tall, so the footer doesn't jump while a page streams in.

## Consequences

- Public pages ship about 380–470 KB of JS (was about 650–720 KB). On phones LCP dropped from about 6.8 s to about 5 s. On desktop most pages score 94–98, and CLS is about 0.
- New client text needs nothing extra: `pnpm dev` and `pnpm build` regenerate the subset. Run either one (or `node scripts/generate-assets.ts`) before `pnpm test` after changing messages.
- A key built at run time in a form the scanner can't see, like a variable holding `"a" + "." + "b"`, shows as the key itself in the browser. Write keys as literals, or as template literals with a literal prefix.
- `import "./x"` purely for its side effects must be a `.css` file, or be added to `sideEffects`.
- Zod still ships with the config (about 32 KB), and GSAP ships on the home page. Both are candidates for later.
