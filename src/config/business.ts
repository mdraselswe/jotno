import { businessSchema, type BusinessConfig } from "./schema.ts";

/**
 * ✏️ Business rules: prices, commissions and time windows. Money is integer
 * poisha (৳1 = 100). Change here, not in code. See jotno-plan.md → Business model.
 */
const business: BusinessConfig = {
  consult: {
    // Launch offer: 10% for the first months to bring vets in (plan: 15–20% later).
    commissionBps: 1_000,
    openHours: 24,
    replyWindowMinutes: 30,
    minFee: 10_000,
    maxFee: 300_000,
  },
  appointment: { bookingFee: 5_000, daysAhead: 14, leadMinutes: 60 },
  payout: { minimum: 50_000, weekday: 2 },
  featured: {
    packs: [
      { days: 7, price: 30_000 },
      { days: 30, price: 100_000 },
    ],
    maxPerDistrict: 3,
  },
  shop: { deliveryInside: 6_000, deliveryOutside: 12_000, freeDeliveryFrom: 200_000, homeDistrictId: 47 },
  availableHours: 6,
  emergencyHotline: undefined,
};

export const businessConfig = businessSchema.parse(business);
