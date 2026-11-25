"use client";

import {
  BookOpen,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageCircleQuestion,
  Monitor,
  Moon,
  ShieldCheck,
  ShoppingBag,
  Siren,
  Stethoscope,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { features, site, THEME_MODES, type ThemeMode } from "@/config";
import { FOOTER_LINKS } from "@/config/navigation";
import { ROUTES, type AppRoute } from "@/config/routes";
import { ROLE_LABEL, UserAvatar, useAuthUser } from "@/features/auth";
import { useTheme } from "@/hooks/use-theme";
import type { MessageKey } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";
import { LocaleSegment } from "./locale-switcher";

const MAIN: readonly { href: AppRoute; label: MessageKey; icon: LucideIcon }[] = [
  { href: ROUTES.home, label: "nav.home", icon: Home },
  { href: ROUTES.vets, label: "nav.vets", icon: Stethoscope },
  { href: ROUTES.questions, label: "nav.questions", icon: MessageCircleQuestion },
  { href: ROUTES.articles, label: "nav.articles", icon: BookOpen },
  { href: ROUTES.shop, label: "nav.shop", icon: ShoppingBag },
];

const THEME_ICON: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL: Record<ThemeMode, MessageKey> = {
  light: "theme.optLight",
  dark: "theme.optDark",
  system: "theme.optSystem",
};

const SEGMENTS = "grid auto-cols-fr grid-flow-col gap-1 rounded-(--radius-xl) bg-muted p-1";

function ThemeSegment() {
  const { mode, setMode } = useTheme();
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("menu.theme")} className={SEGMENTS}>
      {THEME_MODES.map((m) => {
        const Icon = THEME_ICON[m];
        const on = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setMode(m)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-(--radius-lg) text-sm font-semibold transition-[background-color,color,box-shadow] duration-(--motion-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "bg-card text-foreground shadow-(--shadow-control) ring-1 ring-foreground/8"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {t(THEME_LABEL[m])}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The phone menu: a full-height drawer from the right. Language and theme sit
 * on top as big segmented controls; then the account card, the main pages as
 * clear rows (icon tile, label, chevron, current one marked), the smaller
 * pages, and the emergency button. Choosing anything closes the drawer.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const t = useT();
  const user = useAuthUser();
  const home = localeHref(locale, ROUTES.home);

  // Any link inside closes the drawer (the page change happens underneath).
  const closeOnLink = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.menu")}>
            <Menu aria-hidden="true" />
          </Button>
        }
      />
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(22rem,100vw)] gap-0 p-0 data-[side=right]:w-[min(22rem,100vw)] data-[side=right]:sm:max-w-none"
      >
        <div onClickCapture={closeOnLink} className="flex h-full flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 border-b px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
            <SheetTitle render={<div />}>
              <Link href={home} aria-label={site.name}>
                <Logo locale={locale} />
              </Link>
            </SheetTitle>
            <SheetClose
              render={
                <Button variant="ghost" size="icon" aria-label={t("nav.close")}>
                  <X aria-hidden="true" />
                </Button>
              }
            />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {/* Language and theme first, big and obvious. */}
            <div className="grid gap-3 rounded-(--radius-2xl) bg-card p-3 shadow-(--shadow-card) ring-1 ring-foreground/6">
              <div className="grid gap-1.5">
                <p className="px-1 text-xs font-semibold text-muted-foreground">{t("menu.language")}</p>
                <div className={SEGMENTS}>
                  <LocaleSegment onPick={() => setOpen(false)} />
                </div>
              </div>
              {features.themeToggle ? (
                <div className="grid gap-1.5">
                  <p className="px-1 text-xs font-semibold text-muted-foreground">{t("menu.theme")}</p>
                  <ThemeSegment />
                </div>
              ) : null}
            </div>

            {/* Account */}
            <div className="mt-4">
              {user ? (
                <div className="grid gap-1 rounded-(--radius-2xl) bg-muted/60 p-2">
                  <Link
                    href={localeHref(locale, ROUTES.account)}
                    className="flex items-center gap-3 rounded-(--radius-xl) p-2 transition-colors duration-(--motion-fast) hover:bg-card"
                  >
                    <UserAvatar user={user} className="size-11" />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-semibold">{user.name ?? user.email}</span>
                      <span className="text-xs text-muted-foreground">{t(ROLE_LABEL[user.role])}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </Link>
                  {user.role !== "owner" ? (
                    <div className="grid grid-cols-2 gap-1">
                      <Link
                        href={localeHref(locale, ROUTES.dashboard)}
                        className="flex items-center gap-2 rounded-(--radius-lg) bg-card px-3 py-2.5 text-sm font-semibold shadow-(--shadow-control)"
                      >
                        <LayoutDashboard aria-hidden="true" className="size-4 text-primary" />
                        <span className="truncate">{t("nav.dashboard")}</span>
                      </Link>
                      {user.role === "admin" ? (
                        <Link
                          href={localeHref(locale, ROUTES.admin)}
                          className="flex items-center gap-2 rounded-(--radius-lg) bg-card px-3 py-2.5 text-sm font-semibold shadow-(--shadow-control)"
                        >
                          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                          <span className="truncate">{t("nav.admin")}</span>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : user === null ? (
                <div className="grid gap-3 rounded-(--radius-2xl) bg-primary/8 p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <UserRound aria-hidden="true" className="size-5 text-primary" />
                    {t("menu.account")}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("menu.signInSub")}</p>
                  <ButtonLink href={localeHref(locale, ROUTES.login)} variant="brand" className="w-full">
                    <LogIn aria-hidden="true" />
                    {t("nav.signIn")}
                  </ButtonLink>
                </div>
              ) : null}
            </div>

            {/* Main pages */}
            <nav aria-label={t("nav.mobile")} className="mt-5">
              <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">{t("menu.explore")}</p>
              <ul className="grid gap-1">
                {MAIN.map(({ href: route, label, icon: Icon }) => {
                  const href = localeHref(locale, route);
                  return (
                    <li key={route}>
                      <ActiveLink
                        href={href}
                        match={href === home ? "exact" : "prefix"}
                        className={(active) =>
                          cn(
                            "group flex min-h-13 items-center gap-3 rounded-(--radius-xl) px-2 py-2 text-base font-semibold transition-[background-color,color] duration-(--motion-fast) active:scale-[0.99]",
                            active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                          )
                        }
                      >
                        {(active) => (
                          <>
                            <span
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-(--radius-lg) transition-colors duration-(--motion-fast)",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground/80 group-hover:bg-card",
                              )}
                            >
                              <Icon aria-hidden="true" className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{t(label)}</span>
                            <ChevronRight
                              aria-hidden="true"
                              className={cn("size-4", active ? "text-primary" : "text-muted-foreground")}
                            />
                          </>
                        )}
                      </ActiveLink>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Smaller pages */}
            <nav aria-label={t("nav.footer")} className="mt-5">
              <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">{t("menu.more")}</p>
              <ul className="grid grid-cols-2 gap-1">
                {FOOTER_LINKS.filter((l) => l.href !== ROUTES.emergency).map((link) => (
                  <li key={link.href}>
                    <ActiveLink
                      href={localeHref(locale, link.href)}
                      className={(active) =>
                        cn(
                          "flex min-h-10 items-center rounded-(--radius-lg) px-3 py-2 text-sm transition-colors duration-(--motion-fast)",
                          active
                            ? "bg-muted font-semibold text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      {t(link.label)}
                    </ActiveLink>
                  </li>
                ))}
              </ul>
            </nav>

            <ButtonLink
              href={localeHref(locale, ROUTES.emergency)}
              variant="destructive"
              size="lg"
              className="mt-6 w-full"
            >
              <Siren aria-hidden="true" />
              {t("nav.emergency")}
            </ButtonLink>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
