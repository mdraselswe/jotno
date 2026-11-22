import { type ReactNode, ViewTransition } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { RichText } from "@/components/ui/rich-text";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CONTAINER = "container-page relative overflow-x-clip py-14 md:py-20";
const HEADER = "relative mb-12 grid max-w-3xl gap-4";
const TITLE =
  "font-heading text-5xl leading-[0.95] font-extrabold tracking-tight text-balance [font-stretch:80%] md:text-7xl";
const SUB = "text-lg text-pretty text-muted-foreground";

/** Standard page heading + content, with the page transition. PageShellSkeleton is its loading twin. */
export function PageShell({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <PageTransition>
      <div className={CONTAINER}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 right-[-6rem] -z-10 size-72 jelly bg-band-care/50 blur-2xl md:size-96"
        />
        <header className={HEADER}>
          <h1 className={TITLE}>
            <RichText text={title} />
          </h1>
          {sub ? <p className={SUB}>{sub}</p> : null}
        </header>
        {children}
      </div>
    </PageTransition>
  );
}

/**
 * PageShell's skeleton: same container, same heading sizes (one line each,
 * `h-[1lh]` in the heading's own text size), so the page lands without a jump.
 * Pass a skeleton of the page body as children. It fades out as the page
 * fades in (exit-fade / enter-rise).
 */
export function PageShellSkeleton({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <ViewTransition exit="exit-fade" default="none">
      <div role="status" aria-label={label} className={CONTAINER}>
        <div className={HEADER}>
          <Skeleton className={cn(TITLE, "h-[1lh] w-3/4")} />
          <Skeleton className={cn(SUB, "h-[1lh] w-1/2")} />
        </div>
        {children}
      </div>
    </ViewTransition>
  );
}
