import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { business, features, site } from "@/config";
import { FOOTER_LINKS, NAV_LINKS } from "@/config/navigation";
import { InstallLink } from "@/features/pwa";
import { getLocale, getT } from "@/i18n/server";
import { localeHref } from "@/lib/locale-href";

const NETWORK_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  github: "GitHub",
  whatsapp: "WhatsApp",
};

/** Year of the build (module scope, so it is fixed at build time). */
const YEAR = new Date().getFullYear();

export async function SiteFooter() {
  const t = await getT();
  const locale = await getLocale();
  return (
    <footer className="mt-auto border-t pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container-page grid gap-8 py-10 text-sm text-muted-foreground md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Logo locale={locale} className="text-foreground" />
          <p className="max-w-xs text-pretty">{t("footer.tagline")}</p>
          {business.emergencyHotline ? (
            <p>
              {t("footer.emergency")}{" "}
              <a href={`tel:${business.emergencyHotline}`} className="font-medium text-foreground underline">
                {business.emergencyHotline}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label={t("nav.main")} className="grid content-start gap-2">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={localeHref(locale, link.href)} className="hover:text-foreground">
              {t(link.label)}
            </Link>
          ))}
          {features.pwa ? <InstallLink className="text-start hover:text-foreground" /> : null}
        </nav>
        <nav aria-label={t("nav.footer")} className="grid content-start gap-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={localeHref(locale, link.href)} className="hover:text-foreground">
              {t(link.label)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="container-page flex flex-wrap items-center justify-between gap-3 border-t py-4 text-xs text-muted-foreground">
        <p className="m-0">{t("footer.rights", { year: YEAR, name: site.name })}</p>
        <p className="m-0">{t("footer.notAdvice")}</p>
        <div className="flex gap-4">
          {site.socials.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
              aria-label={t("footer.social", { name: site.name, network: NETWORK_NAMES[s.kind] ?? s.kind })}
            >
              {NETWORK_NAMES[s.kind] ?? s.kind}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
