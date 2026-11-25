"use client";

import {
  Home,
  MessageCircleQuestion,
  MessagesSquare,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { TAB_LINKS } from "@/config/navigation";
import { useLocale, useT } from "@/i18n/client";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";

const ICONS: Record<(typeof TAB_LINKS)[number]["icon"], LucideIcon> = {
  home: Home,
  stethoscope: Stethoscope,
  "message-circle-question": MessageCircleQuestion,
  "messages-square": MessagesSquare,
  user: UserRound,
};

/** Mobile bottom navigation (app-like). Hidden from md up, where the header has the links. */
export function TabBar() {
  const locale = useLocale();
  const t = useT();
  const home = localeHref(locale, "/");

  return (
    <nav
      data-tab-bar
      aria-label={t("nav.tabs")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {TAB_LINKS.map((tab) => {
          const href = localeHref(locale, tab.href);
          const Icon = ICONS[tab.icon];
          return (
            <li key={tab.href}>
              <ActiveLink
                href={href}
                match={href === home ? "exact" : "prefix"}
                className={(active) =>
                  cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                {(active) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      className={cn("size-5 transition-transform", active && "-translate-y-0.5")}
                    />
                    <span className="max-w-full truncate px-1">{t(tab.label)}</span>
                  </>
                )}
              </ActiveLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
