import { describe, expect, it } from "vitest";
import { canSend, closesAt, needsAutoRefund, needsClose, nudgeStep, replyMinutesLeft, roleIn } from "./rules";

const policy = { openHours: 24, replyWindowMinutes: 30 };
const opened = new Date("2026-12-01T10:00:00Z");
const at = (min: number) => new Date(opened.getTime() + min * 60_000);
const active = {
  status: "active" as const,
  openedAt: opened,
  firstReplyAt: null,
  closesAt: closesAt(opened, policy),
};

describe("consult rules", () => {
  it("closes 24 hours after opening", () => {
    expect(closesAt(opened, policy).toISOString()).toBe("2026-12-02T10:00:00.000Z");
  });

  it("refunds when the vet is silent for the reply window", () => {
    expect(needsAutoRefund(active, at(29), policy)).toBe(false);
    expect(needsAutoRefund(active, at(30), policy)).toBe(true);
    expect(needsAutoRefund({ ...active, firstReplyAt: at(5) }, at(60), policy)).toBe(false);
    expect(needsAutoRefund({ ...active, status: "closed" }, at(60), policy)).toBe(false);
  });

  it("closes after its time, unless it is a refund case", () => {
    const replied = { ...active, firstReplyAt: at(3) };
    expect(needsClose(replied, at(24 * 60 - 1), policy)).toBe(false);
    expect(needsClose(replied, at(24 * 60), policy)).toBe(true);
    expect(needsClose(active, at(24 * 60), policy)).toBe(false); // never replied → refund instead
  });

  it("counts down the reply window", () => {
    expect(replyMinutesLeft(active, at(10), policy)).toBe(20);
    expect(replyMinutesLeft(active, at(45), policy)).toBe(0);
    expect(replyMinutesLeft({ ...active, firstReplyAt: at(1) }, at(10), policy)).toBeNull();
  });

  it("only active consults take messages", () => {
    expect(canSend(active)).toBe(true);
    expect(canSend({ status: "closed" })).toBe(false);
  });

  it("knows who is who", () => {
    const c = { ownerId: "u1", providerProfileId: "u2" };
    expect(roleIn(c, "u1")).toBe("owner");
    expect(roleIn(c, "u2")).toBe("vet");
    expect(roleIn(c, "u3")).toBeNull();
    expect(roleIn(c, undefined)).toBeNull();
  });
});

describe("nudgeStep", () => {
  it("reminds the vet at a third and two thirds of the reply window", () => {
    expect(nudgeStep(opened, at(5), 30)).toBe(0);
    expect(nudgeStep(opened, at(10), 30)).toBe(1);
    expect(nudgeStep(opened, at(19), 30)).toBe(1);
    expect(nudgeStep(opened, at(20), 30)).toBe(2);
    expect(nudgeStep(opened, at(30), 30)).toBe(0);
  });
});
