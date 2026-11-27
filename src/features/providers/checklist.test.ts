import { describe, expect, it } from "vitest";
import { missingDocs, readyForReview, vetChecklist, type ChecklistInput } from "./checklist";

const EMPTY: ChecklistInput = {
  photoPath: null,
  registrationNo: null,
  nameNidBn: null,
  areaId: null,
  speciesCount: 0,
  documentKinds: [],
  bio: null,
  qualifications: null,
  experienceYears: null,
  clinicName: null,
  address: null,
  lat: null,
  phonePublic: null,
  hasHours: false,
};

describe("vetChecklist", () => {
  it("marks everything missing on an empty profile", () => {
    const items = vetChecklist(EMPTY);
    expect(items.every((i) => !i.done)).toBe(true);
    expect(readyForReview(items)).toBe(false);
  });

  it("is ready for review once the required items are there", () => {
    const items = vetChecklist({
      ...EMPTY,
      photoPath: "vet/1.jpg",
      registrationNo: " 1234 ",
      nameNidBn: "মোঃ রহিম",
      areaId: 7,
      speciesCount: 2,
      documentKinds: ["nid", "bvc_certificate"],
    });
    expect(readyForReview(items)).toBe(true);
    expect(items.filter((i) => !i.done).every((i) => !i.required)).toBe(true);
  });

  it("needs more than a few words of bio and ignores blank text", () => {
    const short = vetChecklist({ ...EMPTY, bio: "Hello", registrationNo: "   " });
    expect(short.find((i) => i.key === "bio")?.done).toBe(false);
    expect(short.find((i) => i.key === "bvc")?.done).toBe(false);
    const long = vetChecklist({ ...EMPTY, bio: "x".repeat(41), experienceYears: 0 });
    expect(long.find((i) => i.key === "bio")?.done).toBe(true);
    expect(long.find((i) => i.key === "experience")?.done).toBe(true);
  });
});

describe("required documents", () => {
  const ready: ChecklistInput = {
    ...EMPTY,
    photoPath: "vet/1.jpg",
    registrationNo: "1234",
    nameNidBn: "মোঃ রহিম",
    areaId: 7,
    speciesCount: 1,
  };

  it("needs both the BVC certificate and the NID, not just any document", () => {
    expect(readyForReview(vetChecklist({ ...ready, documentKinds: ["degree", "other"] }))).toBe(false);
    expect(readyForReview(vetChecklist({ ...ready, documentKinds: ["bvc_certificate"] }))).toBe(false);
    expect(readyForReview(vetChecklist({ ...ready, documentKinds: ["nid"] }))).toBe(false);
    expect(
      readyForReview(vetChecklist({ ...ready, documentKinds: ["nid", "degree", "bvc_certificate"] })),
    ).toBe(true);
  });

  it("lists what is missing", () => {
    expect(missingDocs([])).toEqual(["bvc_certificate", "nid"]);
    expect(missingDocs(["nid", "nid"])).toEqual(["bvc_certificate"]);
    expect(missingDocs(["bvc_certificate", "nid"])).toEqual([]);
  });
});
