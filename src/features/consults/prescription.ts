import { z } from "zod";

/**
 * A vet's prescription for one consult, as plain data and rules. The vet can
 * write it while the chat is open and up to a day after it ends.
 */
export const RX_MAX_ITEMS = 15;
export const RX_EDIT_HOURS_AFTER_CLOSE = 24;

const line = (max: number) => z.string().trim().max(max);

export const rxItemSchema = z.object({
  name: line(120).min(2),
  dose: line(80).min(1),
  frequency: line(120).min(1),
  days: z.number().int().min(1).max(365).nullable(),
  note: line(200).optional(),
  productId: z.uuid().nullable().optional(),
});

export const rxSchema = z.object({
  diagnosis: line(1000).min(3),
  items: z.array(rxItemSchema).max(RX_MAX_ITEMS),
  advice: line(2000).optional(),
  followUpDays: z.number().int().min(1).max(180).nullable(),
});

export type RxInput = z.input<typeof rxSchema>;
export type Rx = z.output<typeof rxSchema>;
export type RxItemInput = z.input<typeof rxItemSchema>;

/** A blank medicine row for the form. */
export const emptyRxItem = (): RxItemInput => ({
  name: "",
  dose: "",
  frequency: "",
  days: null,
  note: "",
  productId: null,
});

/**
 * Drops rows the vet left completely empty, so an untouched extra row doesn't
 * block saving; half-filled rows still fail validation.
 */
export function withoutBlankRows(items: RxItemInput[]): RxItemInput[] {
  return items.filter(
    (i) => [i.name, i.dose, i.frequency, i.note ?? ""].some((v) => v.trim() !== "") || i.days !== null,
  );
}

/** The vet may write or change the prescription now. */
export function canWriteRx(
  c: { status: string; closedAt: Date | null; firstReplyAt: Date | null },
  now: Date,
): boolean {
  if (c.status === "active") return true;
  if (c.status !== "closed" || !c.closedAt || !c.firstReplyAt) return false;
  return now.getTime() - c.closedAt.getTime() <= RX_EDIT_HOURS_AFTER_CLOSE * 3_600_000;
}

/** The date to check again, from the prescription date and follow-up days (UTC day string). */
export function followUpDay(writtenAt: Date, days: number | null): string | null {
  if (!days) return null;
  return new Date(writtenAt.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}
