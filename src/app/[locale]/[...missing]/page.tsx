import { notFound } from "next/navigation";

/**
 * Any other path under a language (`/en/legal/`, `/en/nope/`): answer with
 * [locale]/not-found.tsx, so the 404 is in the visitor's language. Without
 * this, unmatched URLs fall through to app/global-not-found.tsx, which only
 * knows the default language. Real pages always win over this catch-all.
 */
export default function MissingPage(): never {
  notFound();
}
