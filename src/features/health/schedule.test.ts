import { describe, expect, it } from "vitest";
import { addDays, defaultDue, dueState, ringProgress, shouldRemind } from "./schedule";

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

  it("reminds a week before, the day before and on the day, once a day", () => {
    expect(shouldRemind("2026-12-08", "2026-12-01", null)).toBe(true);
    expect(shouldRemind("2026-12-08", "2026-12-02", null)).toBe(false);
    expect(shouldRemind("2026-12-02", "2026-12-01", "2026-12-01")).toBe(false);
  });
});
