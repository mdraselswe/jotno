import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Small server-safe parts the admin pages share: a search box that keeps the
 * current filter, prev/next paging, a back link, a label/value list and
 * skeletons shaped like the admin pages (header, filters, a table).
 */

/** A GET search form: the query goes in ?q=, the other filters stay as hidden fields. */
export function AdminSearch({
  action,
  q,
  label,
  placeholder,
  submit,
  clear,
  clearHref,
  keep = {},
}: {
  action: string;
  q: string;
  label: string;
  placeholder: string;
  submit: string;
  clear: string;
  clearHref: Route;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} role="search" className="flex w-full max-w-xl gap-2">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="admin-q" className="sr-only">
          {label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="admin-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          maxLength={60}
          className="ps-9"
        />
      </div>
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Button type="submit" variant="outline">
        <Search aria-hidden="true" className="sm:hidden" />
        <span className="max-sm:sr-only">{submit}</span>
      </Button>
      {q ? (
        <ButtonLink href={clearHref} variant="ghost" size="icon" aria-label={clear} title={clear}>
          <X aria-hidden="true" />
        </ButtonLink>
      ) : null}
    </form>
  );
}

/** "Page 2" with previous/next links (either may be missing). */
export function AdminPager({
  page,
  prevHref,
  nextHref,
  label,
  prev,
  next,
  pageLabel,
}: {
  page: number;
  prevHref?: Route;
  nextHref?: Route;
  label: string;
  prev: string;
  next: string;
  pageLabel: string;
}) {
  if (!prevHref && !nextHref) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3">
      {prevHref ? (
        <ButtonLink href={prevHref} variant="outline" size="sm" rel="prev">
          <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          {prev}
        </ButtonLink>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground tabular-nums" aria-current="page">
        {pageLabel || page}
      </span>
      {nextHref ? (
        <ButtonLink href={nextHref} variant="outline" size="sm" rel="next">
          {next}
          <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** A quiet link back to the list a detail page came from. */
export function BackLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-md) text-sm font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      {children}
    </Link>
  );
}

/** Label/value pairs (two columns from small screens up). Empty values show a dash. */
export function FactList({
  items,
  className,
}: {
  items: readonly { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2", className)}>
      {items.map((f) => (
        <div key={f.label} className="grid min-w-0 gap-0.5">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="min-w-0 font-medium break-words">{f.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Skeletons (same shapes as the pages) ────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="flex items-start gap-3.5">
      <Skeleton className="mt-0.5 size-11 shrink-0 rounded-(--radius-xl) max-sm:hidden" />
      <div className="grid flex-1 gap-1">
        <Skeleton className="h-[1lh] w-48 max-w-full text-2xl md:text-3xl" />
        <Skeleton className="h-[1lh] w-80 max-w-full text-sm md:text-base" />
      </div>
    </div>
  );
}

function StatsSkeleton({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="grid gap-3 rounded-(--radius-2xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-[1lh] w-2/3 text-xs sm:text-sm" />
            <Skeleton className="size-8 rounded-(--radius-md)" />
          </div>
          <Skeleton className="h-7 w-16 sm:h-8" />
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <>
      <ul className="grid gap-2.5 md:hidden">
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className="grid gap-2.5 rounded-(--radius-xl) bg-card p-4 shadow-(--shadow-card) ring-1 ring-foreground/6"
          >
            <Skeleton className="h-[1lh] w-2/3" />
            <Skeleton className="h-[1lh] w-full text-sm" />
            <Skeleton className="h-[1lh] w-1/2 text-sm" />
          </li>
        ))}
      </ul>
      <div className="overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 max-md:hidden">
        <div className="h-10 border-b bg-muted/50" />
        <div className="divide-y">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-[1lh] w-1/4 text-sm" />
              <Skeleton className="h-[1lh] w-1/5 text-sm" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="ms-auto h-[1lh] w-16 text-sm" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Overview: header, the attention strip and three stat groups. */
export function AdminOverviewSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-8">
      <HeaderSkeleton />
      <StatsSkeleton n={4} />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="grid gap-3">
          <Skeleton className="h-[1lh] w-32 text-lg" />
          <StatsSkeleton n={4} />
        </div>
      ))}
    </div>
  );
}

/** A list page: header, search + filter pills (optional), a table (cards on phones). */
export function AdminListSkeleton({
  label,
  rows = 6,
  search = true,
  filters = true,
  stats = 0,
}: {
  label: string;
  rows?: number;
  search?: boolean;
  filters?: boolean;
  stats?: number;
}) {
  return (
    <div role="status" aria-label={label} className="grid gap-6">
      <HeaderSkeleton />
      {stats > 0 ? <StatsSkeleton n={stats} /> : null}
      {search || filters ? (
        <div className="grid gap-3">
          {search ? (
            <Skeleton className="h-(--control-h) w-full max-w-xl rounded-(--control-radius)" />
          ) : null}
          {filters ? (
            <div className="flex gap-1.5 overflow-hidden">
              {["w-16", "w-20", "w-18", "w-24", "w-16"].map((w, i) => (
                <Skeleton key={i} className={cn("h-9 shrink-0 rounded-full", w)} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <RowsSkeleton rows={rows} />
    </div>
  );
}

/** A detail page: back link, header, a summary card and a side panel. */
export function AdminDetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-6">
      <Skeleton className="h-[1lh] w-28 text-sm" />
      <HeaderSkeleton />
      <StatsSkeleton n={4} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <Skeleton className="h-56 rounded-(--radius-2xl)" />
          <Skeleton className="h-40 rounded-(--radius-2xl)" />
        </div>
        <Skeleton className="h-64 rounded-(--radius-2xl)" />
      </div>
    </div>
  );
}

/** Settings: header and grouped cards. */
export function AdminFormSkeleton({ label, cards = 4 }: { label: string; cards?: number }) {
  return (
    <div role="status" aria-label={label} className="grid gap-6">
      <HeaderSkeleton />
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="grid overflow-hidden rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6"
        >
          <div className="flex items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
            <Skeleton className="size-4.5 rounded-full" />
            <Skeleton className="h-[1lh] w-40 text-base" />
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="grid gap-2">
                <Skeleton className="h-[1lh] w-24 text-sm" />
                <Skeleton className="h-(--control-h) rounded-(--control-radius)" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
