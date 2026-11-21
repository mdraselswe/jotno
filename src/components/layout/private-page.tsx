import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Heading for pages inside a private area (smaller than PageShell). */
export function PrivateHeading({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {title}
        </h1>
        {sub ? <p className="max-w-2xl text-pretty text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </header>
  );
}

/** A list-shaped loading state for private pages. */
export function PrivateSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-(--radius-xl)" />
      ))}
    </div>
  );
}

/**
 * Private pages read cookies, so their content renders at request time inside
 * Suspense (the shell around it is static).
 */
export function Private({ children, rows }: { children: ReactNode; rows?: number }) {
  return <Suspense fallback={<PrivateSkeleton rows={rows} />}>{children}</Suspense>;
}
