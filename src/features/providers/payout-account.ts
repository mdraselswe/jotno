import { z } from "zod";
import { phoneSchema } from "@/features/auth/phone";

/**
 * Where a vet wants their earnings sent: a bKash or Nagad number, or a bank
 * account. Private: only the vet and admins see it (never a public page).
 */
export const PAYOUT_METHODS = ["bkash", "nagad", "bank"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

/** Bangla digits → Latin, spaces and dashes out ("১২৩-৪৫ ৬" → "123456"). */
const digitsOnly = (v: string) =>
  v.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)).replace(/[\s-]/g, "");

const text = z.string().trim().min(2).max(80);

export const payoutAccountSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("bkash"), number: phoneSchema }),
  z.object({ method: z.literal("nagad"), number: phoneSchema }),
  z.object({
    method: z.literal("bank"),
    bankName: text,
    accountName: text,
    accountNumber: z
      .string()
      .transform(digitsOnly)
      .refine((v) => /^\d{6,20}$/.test(v), "accountNumber"),
    branch: text,
  }),
]);
export type PayoutAccount = z.output<typeof payoutAccountSchema>;
export type PayoutAccountInput = z.input<typeof payoutAccountSchema>;

/** A stored value → the account, or null when missing or not valid any more. */
export function readPayoutAccount(stored: unknown): PayoutAccount | null {
  const parsed = payoutAccountSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

/** The account on one line, for copying: "01712345678" or "Bank · Name · 123… · Branch". */
export function payoutAccountLine(a: PayoutAccount): string {
  return a.method === "bank" ? [a.bankName, a.accountName, a.accountNumber, a.branch].join(" · ") : a.number;
}
