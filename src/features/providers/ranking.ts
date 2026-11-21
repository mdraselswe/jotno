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

/** Bayesian average: few reviews pull toward the platform mean, so 1×5★ doesn't beat 40×4.8★. */
export function bayesianRating(sum: number, count: number, prior = 4.2, weight = 5): number {
  return (sum + prior * weight) / (count + weight);
}

export function rankScore(p: RankInput, now: Date, emergency = false): number {
  let score = 0;
  score += (bayesianRating(p.ratingSum, p.ratingCount) / 5) * 40; // up to 40
  score += (Math.min(p.completeness, 100) / 100) * 15; // up to 15
  score += Math.min(Math.log10(1 + p.consultCount) * 5, 10); // up to 10
  if (p.sameArea) score += 12;
  if (p.distanceKm !== null) score += Math.max(0, 12 - p.distanceKm * 1.5); // close is better, 0 after 8 km
  if (p.speciesMatch) score += 6;
  if (p.availableNow) score += emergency ? 30 : 8;
  if (emergency && p.emergency24x7) score += 15;
  if (p.lastSeenAt) {
    const days = (now.getTime() - p.lastSeenAt.getTime()) / 86_400_000;
    score += days < 1 ? 5 : days < 7 ? 3 : days < 30 ? 1 : 0;
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
