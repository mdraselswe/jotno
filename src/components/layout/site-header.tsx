"use client";

import { Menu, Siren } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { features, site } from "@/config";
import { FOOTER_LINKS, NAV_LINKS } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const locale = useLocale();
  const t = useT();
  const home = localeHref(locale, ROUTES.home);

  const links = (className: string, list = NAV_LINKS) =>
    list.map((link) => {
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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur [view-transition-name:site-header] supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-14 items-center gap-3">
        <Link href={localeHref(locale, ROUTES.home)} className="group" aria-label={site.name}>
          <Logo locale={locale} />
        </Link>
        <nav
          aria-label={t("nav.main")}
          className="ms-6 hidden items-center gap-6 text-sm font-medium md:flex"
        >
          {links("transition-colors")}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <ButtonLink
            href={localeHref(locale, ROUTES.emergency)}
            size="sm"
            variant="destructive"
            className="sos-breathe gap-1.5"
          >
            <Siren aria-hidden="true" />
            <span className="max-sm:sr-only">{t("nav.emergency")}</span>
          </ButtonLink>
          <div className="hidden items-center gap-1 md:flex">
            <LocaleSwitcher />
            {features.themeToggle ? <ThemeToggle /> : null}
          </div>
          <UserMenu />
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.menu")}>
                  <Menu aria-hidden="true" />
                </Button>
              }
            />
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-4 pt-4">
                <Logo locale={locale} />
              </SheetTitle>
              <nav aria-label={t("nav.mobile")} className="grid gap-1 p-4">
                {links("rounded-md px-3 py-2 text-base font-medium")}
                <hr className="my-2" />
                {links("rounded-md px-3 py-2 text-sm", FOOTER_LINKS)}
              </nav>
              <div className="flex items-center gap-1 px-4">
                <LocaleSwitcher />
                {features.themeToggle ? <ThemeToggle /> : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
