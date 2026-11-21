/** Age from a birthday, both "YYYY-MM-DD": whole years, or months under a year. */
export function petAge(
  birthDate: string | null,
  today: string,
): { unit: "years" | "months"; n: number } | null {
  if (!birthDate || birthDate > today) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  months = Math.max(0, months);
  return months >= 12 ? { unit: "years", n: Math.floor(months / 12) } : { unit: "months", n: months };
}
