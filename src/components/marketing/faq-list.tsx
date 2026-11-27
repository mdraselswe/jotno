import { ChevronDown } from "lucide-react";

/**
 * Questions that open in place (native `<details>`: keyboard and screen-reader
 * friendly, works without JavaScript, and the answers stay in the HTML for
 * search engines). Pair it with `faqLd` from @/lib/structured-data.
 */
export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-(--radius-2xl) bg-card shadow-(--shadow-card) ring-1 ring-foreground/6 open:ring-primary/25"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-(--radius-2xl) p-5 font-heading text-lg font-semibold text-pretty focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <h3>{item.q}</h3>
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast) ease-(--ease-ui) group-open:rotate-180"
            />
          </summary>
          <p className="px-5 pb-5 text-pretty text-foreground/80">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
