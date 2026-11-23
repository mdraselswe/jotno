import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** A row of filter links (one active), for admin lists filtered by the address. */
export function FilterChips({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            item.active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
