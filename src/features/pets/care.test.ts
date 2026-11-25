import { describe, expect, it } from "vitest";
import { currentCare, stillCurrent, worstState } from "./care";

const row = (title: string, givenOn: string, dueOn: string | null, petId = "p1", kind = "vaccine") => ({
  petId,
  kind,
  title,
  givenOn,
  dueOn,
});

describe("currentCare", () => {
  it("keeps only the newest record of the same pet, kind and name", () => {
    const old = row("Rabies", "2025-01-10", "2026-01-10");
    const fresh = row("rabies ", "2026-01-12", "2027-01-12");
    expect(currentCare([old, fresh])).toEqual([fresh]);
  });

  it("keeps different vaccines, kinds and pets apart", () => {
    const rows = [
      row("Rabies", "2026-01-01", "2027-01-01"),
      row("DHPP", "2025-01-01", "2026-01-01"),
      row("Rabies", "2025-01-01", "2026-01-01", "p2"),
      row("Rabies", "2025-06-01", "2025-09-01", "p1", "deworm"),
    ];
    expect(currentCare(rows)).toHaveLength(4);
  });
});

describe("worstState", () => {
  it("is none without records", () => {
    expect(worstState([], "2026-11-25")).toBe("none");
  });

  it("ignores a superseded overdue record", () => {
    const rows = [row("Rabies", "2025-01-10", "2026-01-10"), row("Rabies", "2026-01-12", "2027-01-12")];
    expect(worstState(rows, "2026-11-25")).toBe("ok");
  });

  it("returns the most urgent current state", () => {
    const rows = [row("Rabies", "2026-01-12", "2027-01-12"), row("DHPP", "2025-11-01", "2026-11-30")];
    expect(worstState(rows, "2026-11-25")).toBe("soon");
  });
});

describe("stillCurrent", () => {
  const withId = <T extends object>(id: string, r: T) => ({ id, ...r });

  it("drops a due-soon record that a newer one of the same line replaced", () => {
    const old = withId("a", row("Rabies", "2025-11-28", "2026-11-28"));
    const fresh = withId("b", row("Rabies", "2026-11-20", "2027-11-20"));
    expect(stillCurrent([old], [old, fresh])).toEqual([]);
  });

  it("keeps the newest record of each line and other pets' records", () => {
    const rabies = withId("a", row("Rabies", "2025-11-28", "2026-11-28"));
    const deworm = withId("c", row("Deworm", "2026-08-28", "2026-11-28", "p1", "deworm"));
    const otherPet = withId("d", row("Rabies", "2025-11-28", "2026-11-28", "p2"));
    const olderRabies = withId("e", row("Rabies", "2024-11-28", "2025-11-28"));
    expect(stillCurrent([rabies, deworm, otherPet], [olderRabies, rabies, deworm, otherPet])).toEqual([
      rabies,
      deworm,
      otherPet,
    ]);
  });
});
