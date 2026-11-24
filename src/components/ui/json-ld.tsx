/**
 * JSON for a `<script type="application/ld+json">`: `<`, `>` and `&` become
 * `\u003c`, `\u003e`, `\u0026`, so user text such as a question title can't
 * close the script tag (`</script>`) or open a comment. Still valid JSON.
 */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Structured data for search engines. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
