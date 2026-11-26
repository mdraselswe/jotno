/**
 * A vet's display name with the "Dr." title, unless the name already carries
 * one anywhere a person would type it: "Dr", "Dr.", "Dr " or the Bangla
 * "ডা." / "ডাঃ" / "ডাক্তার" (also after a label such as "QA: Dr. …").
 */
const HAS_TITLE = /(^|[\s:,(])(dr\b\.?|ডা[.ঃ:]|ডাক্তার)/iu;

export function withDoctorTitle(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return clean;
  return HAS_TITLE.test(clean) ? clean : `Dr. ${clean}`;
}
