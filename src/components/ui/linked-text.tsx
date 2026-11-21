import Link from "next/link";
import type { Route } from "next";
import { Fragment } from "react";
import { splitAccent } from "@/lib/rich-text";

/** "Agree to our [Terms] and [Privacy]" with hrefs in order → text with links. */
export function LinkedText({ text, hrefs }: { text: string; hrefs: string[] }) {
  let index = 0;
  return splitAccent(text).map((part, i) => {
    if (!part.accent) return <Fragment key={i}>{part.text}</Fragment>;
    const href = hrefs[index++];
    return href ? (
      <Link key={i} href={href as Route} className="underline underline-offset-2 hover:text-foreground">
        {part.text}
      </Link>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    );
  });
}
