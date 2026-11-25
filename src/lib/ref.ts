/**
 * Referral links: `?ref=CODE` on any Jotno URL. Pure helpers shared by the
 * proxy (remembers the code in a cookie), the share button (adds the sharer's
 * own code) and the referral feature (reads the cookie at sign-up).
 */

/** The query parameter a referral link carries. */
export const REF_PARAM = "ref";
/** Codes are upper-case letters and digits, 4–12 long. */
export const REF_CODE = /^[A-Z0-9]{4,12}$/;
/** The code of whoever invited this browser (httpOnly, set by the proxy). */
export const REF_COOKIE = "jotno_ref";
/** A random id for this browser (httpOnly): one device can't refer itself. */
export const DEVICE_COOKIE = "jotno_did";
/** The signed-in person's own code, readable by the share button. */
export const MY_REF_COOKIE = "jotno_my_ref";
/** How long an invite is remembered before sign-up. */
export const REF_COOKIE_DAYS = 30;

/** A valid code from user input (`abc123` → `ABC123`), or null. */
export function normalizeRef(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return REF_CODE.test(code) ? code : null;
}

/** Adds `?ref=CODE` to an absolute URL (keeps other parameters, replaces an old code). */
export function withRef(url: string, code: string | null | undefined): string {
  const ref = normalizeRef(code);
  if (!ref) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(REF_PARAM, ref);
    return u.toString();
  } catch {
    return url;
  }
}

/** One cookie's value from a `document.cookie` string. */
export function readCookie(cookie: string, name: string): string | null {
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
