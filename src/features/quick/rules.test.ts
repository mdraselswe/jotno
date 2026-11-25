import { describe, expect, it } from "vitest";
import {
  formatClock,
  inDutyWindow,
  isUnanswered,
  minutesLeft,
  onDuty,
  ownerCanSend,
  parseClock,
  quickCommission,
  upgradeFee,
} from "./rules";

const now = new Date("2026-11-25T12:00:00Z");

describe("inDutyWindow", () => {
  it("handles a daytime window", () => {
    expect(inDutyWindow(600, 540, 1020)).toBe(true); // 10:00 in 09:00–17:00
    expect(inDutyWindow(1020, 540, 1020)).toBe(false);
  });
  it("handles a window past midnight", () => {
    expect(inDutyWindow(1380, 1080, 120)).toBe(true); // 23:00 in 18:00–02:00
    expect(inDutyWindow(60, 1080, 120)).toBe(true);
    expect(inDutyWindow(600, 1080, 120)).toBe(false);
  });
  it("treats equal start and end as all day, missing as never", () => {
    expect(inDutyWindow(5, 0, 0)).toBe(true);
    expect(inDutyWindow(5, null, 60)).toBe(false);
  });
});

describe("onDuty", () => {
  const off = { availableNow: false, availableUntil: null, dutyStart: null, dutyEnd: null };
  it("is on duty while available now", () => {
    expect(onDuty({ ...off, availableNow: true }, now, 0)).toBe(true);
    expect(
      onDuty({ ...off, availableNow: true, availableUntil: new Date("2026-11-25T11:00:00Z") }, now, 0),
    ).toBe(false);
  });
  it("is on duty inside duty hours", () => {
    expect(onDuty({ ...off, dutyStart: 540, dutyEnd: 1020 }, now, 600)).toBe(true);
    expect(onDuty(off, now, 600)).toBe(false);
  });
});

describe("money", () => {
  it("splits ৳99 into ৳70 for the vet and ৳29 for Jotno", () => {
    expect(quickCommission(9_900, 7_000)).toBe(2_900);
  });
  it("charges the difference to upgrade, at least ৳1", () => {
    expect(upgradeFee(50_000, 9_900)).toBe(40_100);
    expect(upgradeFee(9_900, 9_900)).toBe(100);
  });
});

describe("waiting", () => {
  const openedAt = new Date("2026-11-25T11:30:00Z");
  it("counts down the answer window", () => {
    expect(minutesLeft({ status: "open", openedAt }, now, 60)).toBe(30);
    expect(minutesLeft({ status: "claimed", openedAt }, now, 60)).toBeNull();
  });
  it("is unanswered once the window is over", () => {
    expect(isUnanswered({ status: "open", openedAt }, now, 30)).toBe(true);
    expect(isUnanswered({ status: "open", openedAt }, now, 60)).toBe(false);
  });
});

describe("ownerCanSend", () => {
  it("limits follow-ups only in quick chats", () => {
    expect(ownerCanSend("quick", 5, 6)).toBe(true);
    expect(ownerCanSend("quick", 6, 6)).toBe(false);
    expect(ownerCanSend("full", 100, 6)).toBe(true);
  });
});

describe("clock", () => {
  it("parses and formats HH:MM", () => {
    expect(parseClock("18:30")).toBe(1110);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("")).toBeNull();
    expect(formatClock(1110)).toBe("18:30");
  });
});
