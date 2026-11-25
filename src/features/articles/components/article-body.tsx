import { parseBlocks, type Block } from "../blocks";

/** Anchor id of the n-th heading in an article body (for the table of contents). */
export const headingId = (n: number) => `part-${n + 1}`;

/** The article's "## " headings, in order: the table of contents. */
export function articleHeadings(body: string): string[] {
  return parseBlocks(body)
    .filter((b): b is Extract<Block, { type: "h" }> => b.type === "h")
    .map((b) => b.text);
}

/**
 * Renders an article body (plain text rules, never HTML) with reading
 * typography: a comfortable measure, a larger first paragraph, roomy headings
 * that leave space under the floating header when jumped to.
 */
export function ArticleBody({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  const headingIndex = blocks.map((b, i) => blocks.slice(0, i).filter((x) => x.type === "h").length);
  const lead = blocks.findIndex((b) => b.type === "p");
  return (
    <div className="grid max-w-[68ch] gap-5 text-[1.0625rem] leading-[1.8] text-pretty text-foreground/90 md:text-lg">
      {blocks.map((b, i) =>
        b.type === "h" ? (
          <h2
            key={i}
            id={headingId(headingIndex[i] ?? 0)}
            className="mt-6 scroll-mt-28 font-heading text-2xl leading-snug font-bold tracking-tight text-balance text-foreground md:text-[1.75rem]"
          >
            {b.text}
          </h2>
        ) : b.type === "ul" ? (
          <ul key={i} className="grid gap-2 ps-6">
            {b.items.map((item, j) => (
              <li key={j} className="list-disc ps-1 marker:text-primary">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i === lead ? "text-lg leading-[1.75] text-foreground md:text-xl" : undefined}>
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
