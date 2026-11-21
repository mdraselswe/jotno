import { parseBlocks } from "../blocks";

/** Renders an article body (plain text rules, never HTML). */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="grid max-w-prose gap-4 leading-relaxed text-pretty">
      {parseBlocks(body).map((b, i) =>
        b.type === "h" ? (
          <h2 key={i} className="mt-4 font-heading text-xl font-semibold">
            {b.text}
          </h2>
        ) : b.type === "ul" ? (
          <ul key={i} className="grid list-disc gap-1 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
