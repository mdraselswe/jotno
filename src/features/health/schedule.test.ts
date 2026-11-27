import { describe, expect, it } from "vitest";
import { addDays, defaultDue, dueState, reminderDue, reminderStage, ringProgress } from "./schedule";

describe("health schedule", () => {
  it("defaults the next due date by kind", () => {
    expect(defaultDue("deworm", "2026-01-01")).toBe("2026-04-01");
    expect(defaultDue("vaccine", "2026-01-01")).toBe("2027-01-01");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });

  it("tells ok, soon and due apart", () => {
    expect(dueState("2026-12-30", "2026-12-01")).toBe("ok");
    expect(dueState("2026-12-10", "2026-12-01")).toBe("soon");
    expect(dueState("2026-12-01", "2026-12-01")).toBe("due");
    expect(dueState("2026-11-01", "2026-12-01")).toBe("due");
    expect(dueState(null, "2026-12-01")).toBe("none");
  });

  it("ring is full right after and empty when due", () => {
    expect(ringProgress("deworm", "2026-12-01", null, "2026-12-01")).toBe(1);
    expect(ringProgress("deworm", "2026-09-01", "2026-12-01", "2026-12-01")).toBe(0);
    expect(ringProgress("deworm", null, null, "2026-12-01")).toBe(0);
    expect(ringProgress("deworm", "2026-10-01", "2026-12-30", "2026-11-15")).toBeCloseTo(0.5, 1);
  });

  it("splits the last week into three reminder stages", () => {
    expect(reminderStage(8)).toBeNull();
    expect(reminderStage(7)).toBe("week");
    expect(reminderStage(2)).toBe("week");
    expect(reminderStage(1)).toBe("tomorrow");
    expect(reminderStage(0)).toBe("today");
    expect(reminderStage(-1)).toBeNull();
  });

  it("reminds a week before, the day before and on the day, once each", () => {
    expect(reminderDue("2026-12-08", "2026-12-01", null)).toBe("week");
    // Already reminded this week: wait for the day before.
    expect(reminderDue("2026-12-08", "2026-12-02", "2026-12-01")).toBeNull();
    expect(reminderDue("2026-12-08", "2026-12-07", "2026-12-01")).toBe("tomorrow");
    expect(reminderDue("2026-12-08", "2026-12-08", "2026-12-07")).toBe("today");
    // Never twice on the same day.
    expect(reminderDue("2026-12-02", "2026-12-01", "2026-12-01")).toBeNull();
    // Too early, or already past.
    expect(reminderDue("2026-12-20", "2026-12-01", null)).toBeNull();
    expect(reminderDue("2026-11-30", "2026-12-01", null)).toBeNull();
  });

  it("catches up a stage the daily job missed", () => {
    // Added 4 days before it's due, or the run 7 days before failed.
    expect(reminderDue("2026-12-05", "2026-12-01", null)).toBe("week");
    // The day-before run failed: on the day it still says "today".
    expect(reminderDue("2026-12-08", "2026-12-08", "2026-12-02")).toBe("today");
    // Due date moved a month later after a reminder: remind again in the new week.
    expect(reminderDue("2027-01-08", "2027-01-01", "2026-12-07")).toBe("week");
  });
});
