import type { Route } from "next";
import { isLocale, localePath } from "@/config/locale";

/**
 * Where to go after sign-in. Only our own paths (no `//evil.com`, no full
 * URLs), otherwise the fallback. A path without a locale gets the current one.
 */
export function safeNext(next: string | null | undefined, fallback: string, locale: string): Route {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    // Browsers drop tabs and newlines from URLs: "/<tab>/evil.com" becomes "//evil.com".
    /[\s\u0000-\u001f]/.test(next) ||
    next.includes("://")
  ) {
    return fallback as Route;
  }
  const first = next.split("/")[1] ?? "";
  return (isLocale(first) ? next : localePath(locale, next)) as Route;
}
