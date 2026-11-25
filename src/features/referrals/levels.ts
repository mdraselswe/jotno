/** Invite levels from paid invites (pure, unit-tested). */
export type Level = "none" | "star" | "gold" | "platinum";
export type RankedLevel = Exclude<Level, "none">;

export const LEVELS: readonly RankedLevel[] = ["star", "gold", "platinum"];

export interface LevelRules {
  levels: Record<RankedLevel, number>;
  multiplierBps: Record<RankedLevel, number>;
}

export function levelFor(paidInvites: number, rules: LevelRules): Level {
  if (paidInvites >= rules.levels.platinum) return "platinum";
  if (paidInvites >= rules.levels.gold) return "gold";
  if (paidInvites >= rules.levels.star) return "star";
  return "none";
}

/** The next level and how many more paid invites it needs (null at the top). */
export function nextLevel(
  paidInvites: number,
  rules: LevelRules,
): { level: RankedLevel; left: number } | null {
  for (const level of LEVELS) {
    if (paidInvites < rules.levels[level]) return { level, left: rules.levels[level] - paidInvites };
  }
  return null;
}

/** Whether `level` is at least `min`. */
export function atLeast(level: Level, min: RankedLevel): boolean {
  return level !== "none" && LEVELS.indexOf(level) >= LEVELS.indexOf(min);
}

/** Invite points after the level multiplier (whole points, rounded down). */
export function withMultiplier(points: number, level: Level, rules: LevelRules): number {
  const bps = level === "none" ? 10_000 : rules.multiplierBps[level];
  return Math.floor((points * bps) / 10_000);
}
