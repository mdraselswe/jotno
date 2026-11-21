import { describe, expect, it } from "vitest";
import { parseBlocks, readingMinutes } from "./blocks";

describe("parseBlocks", () => {
  it("splits headings, paragraphs and lists", () => {
    const body = "Intro line one\nline two\n\n## Signs\n- not eating\n- hiding\nAfter list\n\n\nEnd";
    expect(parseBlocks(body)).toEqual([
      { type: "p", text: "Intro line one line two" },
      { type: "h", text: "Signs" },
      { type: "ul", items: ["not eating", "hiding"] },
      { type: "p", text: "After list" },
      { type: "p", text: "End" },
    ]);
  });

  it("treats markup as text", () => {
    expect(parseBlocks("<script>x</script>")).toEqual([{ type: "p", text: "<script>x</script>" }]);
  });

  it("handles Windows line endings and empty input", () => {
    expect(parseBlocks("a\r\n\r\nb")).toEqual([
      { type: "p", text: "a" },
      { type: "p", text: "b" },
    ]);
    expect(parseBlocks("")).toEqual([]);
  });
});

describe("readingMinutes", () => {
  it("is at least one minute", () => {
    expect(readingMinutes("short")).toBe(1);
    expect(readingMinutes(Array.from({ length: 1000 }, () => "word").join(" "))).toBe(5);
  });
});
