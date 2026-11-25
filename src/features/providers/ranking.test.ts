import { describe, expect, it } from "vitest";
import { bayesianRating, completeness, haversineKm, rankScore, type RankInput } from "./ranking";

const now = new Date("2026-12-01T10:00:00Z");
const base: RankInput = {
  ratingSum: 0,
  ratingCount: 0,
  completeness: 80,
  availableNow: false,
  emergency24x7: false,
  consultCount: 0,
  distanceKm: null,
  sameArea: false,
  speciesMatch: false,
  lastSeenAt: null,
};

describe("ranking", () => {
  it("many good reviews beat one perfect review", () => {
    expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(4.8 * 40, 40));
    const one = rankScore({ ...base, ratingSum: 5, ratingCount: 1 }, now);
    const many = rankScore({ ...base, ratingSum: 192, ratingCount: 40 }, now);
    expect(many).toBeGreaterThan(one);
  });

  it("top promoters get a small earned boost", () => {
    expect(rankScore({ ...base, topPromoter: true }, now) - rankScore(base, now)).toBe(6);
  });

  it("nearby and same-area vets rank higher", () => {
    const far = rankScore({ ...base, distanceKm: 15 }, now);
    const near = rankScore({ ...base, distanceKm: 1, sameArea: true }, now);
    expect(near).toBeGreaterThan(far);
  });

  it("in an emergency, available-now and 24/7 matter most", () => {
    const rated = { ...base, ratingSum: 245, ratingCount: 50, consultCount: 200 };
    const available = { ...base, availableNow: true, emergency24x7: true };
    expect(rankScore(available, now, true)).toBeGreaterThan(rankScore(rated, now, true));
    expect(rankScore(rated, now, false)).toBeGreaterThan(rankScore(available, now, false));
  });
});

describe("completeness", () => {
  it("scores 100 for a full profile and lists what is missing", () => {
    const full = {
      photoPath: "a.jpg",
      bio: "I have treated cats and dogs in Mirpur for ten years and love it.",
      qualifications: "DVM",
      registrationNo: "BVC-1234",
      experienceYears: 10,
      clinicName: "Paws",
      address: "Road 1",
      areaId: 1,
      hasLocation: true,
      phonePublic: "017",
      speciesCount: 2,
      hasAvailability: true,
    };
    expect(completeness(full)).toEqual({ score: 100, missing: [] });
    const partial = completeness({ ...full, photoPath: null, bio: "short", speciesCount: 0 });
    expect(partial.score).toBe(65);
    expect(partial.missing).toEqual(["photoPath", "bio", "speciesCount"]);
  });
});

describe("haversineKm", () => {
  it("Mirpur to Dhanmondi is about 8 km", () => {
    const km = haversineKm({ lat: 23.8223, lon: 90.3654 }, { lat: 23.7461, lon: 90.3742 });
    expect(km).toBeGreaterThan(7.5);
    expect(km).toBeLessThan(9);
  });
});
