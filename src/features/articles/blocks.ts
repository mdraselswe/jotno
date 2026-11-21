/**
 * Article bodies are plain text with three light rules, so vets don't need an
 * editor and nothing is ever rendered as HTML:
 *   "## Heading" on its own line, "- item" lines for a list, blank line = new paragraph.
 */
export type Block =
  { type: "h"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length > 0) blocks.push({ type: "p", text: para.join(" ") });
    if (list.length > 0) blocks.push({ type: "ul", items: list });
    para = [];
    list = [];
  };
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h", text: line.slice(3).trim() });
    } else if (/^[-*•] /.test(line)) {
      if (para.length > 0) {
        blocks.push({ type: "p", text: para.join(" ") });
        para = [];
      }
      list.push(line.slice(2).trim());
    } else {
      if (list.length > 0) {
        blocks.push({ type: "ul", items: list });
        list = [];
      }
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** Rough reading time: ~200 words a minute, at least one. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
