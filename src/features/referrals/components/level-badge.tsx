import { Crown, Gem, Star } from "lucide-react";
import { StatusBadge, type BadgeTone } from "@/components/layout/app-ui";
import type { Translate } from "@/i18n";
import type { Level } from "../levels";

const LOOK = {
  star: { icon: Star, tone: "info" },
  gold: { icon: Crown, tone: "warning" },
  platinum: { icon: Gem, tone: "primary" },
} as const satisfies Record<Exclude<Level, "none">, { icon: typeof Star; tone: BadgeTone }>;

/** The invite level pill: ⭐ Star, 👑 Gold, 💎 Platinum (nothing below Star). */
export function LevelBadge({ level, t, className }: { level: Level; t: Translate; className?: string }) {
  if (level === "none") return null;
  const { icon: Icon, tone } = LOOK[level];
  return (
    <StatusBadge tone={tone} className={className}>
      <Icon aria-hidden="true" className="size-3.5" />
      {t(`grow.level.${level}` as const)}
    </StatusBadge>
  );
}
