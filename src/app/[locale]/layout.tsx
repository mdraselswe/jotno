import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoBanner } from "@/components/layout/demo-banner";
import { LoadWatch } from "@/components/layout/load-watch";
import { NavProgress } from "@/components/layout/nav-progress";
import { TabBar } from "@/components/layout/tab-bar";
import { ScrollScenes } from "@/components/motion/scroll-scenes";
import { ViewTransitionGuard } from "@/components/motion/view-transition-guard";
import { brandStyle, fontVariables, htmlDesignAttributes } from "@/components/layout/brand-style";
import { ThemeScript } from "@/components/layout/theme-script";
import { features, isIndexable, isProduction, site } from "@/config";
import { LOCALES, localeDir } from "@/config/locale";
import { ogLocale, pageAlternates } from "@/lib/metadata";
import { OG_IMAGE_PATH, ogImages } from "@/lib/og";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionBanner } from "@/features/connection";
import { SignedInAlerts } from "@/features/consults";
import { PaymentNotice } from "@/features/payments";
import { HeaderCart } from "@/features/shop/server";
import { InstallCard, PwaScript } from "@/features/pwa";
import { LocaleProvider } from "@/i18n/client";
import { getLocale, getT, requireLocale } from "@/i18n/server";
import "../globals.css";

/** One prerendered tree per configured language; any other first segment is a 404 (requireLocale). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getT();
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    metadataBase: new URL(site.url),
    title: { default: title, template: `%s · ${site.name}` },
    description,
    keywords: site.seo.keywords,
    applicationName: site.name,
    authors: [{ name: site.name, url: site.url }],
    publisher: site.name,
    category: "health",
    // Let search engines and AI answers show full snippets and large images.
    // The demo site is never indexed (isIndexable), so only the real site is found.
    robots: isIndexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: pageAlternates("/", locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description,
      locale: ogLocale(locale),
      alternateLocale: LOCALES.filter((l) => l !== locale).map(ogLocale),
      images: ogImages(),
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE_PATH] },
    // Icons and the manifest are generated from config by scripts/generate-assets.ts.
    icons: {
      icon: [
        { url: "/icons/icon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    ...(features.pwa ? { manifest: "/manifest.webmanifest" } : {}),
    appleWebApp: { capable: features.pwa, title: site.shortName, statusBarStyle: "default" },
  };
}

const { background } = site.theme;
export const viewport: Viewport = {
  themeColor:
    site.theme.defaultMode === "system"
      ? [
          { media: "(prefers-color-scheme: light)", color: background.light },
          { media: "(prefers-color-scheme: dark)", color: background.dark },
        ]
      : background[site.theme.defaultMode],
  viewportFit: "cover",
  // Android Chrome shrinks the page for the keyboard (the chat composer stays
  // right above it instead of the page panning under the header).
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await requireLocale();
  const t = await getT();
  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fontVariables} ${site.theme.defaultMode === "dark" ? "dark" : ""} h-full antialiased`}
      style={brandStyle}
      {...htmlDesignAttributes}
    >
      <head>
        <ThemeScript />
        <ViewTransitionGuard />
        {features.pwa ? <PwaScript serviceWorker={isProduction} /> : null}
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale}>
          <a
            href="#content"
            className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:translate-y-0"
          >
            {t("a11y.skip")}
          </a>
          <NavProgress />
          <LoadWatch />
          <DemoBanner />
          <SiteHeader
            cart={
              <Suspense fallback={null}>
                <HeaderCart />
              </Suspense>
            }
          />
          {/* At least a screen tall: while a page streams in (its loading skeleton is shorter than
              the page), the footer stays below the fold instead of being pushed down (layout shift). */}
          <main id="content" className="min-h-svh flex-1">
            {children}
          </main>
          <SiteFooter />
          <Suspense fallback={null}>
            <ScrollScenes />
          </Suspense>
          <TabBar />
          <SignedInAlerts />
          {features.offlineBanner ? <ConnectionBanner /> : null}
          {features.toaster.enabled ? <Toaster /> : null}
          <Suspense fallback={null}>
            <PaymentNotice />
          </Suspense>
          {features.pwa ? <InstallCard /> : null}
        </LocaleProvider>
      </body>
    </html>
  );
}
