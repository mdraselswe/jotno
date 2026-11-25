import { z } from "zod";

/**
 * Business settings the team changes from /admin/settings without a deploy:
 * the bKash and Nagad numbers people send money to, the charge they add,
 * cash on delivery, delivery fees and the support number. Money is poisha.
 */
export const WALLETS = ["bkash", "nagad"] as const;
export type Wallet = (typeof WALLETS)[number];
export type PayMethod = Wallet | "cod";

const phone = z
  .string()
  .trim()
  .regex(/^(?:01[3-9]\d{8})?$/);

export const walletSchema = z.object({
  enabled: z.boolean(),
  /** 01XXXXXXXXX; empty while not set up (the method then stays hidden). */
  number: phone,
  accountType: z.enum(["personal", "agent", "merchant"]),
  /** Charge the payer adds so the full amount arrives, in basis points (185 = 1.85%). */
  feeBps: z.number().int().min(0).max(1_000),
  /** Flat charge on top (poisha). */
  feeFlat: z.number().int().min(0).max(10_000),
});
export type WalletSettings = z.infer<typeof walletSchema>;

export const settingsSchema = z.object({
  bkash: walletSchema,
  nagad: walletSchema,
  cod: z.object({
    enabled: z.boolean(),
    /** Largest order total allowed on cash on delivery (poisha); 0 = no limit. */
    maxOrder: z.number().int().min(0).max(100_000_000),
  }),
  delivery: z.object({
    inside: z.number().int().min(0).max(1_000_000),
    outside: z.number().int().min(0).max(1_000_000),
    /** Free delivery from this subtotal (0 = never). */
    freeFrom: z.number().int().min(0).max(100_000_000),
  }),
  /** Shown on the pay page and invoices. */
  supportPhone: phone,
  /** When payments are checked, e.g. "9am–11pm, every day". */
  reviewHours: z.string().trim().max(80),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  // No extra charge for now (Jotno absorbs it); the team can add one in /admin/settings.
  bkash: { enabled: true, number: "", accountType: "personal", feeBps: 0, feeFlat: 0 },
  nagad: { enabled: true, number: "", accountType: "personal", feeBps: 0, feeFlat: 0 },
  cod: { enabled: true, maxOrder: 1_000_000 },
  delivery: { inside: 6_000, outside: 12_000, freeFrom: 200_000 },
  supportPhone: "",
  reviewHours: "9am–11pm",
};

/** Stored JSON merged over the defaults, so a new field never breaks an old row. */
export function readSettings(stored: unknown): Settings {
  const value = typeof stored === "object" && stored !== null ? (stored as Partial<Settings>) : {};
  const merged = {
    ...DEFAULT_SETTINGS,
    ...value,
    bkash: { ...DEFAULT_SETTINGS.bkash, ...value.bkash },
    nagad: { ...DEFAULT_SETTINGS.nagad, ...value.nagad },
    cod: { ...DEFAULT_SETTINGS.cod, ...value.cod },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...value.delivery },
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/** A wallet can take payments when it's switched on and has a number. */
export const walletReady = (w: WalletSettings) => w.enabled && w.number.length === 11;

/** The charge on top of `amount`, rounded up to whole taka. */
export function walletFee(amount: number, w: Pick<WalletSettings, "feeBps" | "feeFlat">): number {
  const raw = Math.ceil((amount * w.feeBps) / 10_000) + w.feeFlat;
  return Math.ceil(raw / 100) * 100;
}

/** Cash on delivery is on and this order total is within its limit (0 = no limit). */
export function codAllowed(cod: Settings["cod"], amount: number): boolean {
  return cod.enabled && (cod.maxOrder === 0 || amount <= cod.maxOrder);
}

/** Which methods this payment can use. Cash on delivery is for shop orders only. */
export function availableMethods(
  settings: Settings,
  purpose: "consult" | "appointment" | "featured" | "order" | "quick",
  amount: number,
): PayMethod[] {
  const out: PayMethod[] = WALLETS.filter((w) => walletReady(settings[w]));
  if (purpose === "order" && codAllowed(settings.cod, amount)) out.push("cod");
  return out;
}

/** bKash/Nagad transaction ids are 8–12 letters and digits. */
export const trxIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8,12}$/);
