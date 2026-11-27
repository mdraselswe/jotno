"use client";

import type { Route } from "next";
import { cn } from "@/lib/utils";
import { ActiveLink } from "./active-link";

/** A row of pill links that marks the current page (sub-sections like the admin shop). */
export function PillTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly { href: Route; label: string; exact?: boolean }[];
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-1 -my-1 [scrollbar-width:none] overflow-x-auto px-1 py-1 print:hidden"
    >
      <ul className="flex w-max gap-1 rounded-full bg-muted/70 p-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <ActiveLink
              href={tab.href}
              match={tab.exact ? "exact" : "prefix"}
              className={(active) =>
                cn(
                  "block rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-(--motion-fast)",
                  active
                    ? "bg-card text-foreground shadow-(--shadow-card)"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </ActiveLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
