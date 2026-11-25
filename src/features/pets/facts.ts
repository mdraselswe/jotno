import type { Formatter, Translate } from "@/i18n";
import { petAge } from "./age";

/** "3 yrs" / "8 months" in the page language, or null without a birthday. */
export function ageLabel(t: Translate, fmt: Formatter, birthDate: string | null, today: string) {
  const age = petAge(birthDate, today);
  if (!age) return null;
  return t(age.unit === "years" ? "pets.age" : "pets.ageMonths", { n: fmt.number(age.n) });
}

/** "12.5 kg" in the page language, or null. */
export function weightLabel(t: Translate, fmt: Formatter, weightGrams: number | null) {
  return weightGrams == null
    ? null
    : t("ownerui.pet.kg", { n: fmt.number(weightGrams / 1000, { maximumFractionDigits: 1 }) });
}
