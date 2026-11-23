import { Siren } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";
import { business, features, site } from "@/config";
import { FOOTER_LINKS, NAV_LINKS } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
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

/**
 * The footer: a deep teal-ink band (dark tokens inside), link columns, then
 * the wordmark set large and quiet. Latin letters lift on hover.
 */
export async function SiteFooter() {
  const t = await getT();
  const locale = await getLocale();
  const word = locale === "bn" ? "যত্ন" : "Jotno";
  return (
    <footer className="relative mt-auto overflow-hidden surface-sun pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 print:hidden">
      <div className="container-page grid gap-8 pt-16 pb-2 text-sm sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-4 sm:col-span-2 md:col-span-1">
          <p className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <LogoMark className="size-9" />
            {site.name}
          </p>
          <p className="max-w-xs text-pretty text-muted-foreground">{t("footer.tagline")}</p>
          <ButtonLink
            href={localeHref(locale, ROUTES.emergency)}
            variant="destructive"
            className="justify-self-start"
          >
            <Siren aria-hidden="true" />
            {t("nav.emergency")}
          </ButtonLink>
          {business.emergencyHotline ? (
            <p>
              {t("footer.emergency")}{" "}
              <a href={`tel:${business.emergencyHotline}`} className="font-semibold underline">
                {business.emergencyHotline}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label={t("nav.main")} className="grid content-start gap-2.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={localeHref(locale, link.href)}
              className="justify-self-start font-medium underline-offset-4 transition-colors duration-(--motion-fast) hover:text-primary hover:underline"
            >
              {t(link.label)}
            </Link>
          ))}
          {features.pwa ? <InstallLink className="text-start font-medium hover:underline" /> : null}
        </nav>
        <nav aria-label={t("nav.footer")} className="grid content-start gap-2.5">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={localeHref(locale, link.href)}
              className="justify-self-start text-muted-foreground underline-offset-4 transition-colors duration-(--motion-fast) hover:text-primary hover:underline"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
      </div>

      {/* The wordmark, large and quiet (decorative; the name is in the logo above). */}
      <div aria-hidden="true" className="container-page flex justify-center pt-8 select-none">
        <p className="m-0 flex font-heading [font-size:clamp(5rem,19vw,14rem)] leading-[0.9] font-extrabold tracking-tight text-foreground">
          {/* Latin letters lift one by one; Bangla stays whole (splitting breaks the conjunct). */}
          {(locale === "bn" ? [word] : Array.from(word)).map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="inline-block transition-[translate,color] duration-(--motion-base) ease-out-expo hover:-translate-y-2"
            >
              {ch}
            </span>
          ))}
        </p>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
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
