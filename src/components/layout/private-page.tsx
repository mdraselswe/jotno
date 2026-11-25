import type { LucideIcon } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "./app-ui";

/** Heading for pages inside a private area (the shared PageHeader). */
export function PrivateHeading({
  title,
  sub,
  action,
  icon,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return <PageHeader title={title} sub={sub} actions={action} icon={icon} />;
}

/** A list-shaped loading state for private pages. */
export function PrivateSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" className="grid gap-4">
      <Skeleton className="h-9 w-64 max-w-full rounded-(--radius-lg)" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-(--radius-2xl)" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-(--radius-2xl)" />
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
