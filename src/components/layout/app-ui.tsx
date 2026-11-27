import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for app screens (account, vet dashboard, admin,
 * shop, checkout). Server-safe (no hooks), tokens only, so every page reads
 * the same: a clear header, stat tiles, cards with a title row, tables that
 * become stacked cards on phones, honest empty states and status badges.
 */

/** Page title row: optional icon tile, title, one line of help, actions on the right (below on phones). */
export function PageHeader({
  title,
  sub,
  icon: Icon,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon ? (
          <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-(--radius-xl) bg-primary/10 text-primary max-sm:hidden">
            <Icon aria-hidden="true" className="size-5.5" />
          </span>
        ) : null}
        <div className="grid min-w-0 gap-1">
          {eyebrow ? <p className="text-xs font-semibold text-primary">{eyebrow}</p> : null}
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance md:text-3xl">
            {title}
          </h1>
          {sub ? (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground md:text-base">{sub}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div> : null}
    </header>
  );
}

const TONES = {
  default: "bg-card",
  primary: "bg-primary/8 ring-primary/20",
  success: "bg-success/10 ring-success/25",
  warning: "bg-warning/15 ring-warning/40",
  danger: "bg-destructive/8 ring-destructive/25",
} as const;
const ICON_TONES = {
  default: "bg-muted text-foreground/75",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive text-white",
} as const;
export type Tone = keyof typeof TONES;

/** One number with a label (and an optional link, hint and tone for "needs attention"). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  href?: Route;
  tone?: Tone;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        {Icon ? (
          <span
            className={cn("grid size-8 shrink-0 place-items-center rounded-(--radius-md)", ICON_TONES[tone])}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="font-heading text-2xl leading-none font-bold tabular-nums sm:text-3xl">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const cls = cn(
    "grid content-between gap-3 rounded-(--radius-2xl) p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5",
    TONES[tone],
  );
  return href ? (
    <Link
      href={href}
      className={cn(
        cls,
        "transition-[box-shadow,translate] duration-(--motion-base) ease-(--ease-ui) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A responsive grid of StatCards. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>
  );
}

/** A card with a title row (title, optional description, actions) and a body. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "grid content-start overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6",
        className,
      )}
    >
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? <Icon aria-hidden="true" className="size-4.5 shrink-0 text-primary" /> : null}
            <div className="grid min-w-0">
              <h2 className="truncate font-heading text-base font-semibold">{title}</h2>
              {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Nothing to show yet: an icon, one sentence, and the next step. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-3 rounded-(--radius-2xl) border border-dashed border-foreground/15 bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-6" />
        </span>
      ) : null}
      <p className="font-heading text-lg font-semibold text-balance">{title}</p>
      {body ? <p className="max-w-sm text-sm text-pretty text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-muted text-foreground/80",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success dark:text-[color-mix(in_oklch,var(--success),white_35%)]",
  warning: "bg-warning/25 text-warning-foreground dark:text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info dark:text-[color-mix(in_oklch,var(--info),white_35%)]",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

/** A small status pill with a dot (paid, pending, cancelled…). */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Classes for the desktop cell (alignment, width). */
  className?: string;
  /** On phones: the card's title, a labelled line (default), or hidden. */
  mobile?: "title" | "line" | "hide";
}

/**
 * A table on desktop, a list of cards on phones (each card: the "title"
 * column on top, the other columns as label/value lines). Rows can link.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  caption,
  empty,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string | number;
  rowHref?: (row: T) => Route | undefined;
  caption?: string;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const titleCol = columns.find((c) => c.mobile === "title");
  const lineCols = columns.filter((c) => c !== titleCol && c.mobile !== "hide");
  return (
    <>
      {/* Phones and tablets: cards */}
      <ul className="grid gap-2.5 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const href = rowHref?.(row);
          const inner = (
            <>
              {titleCol ? <div className="font-semibold">{titleCol.cell(row)}</div> : null}
              <dl className="grid gap-1.5 text-sm">
                {lineCols.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{c.header}</dt>
                    <dd className="min-w-0 text-end">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </>
          );
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link
                  href={href}
                  className="grid gap-2.5 rounded-(--radius-xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 transition-shadow duration-(--motion-fast) hover:shadow-(--shadow-card-hover)"
                >
                  {inner}
                </Link>
              ) : (
                <div className="grid gap-2.5 rounded-(--radius-xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {/* Desktop: table */}
      <div className="overflow-x-auto rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 max-md:hidden">
        <table className="w-full text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b bg-muted/50 text-start">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-start text-xs font-semibold whitespace-nowrap text-muted-foreground",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "transition-colors duration-(--motion-fast)",
                    href && "relative hover:bg-muted/40",
                  )}
                >
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                      {href && i === 0 ? (
                        <Link
                          href={href}
                          className="font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {c.cell(row)}
                        </Link>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** A row of filter links (pills) that marks the active one. */
export function FilterPills({
  label,
  items,
}: {
  label: string;
  items: readonly { href: Route; label: ReactNode; active: boolean; count?: number | string }[];
}) {
  return (
    <nav aria-label={label} className="-mx-1 -my-1 [scrollbar-width:none] overflow-x-auto px-1 py-1">
      <ul className="flex w-max gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 transition-colors duration-(--motion-fast)",
                item.active
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-card text-foreground/75 ring-foreground/10 hover:text-foreground",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    item.active ? "bg-background/20" : "bg-muted",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
