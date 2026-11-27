"use client";

import { Siren } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";
import { features } from "@/config";
import { NAV_LINKS } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

/** `cart`: the cart button, only while the shop sells something (the layout reads it per request). */
export function SiteHeader({ cart }: { cart?: ReactNode }) {
  const locale = useLocale();
  const t = useT();
  const home = localeHref(locale, ROUTES.home);

  const links = (className: string) =>
    NAV_LINKS.map((link) => {
      const href = localeHref(locale, link.href);
      return (
        <ActiveLink
          key={link.href}
          href={href}
          match={href === home ? "exact" : "prefix"}
          className={(active) =>
            cn(className, active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {t(link.label)}
        </ActiveLink>
      );
    });

  return (
    <header className="sticky top-0 z-40 px-2 pt-2 [view-transition-name:site-header] sm:px-4 sm:pt-3 print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl header-settle items-center gap-2 rounded-(--radius-2xl) bg-card/70 ps-3 pe-2 ring-1 ring-foreground/6 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 sm:gap-3 sm:ps-4">
        <Link href={localeHref(locale, ROUTES.home)} className="group">
          <Logo locale={locale} animated />
        </Link>
        <nav
          aria-label={t("nav.main")}
          className="ms-4 hidden items-center gap-1 text-sm font-medium whitespace-nowrap lg:flex"
        >
          {links(
            "rounded-(--control-radius) px-3 py-1.5 transition-[color,background-color] duration-(--motion-fast) hover:bg-foreground/5 aria-[current=page]:bg-foreground aria-[current=page]:text-background",
          )}
        </nav>
        <div className="ms-auto flex min-w-0 items-center gap-1 sm:gap-1.5">
          <ButtonLink
            href={localeHref(locale, ROUTES.emergency)}
            size="sm"
            variant="outline"
            className="sos-breathe gap-1.5 border border-destructive/40 text-destructive hover:bg-destructive/8 hover:text-destructive"
          >
            <Siren aria-hidden="true" />
            <span className="max-sm:sr-only">{t("nav.emergency")}</span>
          </ButtonLink>
          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitcher />
            {features.themeToggle ? <ThemeToggle /> : null}
          </div>
          {cart}
          <UserMenu />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
