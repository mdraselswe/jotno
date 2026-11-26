import type { BadgeTone } from "@/components/layout/app-ui";
import { compareNames } from "@/lib/bangla-name";
import { bvcKey } from "@/lib/bvc";

/**
 * How a vet's profile compares with the BVC register (bvc_register):
 * - noNumber: the vet gave no BVC number
 * - notFound: the number is not in any list we imported
 * - unreadable: it is, but the PDF's text for the name can't be read (check the page)
 * - noNidName: it is, but the vet gave no name as on their NID to compare
 * - same / close / different: the NID name against the register name
 * A hint for the admin, never a decision: the list is public.
 */
export type RegisterStatus =
  "noNumber" | "notFound" | "unreadable" | "noNidName" | "same" | "close" | "different";

export const REGISTER_STATUSES = [
  "noNumber",
  "notFound",
  "unreadable",
  "noNidName",
  "same",
  "close",
  "different",
] as const satisfies readonly RegisterStatus[];

export function registerStatus(
  vet: { registrationNo: string | null; nameNidBn: string | null },
  row: { nameBn: string | null } | null | undefined,
): RegisterStatus {
  if (!bvcKey(vet.registrationNo)) return "noNumber";
  if (!row) return "notFound";
  if (!row.nameBn) return "unreadable";
  if (!vet.nameNidBn?.trim()) return "noNidName";
  return compareNames(vet.nameNidBn, row.nameBn);
}

export function registerTone(status: RegisterStatus): BadgeTone {
  switch (status) {
    case "same":
      return "success";
    case "close":
    case "unreadable":
    case "noNidName":
      return "warning";
    case "notFound":
    case "different":
      return "danger";
    default:
      return "neutral";
  }
}

/** Divisions as the voter list heads its pages (what an admin picks when adding a row). */
export const BVC_DIVISIONS = [
  "ঢাকা বিভাগ",
  "চট্টগ্রাম বিভাগ",
  "রাজশাহী বিভাগ",
  "খুলনা বিভাগ",
  "বরিশাল বিভাগ",
  "সিলেট বিভাগ",
  "রংপুর বিভাগ",
  "ময়মনসিংহ বিভাগ",
  "বিদেশী ভেটেরিনারিয়ান",
] as const;

/** Filters on the admin vets list: not in the register, or in it with a name to check. */
export const REGISTER_FILTERS = ["missing", "check"] as const;
export type RegisterFilter = (typeof REGISTER_FILTERS)[number];
