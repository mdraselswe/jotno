import { describe, expect, it } from "vitest";
import { dhakaDay, dhakaInstant, dhakaWeekday, freeSlots, nextDays, toHhmm, toMinutes } from "./slots";

describe("Dhaka time", () => {
  it("converts between Dhaka days and UTC", () => {
    expect(dhakaInstant("2026-12-01", 9 * 60).toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(dhakaDay(new Date("2026-11-30T19:00:00Z"))).toBe("2026-12-01"); // 1 am in Dhaka
    expect(dhakaWeekday("2026-12-01")).toBe(2); // Tuesday
    expect(toMinutes("09:30")).toBe(570);
    expect(toHhmm(570)).toBe("09:30");
  });

  it("lists the next days from Dhaka's today", () => {
    expect(nextDays(new Date("2026-11-30T19:00:00Z"), 3)).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
  });
});

describe("freeSlots", () => {
  const hours = [{ weekday: 2, startMinute: 9 * 60, endMinute: 10 * 60, slotMinutes: 20 }];
  const early = new Date("2026-11-30T00:00:00Z");

  it("cuts opening hours into slots and skips booked ones", () => {
    const taken = [dhakaInstant("2026-12-01", 9 * 60 + 20)];
    const slots = freeSlots("2026-12-01", hours, taken, early);
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2026-12-01T03:00:00.000Z",
      "2026-12-01T03:40:00.000Z",
    ]);
  });

  it("returns nothing on a closed day and skips slots too soon", () => {
    expect(freeSlots("2026-12-02", hours, [], early)).toEqual([]);
    const now = new Date("2026-12-01T02:30:00Z"); // 08:30 Dhaka, 60 min lead → from 09:30
    expect(freeSlots("2026-12-01", hours, [], now).map((s) => s.start.toISOString())).toEqual([
      "2026-12-01T03:40:00.000Z",
    ]);
  });
});
