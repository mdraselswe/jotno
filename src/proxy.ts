import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/config/env";
import { site } from "@/config";
import { DEFAULT_LOCALE, isLocale, localePath, splitLocale } from "@/config/locale";
import { ROUTES } from "@/config/routes";
import { DEVICE_COOKIE, normalizeRef, REF_COOKIE, REF_COOKIE_DAYS, REF_PARAM } from "@/lib/ref";

/**
 * Runs before every page request:
 * 0. Serves unprefixed URLs from the default locale (`/questions/?species=dog`
 *    → `/bn/questions/?species=dog`). Done here, not as a next.config rewrite,
 *    because that one loses the query in the client router's rewrite header
 *    and filter links on default-locale pages stop changing the results.
 *    `/bn/…` itself redirects to the unprefixed URL (unprefixedUrl below).
 * 1. Refreshes the Supabase session cookie when one exists (Server Components
 *    can't write cookies).
 * 2. Optimistic guard: private sections send signed-out people to sign-in.
 *    The real permission checks happen again on the server (requireRole).
 * 3. Invites: `?ref=CODE` is remembered for a month (httpOnly cookie) so the
 *    sign-up that follows counts for the inviter, and sign-in pages get a
 *    random browser id (one browser can't invite itself).
 */
const GUARDED = [ROUTES.account, ROUTES.dashboard, ROUTES.admin, ROUTES.chat, ROUTES.onboarding];

/** Route handlers outside app/[locale] (the matcher already skips /api and files). */
const OUTSIDE_LOCALE = ["/auth/"];

/** Where an unprefixed URL is served from; null when it needs no rewrite. */
function defaultLocaleUrl(request: NextRequest): URL | null {
  if (site.render !== "server") return null; // static `pnpm dev` uses the next.config rewrites
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first) || OUTSIDE_LOCALE.some((p) => pathname.startsWith(p))) return null;
  const url = request.nextUrl.clone(); // keeps the query (and _rsc) exactly
  url.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
  return url;
}

/**
 * `/bn/about/` → `/about/`: the default locale has no prefix. Done here, not as
 * a next.config redirect, because some hosts (Netlify) also apply config
 * redirects to the rewrite target above, which loops `/about/` ⇄ `/bn/about/`.
 */
function unprefixedUrl(request: NextRequest): URL | null {
  if (site.render !== "server") return null;
  const { pathname } = request.nextUrl;
  const prefix = `/${DEFAULT_LOCALE}`;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;
  const url = request.nextUrl.clone(); // keeps the query
  url.pathname = pathname.slice(prefix.length) || "/";
  return url;
}

/** Pages where the browser id matters: signing up, signing in, the signed-in areas. */
const DEVICE_PATHS = [ROUTES.login, ...GUARDED];

function remember(request: NextRequest, response: NextResponse): NextResponse {
  const secure = request.nextUrl.protocol === "https:";
  const ref = normalizeRef(request.nextUrl.searchParams.get(REF_PARAM));
  if (ref)
    response.cookies.set(REF_COOKIE, ref, {
      path: "/",
      maxAge: REF_COOKIE_DAYS * 86_400,
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  const { path } = splitLocale(request.nextUrl.pathname);
  const wantsDevice = ref || DEVICE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (wantsDevice && !request.cookies.has(DEVICE_COOKIE))
    response.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), {
      path: "/",
      maxAge: 2 * 365 * 86_400,
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  return response;
}

export async function proxy(request: NextRequest) {
  return remember(request, await route(request));
}

async function route(request: NextRequest): Promise<NextResponse> {
  const unprefixed = unprefixedUrl(request);
  if (unprefixed) return NextResponse.redirect(unprefixed, 308);
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const guarded = GUARDED.some((p) => path === p || path.startsWith(`${p}/`));
  const target = defaultLocaleUrl(request);
  const pass = () => (target ? NextResponse.rewrite(target, { request }) : NextResponse.next({ request }));
  if (!hasSession && !guarded) return pass();

  let response = pass();
  let signedIn = false;
  if (hasSession) {
    const supabase = createServerClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            for (const { name, value } of list) request.cookies.set(name, value);
            response = pass();
            for (const { name, value, options } of list) response.cookies.set(name, value, options);
          },
        },
      },
    );
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (guarded && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = `${localePath(locale, ROUTES.login)}/`;
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|api/|icons/|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml|js|css|woff2?)$).*)",
  ],
};
