/**
 * Translation and formatting that work anywhere once you know the locale.
 * - Server Components: `const t = await getT()` from "@/i18n/server"
 * - Client Components: `const t = useT()` from "@/i18n/client" (helpers from
 *   "@/i18n/core": this file loads every string of every language)
 * - Anywhere else (tests, metadata with a known locale): `translator(locale)`
 */
import { DEFAULT_LOCALE, LOCALES } from "@/config/locale";
import { makeTranslator, type Messages, type Translate } from "./core";
import { CATALOGUE } from "./messages";

export * from "./core";

const missing = LOCALES.filter((l) => !(l in CATALOGUE));
if (missing.length > 0) {
  throw new Error(
    `No messages for locale(s) ${missing.join(", ")}. Add src/i18n/messages/<locale>.ts and register it in messages/index.ts.`,
  );
}

export function messagesFor(locale: string): Messages {
  return CATALOGUE[locale] ?? CATALOGUE[DEFAULT_LOCALE] ?? (Object.values(CATALOGUE)[0] as Messages);
}

/**
 * Typed translator for one locale: translator("bn")("nav.home"). A number in
 * `vars` is written in the locale's digits ("60 মিনিট" → "৬০ মিনিট").
 */
export function translator(locale: string): Translate {
  return makeTranslator(messagesFor(locale), locale);
}
