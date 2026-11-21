"use client";

import type { AppRoute } from "@/config/routes";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";

export interface SectionLink {
  href: AppRoute;
  label: MessageKey;
  /** Only this exact page counts as current (for the section's home). */
  exact?: boolean;
}

/** Tabs for a private area (account, dashboard, admin). Scrolls sideways on phones. */
export function SectionNav({ links, label }: { links: readonly SectionLink[]; label: MessageKey }) {
  const locale = useLocale();
  const t = useT();
  return (
    <nav aria-label={t(label)} className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b">
        {links.map((link) => {
          return (
            <li key={link.href}>
              <ActiveLink
                href={localeHref(locale, link.href)}
                match={link.exact ? "exact" : "prefix"}
                className={(active) =>
                  cn(
                    "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {t(link.label)}
              </ActiveLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Layout for a private area: tabs on top, page below. */
export function SectionLayout({
  links,
  label,
  children,
}: {
  links: readonly SectionLink[];
  label: MessageKey;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-6 py-6 md:py-10">
      <SectionNav links={links} label={label} />
      {children}
    </div>
  );
}
