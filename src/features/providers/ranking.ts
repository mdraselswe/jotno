/**
 * Vet search ranking and profile completeness, as plain functions.
 *
 * Organic order is earned: good reviews (with enough of them), a complete
 * profile, being available now, being close, recently active. Paid/featured
 * slots are shown separately on top with a "Sponsored" label; they never
 * change the organic score.
 */
export interface RankInput {
  ratingSum: number;
  ratingCount: number;
  completeness: number;
  availableNow: boolean;
  emergency24x7: boolean;
  consultCount: number;
  /** Kilometres from the searcher, when known. */
  distanceKm: number | null;
  /** Same area (thana/upazila) as the search. */
  sameArea: boolean;
  /** Treats the searched species. */
  speciesMatch: boolean;
  lastSeenAt: Date | null;
}

/**
 * The points behind `rankScore`. The vet search computes the same score in SQL
 * (server/queries.ts → `rankScoreSql`) from these numbers, so the two agree.
 */
export const RANK = {
  /** Platform mean rating and how many "virtual reviews" it counts as. */
  priorRating: 4.2,
  priorWeight: 5,
  ratingPoints: 40,
  completenessPoints: 15,
  /** log10(1 + consults) × this, capped at `consultMax`. */
  consultFactor: 5,
  consultMax: 10,
  sameArea: 12,
  /** Up to `nearMax` points, minus `nearPerKm` per km (0 after 8 km). */
  nearMax: 12,
  nearPerKm: 1.5,
  speciesMatch: 6,
  available: 8,
  availableEmergency: 30,
  emergency24x7: 15,
  /** Seen within [days, points], first match wins. */
  seen: [
    [1, 5],
    [7, 3],
    [30, 1],
  ],
} as const;

/** Bayesian average: few reviews pull toward the platform mean, so 1×5★ doesn't beat 40×4.8★. */
export function bayesianRating(
  sum: number,
  count: number,
  prior = RANK.priorRating,
  weight = RANK.priorWeight,
): number {
  return (sum + prior * weight) / (count + weight);
}

export function rankScore(p: RankInput, now: Date, emergency = false): number {
  let score = 0;
  score += (bayesianRating(p.ratingSum, p.ratingCount) / 5) * RANK.ratingPoints;
  score += (Math.min(p.completeness, 100) / 100) * RANK.completenessPoints;
  score += Math.min(Math.log10(1 + p.consultCount) * RANK.consultFactor, RANK.consultMax);
  if (p.sameArea) score += RANK.sameArea;
  if (p.distanceKm !== null) score += Math.max(0, RANK.nearMax - p.distanceKm * RANK.nearPerKm);
  if (p.speciesMatch) score += RANK.speciesMatch;
  if (p.availableNow) score += emergency ? RANK.availableEmergency : RANK.available;
  if (emergency && p.emergency24x7) score += RANK.emergency24x7;
  if (p.lastSeenAt) {
    const days = (now.getTime() - p.lastSeenAt.getTime()) / 86_400_000;
    score += RANK.seen.find(([within]) => days < within)?.[1] ?? 0;
  }
  return Math.round(score * 100) / 100;
}

export interface CompletenessInput {
  photoPath: string | null;
  bio: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  experienceYears: number | null;
  clinicName: string | null;
  address: string | null;
  areaId: number | null;
  hasLocation: boolean;
  phonePublic: string | null;
  speciesCount: number;
  hasAvailability: boolean;
}

const WEIGHTS: Record<keyof CompletenessInput, number> = {
  photoPath: 15,
  bio: 10,
  qualifications: 10,
  registrationNo: 15,
  experienceYears: 5,
  clinicName: 5,
  address: 5,
  areaId: 10,
  hasLocation: 5,
  phonePublic: 5,
  speciesCount: 10,
  hasAvailability: 5,
};

/** 0–100, and the fields still missing (for the "complete your profile" card). */
export function completeness(p: CompletenessInput): { score: number; missing: (keyof CompletenessInput)[] } {
  let score = 0;
  const missing: (keyof CompletenessInput)[] = [];
  for (const key of Object.keys(WEIGHTS) as (keyof CompletenessInput)[]) {
    const value = p[key];
    const done =
      typeof value === "boolean"
        ? value
        : typeof value === "number"
          ? key === "speciesCount"
            ? value > 0
            : true
          : typeof value === "string"
            ? value.trim().length > (key === "bio" ? 40 : 0)
            : false;
    if (done) score += WEIGHTS[key];
    else missing.push(key);
  }
  return { score, missing };
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
