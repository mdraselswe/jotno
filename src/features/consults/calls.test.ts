import { describe, expect, it } from "vitest";
import {
  answerUrl,
  isChatPage,
  callLine,
  clock,
  endStatus,
  isInAppBrowser,
  isStale,
  parseCallLine,
  ringExpired,
  talkSeconds,
} from "./calls";

const at = (iso: string) => new Date(iso);

describe("endStatus", () => {
  it("answered calls end as ended, whatever the reason", () => {
    expect(endStatus(true, "hangup")).toBe("ended");
    expect(endStatus(true, "failed")).toBe("ended");
    expect(endStatus(true, "stale")).toBe("ended");
  });
  it("unanswered calls are declined, failed or missed", () => {
    expect(endStatus(false, "decline")).toBe("declined");
    expect(endStatus(false, "failed")).toBe("failed");
    expect(endStatus(false, "cancel")).toBe("missed");
    expect(endStatus(false, "no_answer")).toBe("missed");
  });
});

describe("talkSeconds", () => {
  it("counts from answer to end", () => {
    expect(talkSeconds(at("2026-01-01T10:00:00Z"), at("2026-01-01T10:04:05Z"))).toBe(245);
  });
  it("is 0 when never answered or not ended", () => {
    expect(talkSeconds(null, at("2026-01-01T10:00:00Z"))).toBe(0);
    expect(talkSeconds(at("2026-01-01T10:00:00Z"), null)).toBe(0);
  });
});

describe("ringExpired / isStale", () => {
  const now = at("2026-01-01T10:01:00Z");
  it("expires a ring after the window", () => {
    expect(ringExpired(at("2026-01-01T10:00:15Z"), now, 45)).toBe(true);
    expect(ringExpired(at("2026-01-01T10:00:30Z"), now, 45)).toBe(false);
  });
  it("uses the last heartbeat, else the answer time", () => {
    expect(isStale(at("2026-01-01T09:59:00Z"), null, now, 90)).toBe(true);
    expect(isStale(at("2026-01-01T10:00:30Z"), null, now, 90)).toBe(false);
    expect(isStale(null, at("2026-01-01T09:58:00Z"), now, 90)).toBe(true);
    expect(isStale(null, null, now, 90)).toBe(false);
  });
});

describe("call lines in the chat", () => {
  it("round-trips", () => {
    const line = callLine("video", "ended", 245.4);
    expect(line).toBe("system:call:video:ended:245");
    expect(parseCallLine(line)).toEqual({ media: "video", status: "ended", seconds: 245 });
  });
  it("ignores other messages", () => {
    expect(parseCallLine("system:closed")).toBeNull();
    expect(parseCallLine(null)).toBeNull();
    expect(parseCallLine("system:call:fax:ended:1")).toBeNull();
  });
});

describe("clock", () => {
  it("formats minutes and hours", () => {
    expect(clock(5)).toBe("0:05");
    expect(clock(245)).toBe("4:05");
    expect(clock(3729)).toBe("1:02:09");
  });
});

describe("isInAppBrowser", () => {
  it("spots Facebook and Messenger", () => {
    expect(
      isInAppBrowser(
        "Mozilla/5.0 (Linux; Android 13; SM-A145F Build/TP1A; wv) AppleWebKit/537.36 Chrome/120 Mobile [FB_IAB/FB4A;FBAV/447.0;]",
      ),
    ).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) [FBAN/MessengerForiOS;FBAV/450]")).toBe(
      true,
    );
  });
  it("lets normal browsers through", () => {
    expect(
      isInAppBrowser(
        "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("answerUrl / isChatPage", () => {
  const id = "0b6c1f3e-1d2a-4c3b-9e8f-123456789abc";
  it("adds the trailing slash before the query", () => {
    expect(answerUrl(`/chat/${id}`, "c1")).toBe(`/chat/${id}/?answer=c1`);
    expect(answerUrl(`/en/chat/${id}/`, "c1")).toBe(`/en/chat/${id}/?answer=c1`);
  });
  it("matches the chat page in any locale", () => {
    expect(isChatPage(`/chat/${id}`, id)).toBe(true);
    expect(isChatPage(`/en/chat/${id}/`, id)).toBe(true);
    expect(isChatPage(`/chat/${id}/rx`, id)).toBe(false);
    expect(isChatPage("/dashboard", id)).toBe(false);
  });
});
