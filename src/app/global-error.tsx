"use client";

import { usePathname } from "next/navigation";
import { Suspense, use } from "react";
import { brandStyle, fontVariables, htmlDesignAttributes } from "@/components/layout/brand-style";
import { ErrorView } from "@/components/layout/error-view";
import { ThemeScript } from "@/components/layout/theme-script";
import { site } from "@/config";
import { DEFAULT_LOCALE, localeDir, splitLocale } from "@/config/locale";
import { ROUTES } from "@/config/routes";
import { makeTranslator } from "@/i18n/core";
import { localeHref } from "@/lib/locale-href";
import "./globals.css";

// The catalogue loads only when this page shows, so ordinary pages never
// carry every string of every language (docs/adr/0012).
let catalogue: ReturnType<typeof loadCatalogue> | undefined;
const loadCatalogue = () => import("@/i18n/messages").then((m) => m.CATALOGUE);

function Content({ locale, error, retry }: { locale: string; error: unknown; retry: () => void }) {
  const all = use((catalogue ??= loadCatalogue()));
  const t = makeTranslator(all[locale] ?? all[DEFAULT_LOCALE] ?? {}, locale);
  return (
    <>
      <title>{`${t("error.title")} · ${site.name}`}</title>
      <main className="flex flex-1 flex-col">
        <ErrorView
          error={error}
          retry={retry}
          t={t}
          homeHref={localeHref(locale, ROUTES.home)}
          className="flex-1"
        />
      </main>
    </>
  );
}

/**
 * Shown when the root layout itself fails ([locale]/error.tsx handles pages).
 * It replaces the whole document, so it brings its own <html>, styles, theme
 * and language (read from the URL, as the layout's providers are gone).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const { locale } = splitLocale(usePathname());
  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      suppressHydrationWarning
      className={`${fontVariables} ${site.theme.defaultMode === "dark" ? "dark" : ""} h-full antialiased`}
      style={brandStyle}
      {...htmlDesignAttributes}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense>
          <Content locale={locale} error={error} retry={retry} />
        </Suspense>
      </body>
    </html>
  );
}
