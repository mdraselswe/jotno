import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/config/locale";
import { site } from "@/config";
import { ROUTES } from "@/config/routes";
import { safeNext } from "@/features/auth";
import { supabaseServer } from "@/infrastructure/supabase/server";
import { publicOrigin } from "@/lib/public-origin";

/** Google sign-in comes back here with a one-time code; we swap it for a session cookie. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const localeParam = url.searchParams.get("locale") ?? DEFAULT_LOCALE;
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const code = url.searchParams.get("code");
  // Behind the proxy the request URL is http://0.0.0.0:3000: redirect to the address the browser used.
  const origin = publicOrigin(request.headers, url, site.url);
  const login = new URL(`${localePath(locale, ROUTES.login)}/`, origin);

  if (!code) {
    login.searchParams.set("error", "1");
    return NextResponse.redirect(login);
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    login.searchParams.set("error", "1");
    return NextResponse.redirect(login);
  }
  const target = safeNext(url.searchParams.get("next"), `${localePath(locale, ROUTES.account)}/`, locale);
  return NextResponse.redirect(new URL(target, origin));
}
