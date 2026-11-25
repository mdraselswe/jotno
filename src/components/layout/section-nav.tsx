"use client";

import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Flag,
  Gauge,
  HandCoins,
  LayoutDashboard,
  MessageCircleQuestion,
  MessagesSquare,
  Package,
  PawPrint,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { AppRoute } from "@/config/routes";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";

/** Icons a section link can use (names, so server layouts can pass them). */
export const SECTION_ICONS = {
  overview: LayoutDashboard,
  gauge: Gauge,
  pets: PawPrint,
  chats: MessagesSquare,
  calendar: CalendarDays,
  schedule: CalendarClock,
  orders: Package,
  settings: Settings,
  profile: UserRound,
  questions: MessageCircleQuestion,
  earnings: Wallet,
  articles: BookOpen,
  featured: Sparkles,
  users: Users,
  vets: Stethoscope,
  verified: BadgeCheck,
  payments: CreditCard,
  payouts: HandCoins,
  reports: Flag,
  shop: ShoppingBag,
  audit: ScrollText,
  shield: ShieldCheck,
  stats: BarChart3,
  list: ClipboardList,
  file: FileText,
} satisfies Record<string, LucideIcon>;

export type SectionIcon = keyof typeof SECTION_ICONS;

export interface SectionLink {
  href: AppRoute;
  label: MessageKey;
  icon?: SectionIcon;
  /** Heading of the group this link starts (sidebar only). */
  group?: MessageKey;
  /** Only this exact page counts as current (for the section's home). */
  exact?: boolean;
}

/**
 * Phones: a sticky row of icon chips under the header (scrolls sideways; the
 * current one is scrolled into view and filled).
 */
function ChipNav({ links, label }: { links: readonly SectionLink[]; label: MessageKey }) {
  const locale = useLocale();
  const t = useT();
  const row = useRef<HTMLUListElement>(null);

  // Bring the current chip into view without moving the page.
  useEffect(() => {
    const list = row.current;
    const current = list?.querySelector<HTMLElement>("[aria-current=page]");
    if (!list || !current) return;
    list.scrollLeft = current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2;
  });

  return (
    <nav
      aria-label={t(label)}
      className="sticky top-[4.25rem] z-30 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-md lg:hidden"
    >
      <ul ref={row} className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto scroll-smooth">
        {links.map((link) => {
          const Icon = SECTION_ICONS[link.icon ?? "list"];
          return (
            <li key={link.href} className="shrink-0">
              <ActiveLink
                href={localeHref(locale, link.href)}
                match={link.exact ? "exact" : "prefix"}
                className={(active) =>
                  cn(
                    "flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap ring-1 transition-[background-color,color,box-shadow] duration-(--motion-fast)",
                    active
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card text-foreground/80 ring-foreground/10 hover:text-foreground",
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4" />
                {t(link.label)}
              </ActiveLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop: a sticky sidebar with grouped rows. */
function SideNav({
  links,
  label,
  title,
  titleIcon,
}: {
  links: readonly SectionLink[];
  label: MessageKey;
  title?: MessageKey;
  titleIcon?: SectionIcon;
}) {
  const locale = useLocale();
  const t = useT();
  const TitleIcon = titleIcon ? SECTION_ICONS[titleIcon] : null;
  return (
    <nav aria-label={t(label)} className="sticky top-24 hidden self-start lg:block">
      <div className="grid gap-1 rounded-(--radius-2xl) bg-card p-2 shadow-(--shadow-card) ring-1 ring-foreground/6">
        {title ? (
          <p className="flex items-center gap-2 px-2.5 pt-2 pb-3 font-heading text-base font-bold">
            {TitleIcon ? (
              <span className="grid size-8 place-items-center rounded-(--radius-md) bg-primary text-primary-foreground">
                <TitleIcon aria-hidden="true" className="size-4" />
              </span>
            ) : null}
            {t(title)}
          </p>
        ) : null}
        <ul className="grid gap-0.5">
          {links.map((link) => {
            const Icon = SECTION_ICONS[link.icon ?? "list"];
            return (
              <li key={link.href}>
                {link.group ? (
                  <p className="px-2.5 pt-4 pb-1.5 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
                    {t(link.group)}
                  </p>
                ) : null}
                <ActiveLink
                  href={localeHref(locale, link.href)}
                  match={link.exact ? "exact" : "prefix"}
                  className={(active) =>
                    cn(
                      "group flex h-10 items-center gap-3 rounded-(--radius-lg) px-2.5 text-sm font-medium transition-[background-color,color] duration-(--motion-fast)",
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  {(active) => (
                    <>
                      <Icon
                        aria-hidden="true"
                        className={cn("size-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                      />
                      <span className="truncate">{t(link.label)}</span>
                    </>
                  )}
                </ActiveLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Kept for pages that only want the chip row. */
export function SectionNav({ links, label }: { links: readonly SectionLink[]; label: MessageKey }) {
  return <ChipNav links={links} label={label} />;
}

/**
 * Layout for a private area (account, vet dashboard, admin): a sidebar from
 * lg up, a sticky chip row on phones and tablets, the page beside/below.
 */
export function SectionLayout({
  links,
  label,
  title,
  titleIcon,
  children,
}: {
  links: readonly SectionLink[];
  label: MessageKey;
  title?: MessageKey;
  titleIcon?: SectionIcon;
  children: ReactNode;
}) {
  return (
    <div className="container-page grid gap-4 pt-3 pb-10 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8 lg:py-10">
      <ChipNav links={links} label={label} />
      <SideNav links={links} label={label} title={title} titleIcon={titleIcon} />
      <div className="grid min-w-0 content-start gap-6">{children}</div>
    </div>
  );
}
