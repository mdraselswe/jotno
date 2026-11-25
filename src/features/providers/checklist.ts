/**
 * The vet's profile checklist (dashboard and profile page), as a plain
 * function. "Required" items are the ones `submitForReview` insists on; the
 * rest mirror the completeness score in `ranking.ts`.
 */

export type ChecklistKey =
  | "photo"
  | "bvc"
  | "area"
  | "species"
  | "docs"
  | "bio"
  | "degrees"
  | "experience"
  | "clinic"
  | "address"
  | "location"
  | "phone"
  | "hours";

/** Where each item is filled in: a section of the profile form, or the schedule page. */
export type ChecklistTarget = "basics" | "creds" | "place" | "services" | "documents" | "schedule";

export interface ChecklistItem {
  key: ChecklistKey;
  done: boolean;
  required: boolean;
  target: ChecklistTarget;
}

export interface ChecklistInput {
  photoPath: string | null;
  registrationNo: string | null;
  areaId: number | null;
  speciesCount: number;
  documentCount: number;
  bio: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  clinicName: string | null;
  address: string | null;
  lat: number | null;
  phonePublic: string | null;
  hasHours: boolean;
}

const filled = (s: string | null, min = 0) => (s ?? "").trim().length > min;

export function vetChecklist(p: ChecklistInput): ChecklistItem[] {
  return [
    { key: "photo", done: Boolean(p.photoPath), required: true, target: "basics" },
    { key: "bvc", done: filled(p.registrationNo), required: true, target: "creds" },
    { key: "area", done: p.areaId != null, required: true, target: "place" },
    { key: "species", done: p.speciesCount > 0, required: true, target: "services" },
    { key: "docs", done: p.documentCount > 0, required: true, target: "documents" },
    { key: "bio", done: filled(p.bio, 40), required: false, target: "basics" },
    { key: "degrees", done: filled(p.qualifications), required: false, target: "creds" },
    { key: "experience", done: p.experienceYears != null, required: false, target: "creds" },
    { key: "clinic", done: filled(p.clinicName), required: false, target: "place" },
    { key: "address", done: filled(p.address), required: false, target: "place" },
    { key: "location", done: p.lat != null, required: false, target: "place" },
    { key: "phone", done: filled(p.phonePublic), required: false, target: "place" },
    { key: "hours", done: p.hasHours, required: false, target: "schedule" },
  ];
}

/** True when everything `submitForReview` needs is there. */
export const readyForReview = (items: ChecklistItem[]) => items.every((i) => !i.required || i.done);
