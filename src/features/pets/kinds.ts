import { Pill, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
import type { HealthKind } from "@/features/health";

/** Label key and icon per health record kind (shared by the form and the timeline). */
export const HEALTH_KINDS: Record<
  HealthKind,
  { label: "health.vaccine" | "health.deworm" | "health.checkup"; icon: LucideIcon }
> = {
  vaccine: { label: "health.vaccine", icon: Syringe },
  deworm: { label: "health.deworm", icon: Pill },
  checkup: { label: "health.checkup", icon: Stethoscope },
};

export const SEX_KEYS = {
  female: "pets.sexFemale",
  male: "pets.sexMale",
  unknown: "pets.sexUnknown",
} as const;

/** Status pill per due state (StatusBadge tone + label key); "none" shows no pill. */
export const DUE_BADGE = {
  due: { tone: "danger", label: "health.due" },
  soon: { tone: "warning", label: "health.soon" },
  ok: { tone: "success", label: "health.ok" },
} as const;
