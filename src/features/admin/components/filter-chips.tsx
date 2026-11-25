import type { Route } from "next";
import { FilterPills } from "@/components/layout/app-ui";

/** Kept for older callers: the shared FilterPills (filter links, one active). */
export function FilterChips({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; active: boolean; count?: number }[];
}) {
  return <FilterPills label={label} items={items.map((i) => ({ ...i, href: i.href as Route }))} />;
}
