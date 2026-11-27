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

const SEGMENTS = "grid auto-cols-fr grid-flow-col gap-0.5 rounded-(--radius-lg) bg-muted p-0.5";

/** Light / dark / system as three small icon buttons (named for screen readers and on hover). */
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
            aria-label={t(THEME_LABEL[m])}
            title={t(THEME_LABEL[m])}
            onClick={() => setMode(m)}
            className={cn(
              "grid h-8 w-9 place-items-center rounded-(--radius-md) transition-[background-color,color,box-shadow] duration-(--motion-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "bg-card text-foreground shadow-(--shadow-control) ring-1 ring-foreground/8"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/** A small grey heading over a group of rows. */
function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/**
 * The phone menu: a drawer from the right. On top the account (or sign in),
 * then the main pages and the smaller pages, one per row, and the emergency
 * button. Language and theme sit in a slim bar pinned to the bottom.
 * Choosing anything closes the drawer.
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
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.menu")}>
            <Menu aria-hidden="true" />
          </Button>
        }
      />
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(20rem,88vw)] gap-0 p-0 data-[side=right]:w-[min(20rem,88vw)] data-[side=right]:sm:max-w-none"
      >
        <div onClickCapture={closeOnLink} className="flex h-full min-h-0 flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 border-b px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
            <SheetTitle render={<div />}>
              <Link href={home} aria-label={site.name} className="flex rounded-(--radius-md) p-1">
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            {/* Account */}
            {user ? (
              <div className="grid gap-1 rounded-(--radius-xl) bg-muted/60 p-1">
                <Link
                  href={localeHref(locale, ROUTES.account)}
                  className="flex items-center gap-3 rounded-(--radius-lg) px-2 py-1.5 transition-colors duration-(--motion-fast) hover:bg-card"
                >
                  <UserAvatar user={user} className="size-9" />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-semibold">{user.name ?? user.email}</span>
                    <span className="text-xs text-muted-foreground">{t(ROLE_LABEL[user.role])}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </Link>
                {user.role !== "owner" ? (
                  <div className="grid auto-cols-fr grid-flow-col gap-1">
                    <Link
                      href={localeHref(locale, ROUTES.dashboard)}
                      className="flex h-9 items-center gap-2 rounded-(--radius-md) bg-card px-2.5 text-sm font-semibold shadow-(--shadow-control)"
                    >
                      <LayoutDashboard aria-hidden="true" className="size-4 text-primary" />
                      <span className="truncate">{t("nav.dashboard")}</span>
                    </Link>
                    {user.role === "admin" ? (
                      <Link
                        href={localeHref(locale, ROUTES.admin)}
                        className="flex h-9 items-center gap-2 rounded-(--radius-md) bg-card px-2.5 text-sm font-semibold shadow-(--shadow-control)"
                      >
                        <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                        <span className="truncate">{t("nav.admin")}</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : user === null ? (
              <div className="grid gap-2.5 rounded-(--radius-xl) bg-primary/8 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound aria-hidden="true" className="size-4.5 text-primary" />
                  {t("menu.account")}
                </p>
                <p className="text-xs text-pretty text-muted-foreground">{t("menu.signInSub")}</p>
                <ButtonLink href={localeHref(locale, ROUTES.login)} variant="brand" className="w-full">
                  <LogIn aria-hidden="true" />
                  {t("nav.signIn")}
                </ButtonLink>
              </div>
            ) : null}

            {/* Main pages */}
            <nav aria-label={t("nav.mobile")} className="mt-3">
              <GroupLabel>{t("menu.explore")}</GroupLabel>
              <ul className="grid gap-0.5">
                {MAIN.map(({ href: route, label, icon: Icon }) => {
                  const href = localeHref(locale, route);
                  return (
                    <li key={route}>
                      <ActiveLink
                        href={href}
                        match={href === home ? "exact" : "prefix"}
                        className={(active) =>
                          cn(
                            "flex h-11 items-center gap-3 rounded-(--radius-lg) px-2 text-[0.9375rem] font-semibold transition-[background-color,color] duration-(--motion-fast)",
                            active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                          )
                        }
                      >
                        {(active) => (
                          <>
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-(--radius-md) transition-colors duration-(--motion-fast)",
                                active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/75",
                              )}
                            >
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{t(label)}</span>
                            {active ? (
                              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                            ) : null}
                          </>
                        )}
                      </ActiveLink>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Smaller pages */}
            <nav aria-label={t("nav.footer")} className="mt-3 border-t pt-3">
              <GroupLabel>{t("menu.more")}</GroupLabel>
              <ul className="grid gap-0.5">
                {FOOTER_LINKS.filter((l) => l.href !== ROUTES.emergency).map((link) => (
                  <li key={link.href}>
                    <ActiveLink
                      href={localeHref(locale, link.href)}
                      className={(active) =>
                        cn(
                          "flex h-9 items-center justify-between gap-2 rounded-(--radius-md) px-2 text-sm transition-colors duration-(--motion-fast)",
                          active
                            ? "bg-muted font-semibold text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      {t(link.label)}
                      <ChevronRight aria-hidden="true" className="size-3.5 opacity-50" />
                    </ActiveLink>
                  </li>
                ))}
              </ul>
            </nav>

            <ButtonLink
              href={localeHref(locale, ROUTES.emergency)}
              variant="destructive"
              className="mt-3 w-full"
            >
              <Siren aria-hidden="true" />
              {t("nav.emergency")}
            </ButtonLink>
          </div>

          {/* Language and theme: a slim bar pinned to the bottom. */}
          <div className="grid gap-2 border-t bg-muted/30 px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">{t("menu.language")}</span>
              <div className={SEGMENTS}>
                <LocaleSegment compact onPick={() => setOpen(false)} />
              </div>
            </div>
            {features.themeToggle ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">{t("menu.theme")}</span>
                <ThemeSegment />
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
