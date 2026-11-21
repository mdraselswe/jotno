import { z } from "zod";

/** Bangladeshi mobile number → "01XXXXXXXXX" (accepts +880, spaces, dashes, Bangla digits). */
export function normalizePhone(input: string): string {
  const latin = input.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

export const isBdMobile = (value: string) => /^01[3-9]\d{8}$/.test(normalizePhone(value));

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^01[3-9]\d{8}$/.test(v), "phone");
