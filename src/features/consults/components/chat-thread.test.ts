import { describe, expect, it } from "vitest";
import {
  buildThread,
  countFromOthers,
  dayKey,
  isEmojiOnly,
  linkify,
  mergeMessages,
  relativeDay,
  type ThreadMessage,
} from "./chat-thread";

const TZ = "Asia/Dhaka";
const msg = (id: string, senderId: string | null, createdAt: string, body = "hi"): ThreadMessage => ({
  id,
  senderId,
  body,
  hasImage: false,
  readAt: null,
  createdAt,
});

describe("mergeMessages", () => {
  it("adds new messages in time order and replaces by id", () => {
    const a = msg("a", "me", "2026-11-25T10:00:00.000Z");
    const b = msg("b", "you", "2026-11-25T10:01:00.000Z");
    const c = msg("c", "me", "2026-11-25T10:00:30.000Z");
    const merged = mergeMessages([a, b], [c, { ...a, readAt: "2026-11-25T10:02:00.000Z" }]);
    expect(merged.map((m) => m.id)).toEqual(["a", "c", "b"]);
    expect(merged[0]?.readAt).not.toBeNull();
  });
  it("never shows a message twice (live event and send result)", () => {
    const a = msg("a", "me", "2026-11-25T10:00:00.000Z");
    expect(mergeMessages(mergeMessages([], [a]), [a])).toHaveLength(1);
  });
});

describe("dayKey and relativeDay", () => {
  it("uses the site's time zone (Dhaka is UTC+6)", () => {
    expect(dayKey(new Date("2026-11-24T18:30:00Z"), TZ)).toBe("2026-11-25");
    expect(dayKey(new Date("2026-11-24T17:59:00Z"), TZ)).toBe("2026-11-24");
  });
  it("names today and yesterday, across a month end", () => {
    expect(relativeDay("2026-12-01", "2026-12-01")).toBe("today");
    expect(relativeDay("2026-11-30", "2026-12-01")).toBe("yesterday");
    expect(relativeDay("2026-11-29", "2026-12-01")).toBeNull();
  });
});

describe("buildThread", () => {
  it("groups one sender's messages a few minutes apart and adds day separators", () => {
    const rows = buildThread(
      [
        msg("s", null, "2026-11-25T03:59:00.000Z", "system:opened"),
        msg("1", "me", "2026-11-25T04:00:00.000Z"),
        msg("2", "me", "2026-11-25T04:01:00.000Z"),
        msg("3", "me", "2026-11-25T04:02:00.000Z"),
        msg("4", "you", "2026-11-25T04:03:00.000Z"),
        msg("5", "you", "2026-11-25T04:30:00.000Z"),
        msg("6", "you", "2026-11-25T19:00:00.000Z"),
      ],
      "me",
      TZ,
    );
    expect(rows.map((r) => (r.kind === "message" ? `${r.message.id}:${r.position}` : r.kind))).toEqual([
      "day",
      "system",
      "1:first",
      "2:middle",
      "3:last",
      "4:single",
      "5:single",
      "day",
      "6:single",
    ]);
    const first = rows[2];
    expect(first?.kind === "message" && first.mine).toBe(true);
  });
  it("a system line breaks a group", () => {
    const rows = buildThread(
      [
        msg("1", "me", "2026-11-25T04:00:00.000Z"),
        msg("s", null, "2026-11-25T04:00:10.000Z", "system:call:audio:missed:0"),
        msg("2", "me", "2026-11-25T04:00:20.000Z"),
      ],
      "me",
      TZ,
    );
    expect(rows.flatMap((r) => (r.kind === "message" ? [r.position] : []))).toEqual(["single", "single"]);
  });
});

describe("linkify", () => {
  it("finds http(s) and www links and leaves trailing punctuation out", () => {
    expect(linkify("see https://jotno.app/vets, or www.example.com.")).toEqual([
      { text: "see " },
      { text: "https://jotno.app/vets", href: "https://jotno.app/vets" },
      { text: ", or " },
      { text: "www.example.com", href: "https://www.example.com" },
      { text: "." },
    ]);
  });
  it("never links other schemes", () => {
    expect(linkify("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
  });
  it("plain text stays one part", () => {
    expect(linkify("আমার বিড়াল খাচ্ছে না")).toEqual([{ text: "আমার বিড়াল খাচ্ছে না" }]);
  });
});

describe("isEmojiOnly", () => {
  it("is true for one to three emoji", () => {
    expect(isEmojiOnly("👍")).toBe(true);
    expect(isEmojiOnly("🐶🐱 ❤️")).toBe(true);
    expect(isEmojiOnly("👍🏽")).toBe(true);
    expect(isEmojiOnly("🇧🇩")).toBe(true);
  });
  it("is false for text, digits or many emoji", () => {
    expect(isEmojiOnly("ok 👍")).toBe(false);
    expect(isEmojiOnly("123")).toBe(false);
    expect(isEmojiOnly("😀😀😀😀")).toBe(false);
    expect(isEmojiOnly(null)).toBe(false);
  });
});

describe("countFromOthers", () => {
  it("counts only the other side's messages after an index", () => {
    const list = [
      msg("1", "you", "2026-11-25T04:00:00.000Z"),
      msg("2", "me", "2026-11-25T04:01:00.000Z"),
      msg("3", "you", "2026-11-25T04:02:00.000Z"),
      msg("4", null, "2026-11-25T04:03:00.000Z"),
    ];
    expect(countFromOthers(list, "me", 1)).toBe(1);
    expect(countFromOthers(list, "me", 0)).toBe(2);
  });
});
