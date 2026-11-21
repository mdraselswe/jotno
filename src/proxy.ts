import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/config/env";
import { localePath, splitLocale } from "@/config/locale";
import { ROUTES } from "@/config/routes";

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session cookie when one exists (Server Components
 *    can't write cookies).
 * 2. Optimistic guard: private sections send signed-out people to sign-in.
 *    The real permission checks happen again on the server (requireRole).
 */
const GUARDED = [ROUTES.account, ROUTES.dashboard, ROUTES.admin, ROUTES.chat, ROUTES.onboarding];

export async function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const guarded = GUARDED.some((p) => path === p || path.startsWith(`${p}/`));
  if (!hasSession && !guarded) return NextResponse.next();

  let response = NextResponse.next({ request });
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
            response = NextResponse.next({ request });
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
