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

/** The doodle crew round the wordmark: where each one sits and how it moves. */
const CREW: readonly { name: DoodleName; className: string; motion: "float" | "wiggle" }[] = [
  { name: "cat", className: "left-[4%] top-[6%] size-14 rotate-[-10deg] md:size-20", motion: "float" },
  { name: "bone", className: "left-[22%] top-[0%] size-10 rotate-12 md:size-14", motion: "wiggle" },
  { name: "heart", className: "left-[46%] top-[2%] size-9 md:size-12 text-destructive/70", motion: "float" },
  { name: "dog", className: "right-[20%] top-[4%] size-14 rotate-6 md:size-20", motion: "float" },
  { name: "bird", className: "right-[3%] top-[18%] size-12 -rotate-6 md:size-16", motion: "wiggle" },
  { name: "paw", className: "left-[12%] bottom-[10%] size-10 rotate-[20deg] md:size-12", motion: "wiggle" },
  { name: "fish", className: "right-[10%] bottom-[8%] size-12 rotate-[-8deg] md:size-14", motion: "float" },
  { name: "ball", className: "left-[58%] bottom-[4%] size-9 md:size-11", motion: "wiggle" },
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
      <div className="container-page grid gap-10 pt-16 pb-6 text-sm md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-4">
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
              className="justify-self-start font-medium underline-offset-4 transition-transform duration-(--motion-fast) hover:translate-x-1 hover:underline"
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
              className="justify-self-start text-foreground/80 underline-offset-4 transition-transform duration-(--motion-fast) hover:translate-x-1 hover:text-foreground hover:underline"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
      </div>

      {/* Doodle crew + giant wordmark (decorative; the name is in the logo above). */}
      <div aria-hidden="true" className="relative container-page select-none">
        {CREW.map((d, i) => (
          <span
            key={d.name}
            className={`absolute text-foreground/70 ${d.className}`}
            style={{ "--i": i } as CSSProperties}
          >
            <Doodle
              name={d.name}
              className={`size-full draw ${d.motion === "float" ? "float" : "hover:animate-wiggle"}`}
              style={{ "--i": i } as CSSProperties}
            />
          </span>
        ))}
        <p className="flex justify-center pt-16 pb-2 font-script [font-size:clamp(6rem,26vw,20rem)] leading-[0.8] text-primary md:pt-10">
          {/* Latin letters hop one by one; Bangla stays whole (splitting breaks the conjunct). */}
          {(locale === "bn" ? [word] : Array.from(word)).map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="inline-block transition-transform duration-(--motion-base) ease-spring hover:-translate-y-6 hover:-rotate-6"
            >
              {ch}
            </span>
          ))}
        </p>
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
