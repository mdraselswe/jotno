import { describe, expect, it } from "vitest";
import { atLeast, levelFor, nextLevel, withMultiplier, type LevelRules } from "./levels";

const rules: LevelRules = {
  levels: { star: 3, gold: 10, platinum: 25 },
  multiplierBps: { star: 10_000, gold: 15_000, platinum: 20_000 },
};

describe("levelFor", () => {
  it("climbs with paid invites", () => {
    expect(levelFor(0, rules)).toBe("none");
    expect(levelFor(3, rules)).toBe("star");
    expect(levelFor(9, rules)).toBe("star");
    expect(levelFor(10, rules)).toBe("gold");
    expect(levelFor(40, rules)).toBe("platinum");
  });
});

describe("nextLevel", () => {
  it("says what is left to the next level", () => {
    expect(nextLevel(1, rules)).toEqual({ level: "star", left: 2 });
    expect(nextLevel(12, rules)).toEqual({ level: "platinum", left: 13 });
    expect(nextLevel(25, rules)).toBeNull();
  });
});

describe("atLeast", () => {
  it("compares levels", () => {
    expect(atLeast("gold", "star")).toBe(true);
    expect(atLeast("star", "gold")).toBe(false);
    expect(atLeast("none", "star")).toBe(false);
  });
});

describe("withMultiplier", () => {
  it("multiplies invite points by level", () => {
    expect(withMultiplier(25, "none", rules)).toBe(25);
    expect(withMultiplier(25, "gold", rules)).toBe(37);
    expect(withMultiplier(25, "platinum", rules)).toBe(50);
  });
});
