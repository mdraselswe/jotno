import { dueState, type DueState } from "@/features/health";

interface CareRow {
  kind: string;
  title: string;
  dueOn: string | null;
  givenOn?: string | null;
  petId?: string;
}

/** One vaccine/deworming/check-up line: the same pet, kind and name. */
export const careKey = (r: CareRow) => `${r.petId ?? ""}|${r.kind}|${r.title.trim().toLowerCase()}`;

const newer = (a: CareRow, b: CareRow) =>
  (a.givenOn ?? "") !== (b.givenOn ?? "")
    ? (a.givenOn ?? "") > (b.givenOn ?? "")
    : (a.dueOn ?? "") > (b.dueOn ?? "");

/**
 * Keeps only the newest record of each line (latest given date, then latest
 * due date), so last year's rabies shot doesn't show as "due" once this
 * year's is recorded. Order of the result follows the input.
 */
export function currentCare<T extends CareRow>(rows: readonly T[]): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const key = careKey(r);
    const seen = best.get(key);
    if (!seen || newer(r, seen)) best.set(key, r);
  }
  const keep = new Set(best.values());
  return rows.filter((r) => keep.has(r));
}

const RANK: Record<DueState, number> = { none: 0, ok: 1, soon: 2, due: 3 };

/** The most urgent state among a pet's current records ("none" when there are none). */
export function worstState(rows: readonly CareRow[], today: string, soonDays = 14): DueState {
  let worst: DueState = "none";
  for (const r of currentCare(rows)) {
    const s = dueState(r.dueOn, today, soonDays);
    if (RANK[s] > RANK[worst]) worst = s;
  }
  return worst;
}
