import { Siren } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Doodle, type DoodleName } from "@/components/illustrations/doodles";
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

/** The doodle crew hugging the wordmark: where each one sits and how it moves. */
const CREW: readonly { name: DoodleName; className: string; motion: "float" | "wiggle" }[] = [
  { name: "cat", className: "-left-[34%] top-[24%] size-[30%] -rotate-12", motion: "float" },
  { name: "bone", className: "-left-[14%] -top-[4%] size-[17%] rotate-12 max-sm:hidden", motion: "wiggle" },
  { name: "heart", className: "left-[42%] -top-[16%] size-[14%] text-destructive/70", motion: "float" },
  { name: "dog", className: "-right-[34%] top-[18%] size-[30%] rotate-6", motion: "float" },
  { name: "bird", className: "-right-[12%] -top-[8%] size-[18%] -rotate-6 max-sm:hidden", motion: "wiggle" },
  {
    name: "paw",
    className: "-left-[12%] bottom-[4%] size-[14%] rotate-[20deg] max-sm:hidden",
    motion: "wiggle",
  },
  {
    name: "fish",
    className: "-right-[14%] bottom-[2%] size-[17%] -rotate-[8deg] max-sm:hidden",
    motion: "float",
  },
];

/**
 * The footer: link columns on a sunny band, then the doodle crew playing
 * around a giant brush-lettered wordmark. Letters hop on hover.
 */
export async function SiteFooter() {
  const t = await getT();
  const locale = await getLocale();
  const word = locale === "bn" ? "যত্ন" : "Jotno";
  return (
    <footer className="relative mt-auto overflow-hidden bg-highlight/55 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-foreground md:pb-0 dark:bg-highlight/15">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-6 bg-background [mask:radial-gradient(14px_at_50%_0,#000_98%,#0000)_50%/28px_100%]"
      />
      <div className="container-page grid gap-8 pt-14 pb-2 text-sm sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-4 sm:col-span-2 md:col-span-1">
          <p className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            <LogoMark className="size-9" />
            {site.name}
          </p>
          <p className="max-w-xs text-pretty text-foreground/75">{t("footer.tagline")}</p>
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
              className="justify-self-start text-foreground/80 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-primary hover:underline"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
      </div>

      {/* Doodle crew + big wordmark (decorative; the name is in the logo above). */}
      <div
        aria-hidden="true"
        className="container-page flex justify-center overflow-hidden pt-6 pb-4 select-none"
      >
        <div className="relative mx-[28%] w-fit">
          {CREW.map((d, i) => (
            <span key={d.name} className={`absolute text-foreground/65 ${d.className}`}>
              <Doodle
                name={d.name}
                className={`size-full draw ${d.motion === "float" ? "float" : "hover:animate-wiggle"}`}
                style={{ "--i": i } as CSSProperties}
              />
            </span>
          ))}
          <p className="m-0 flex font-script [font-size:clamp(4.5rem,17vw,12rem)] leading-[1.05] text-primary">
            {/* Latin letters hop one by one; Bangla stays whole (splitting breaks the conjunct). */}
            {(locale === "bn" ? [word] : Array.from(word)).map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="inline-block transition-transform duration-(--motion-base) ease-out-expo hover:-translate-y-3 hover:-rotate-3"
              >
                {ch}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-3 border-t border-foreground/15 py-4 text-xs text-foreground/70">
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
