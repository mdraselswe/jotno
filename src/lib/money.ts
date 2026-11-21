import type { Formatter } from "@/i18n";

/** Integer poisha → "৳300" (whole taka unless there are poisha). */
export function taka(fmt: Formatter, poisha: number): string {
  const whole = poisha % 100 === 0;
  return fmt.money(poisha / 100, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/** "300" or "300.50" taka (form input) → poisha, or null when not a number. */
export function toPoisha(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[,৳\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
