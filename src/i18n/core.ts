/**
 * Translation and formatting helpers that don't load the message catalogue,
 * so client components can use them without shipping every string of every
 * language (docs/adr/0012). `@/i18n` re-exports all of this for server code.
 */
import { site } from "@/config";
import { DEFAULT_LOCALE } from "@/config/locale";
import type { MessageKey, Messages } from "./messages/en";

export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

/** Fills `{name}` placeholders. Exported for tests. */
export function format(template: string, vars?: TranslateVars): string {
  return vars
    ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
    : template;
}

/**
 * A translator over a set of messages: translate(messages, "bn")("nav.home").
 * A number in `vars` is written in the locale's digits ("60 মিনিট" → "৬০ মিনিট"),
 * grouped from five digits up; pass a string to keep it as it is. A key the
 * set doesn't have (the browser gets only CLIENT_KEYS) comes back as the key.
 */
export function makeTranslator(messages: Partial<Messages>, locale: string): Translate {
  const digits = new Intl.NumberFormat(locale, { useGrouping: "min2" });
  const localize = (vars: TranslateVars): TranslateVars =>
    Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [
        k,
        typeof v === "number" && Number.isFinite(v) ? digits.format(v) : v,
      ]),
    );
  return (key, vars) => format(messages[key] ?? key, vars && localize(vars));
}

/** Number, money and date formatting for a locale, in the site's time zone and currency. */
export function formatter(locale: string) {
  const { timeZone, currency } = site.i18n;
  return {
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    /** Amount in the main unit (taka, dollars). Store money as integer minor units and divide first. */
    money: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(value),
    date: (value: Date | number, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
      new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(value),
    dateTime: (value: Date | number) =>
      new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium", timeStyle: "short" }).format(value),
    relative: (value: number, unit: Intl.RelativeTimeFormatUnit) =>
      new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit),
  };
}

export type Formatter = ReturnType<typeof formatter>;

/**
 * Picks the singular or plural message for a count by the locale's own plural
 * rules: t(plural(locale, n, "vets.resultsOne", "vets.results"), { n: fmt.number(n) }).
 * Languages without a singular form (Bangla counts with "জন"/"টি") give both
 * keys the same text.
 */
export function plural<K extends MessageKey>(locale: string, n: number, one: K, other: K): K {
  return new Intl.PluralRules(locale).select(n) === "one" ? one : other;
}

/**
 * Picks the entry for a locale from localized content (`{ bn: …, en: … }`),
 * falling back to the default locale. Use for src/content files.
 */
export function pickLocale<T>(content: Partial<Record<string, T>>, locale: string): T {
  const value = content[locale] ?? content[DEFAULT_LOCALE] ?? Object.values(content)[0];
  if (value === undefined) throw new Error("Localized content is empty");
  return value;
}

export type { MessageKey, Messages };
