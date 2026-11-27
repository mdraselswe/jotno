/**
 * Supabase in the browser without putting its SDK in every page's JavaScript:
 * code that runs on every page (header, call and chat alerts) checks for a
 * session cookie first and loads the SDK only when there is one, or when the
 * person acts (signing out). Pages that need it at once (sign-in, chat) import
 * `supabaseBrowser` from "./browser" directly. docs/adr/0012.
 */

/** Whether this browser holds a Supabase session cookie (`sb-…`, the same test as proxy.ts). */
export function hasSessionCookie(): boolean {
  return (
    typeof document !== "undefined" && document.cookie.split(";").some((c) => c.trim().startsWith("sb-"))
  );
}

/** The tab's Supabase client, loading the SDK on first use. */
export async function loadSupabaseBrowser() {
  const { supabaseBrowser } = await import("./browser");
  return supabaseBrowser();
}
