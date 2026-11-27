"use client";

import { createContext, use, type ReactNode } from "react";
import { DEFAULT_LOCALE } from "@/config/locale";
import { CLIENT_MESSAGES } from "./client-messages";
import { formatter, makeTranslator, type Translate } from "./core";

interface LocaleValue {
  locale: string;
  t: Translate;
}

const translators = new Map<string, Translate>();

/**
 * Client text for a locale: only the keys client components use
 * (src/i18n/client-messages.ts, generated), so the browser never downloads
 * the whole catalogue (docs/adr/0012).
 */
function clientTranslator(locale: string): Translate {
  let t = translators.get(locale);
  if (!t) {
    t = makeTranslator(CLIENT_MESSAGES[locale] ?? CLIENT_MESSAGES[DEFAULT_LOCALE] ?? {}, locale);
    translators.set(locale, t);
  }
  return t;
}

const LocaleContext = createContext<LocaleValue>({
  locale: DEFAULT_LOCALE,
  t: clientTranslator(DEFAULT_LOCALE),
});

/** Set once in the root layout with the visitor's language. */
export function LocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <LocaleContext value={{ locale, t: clientTranslator(locale) }}>{children}</LocaleContext>;
}

export function useLocale(): string {
  return use(LocaleContext).locale;
}

export function useT(): Translate {
  return use(LocaleContext).t;
}

export function useFormatter() {
  return formatter(useLocale());
}
