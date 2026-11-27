import { businessSchema, type BusinessConfig } from "./schema.ts";

/**
 * ✏️ Business rules: prices, commissions and time windows. Money is integer
 * poisha (৳1 = 100). Change here, not in code. See jotno-plan.md → Business model.
 */
/** Minutes a vet has to answer a paid chat or quick help before the owner gets their money back. */
const REPLY_MINUTES = 60;

const business: BusinessConfig = {
  consult: {
    // Launch offer: 10% for the first months to bring vets in (plan: 15–20% later).
    commissionBps: 1_000,
    openHours: 24,
    replyWindowMinutes: REPLY_MINUTES,
    intakePhotos: 3,
    minFee: 10_000,
    maxFee: 300_000,
    call: { enabled: true, ringSeconds: 45, staleSeconds: 90, replySeconds: 30 },
  },
  appointment: { bookingFee: 5_000, daysAhead: 14, leadMinutes: 60, reminderHours: 3 },
  payout: { minimum: 50_000, weekday: 2 },
  featured: {
    packs: [
      { days: 7, price: 30_000 },
      { days: 30, price: 100_000 },
    ],
    maxPerDistrict: 3,
  },
  shop: {
    deliveryInside: 6_000,
    deliveryOutside: 12_000,
    freeDeliveryFrom: 200_000,
    homeDistrictId: 47,
    galleryMax: 5,
    deliveryDays: { inside: { min: 1, max: 3 }, outside: { min: 2, max: 5 } },
    returnDays: 3,
  },
  // ৳99 quick help: the vet gets ৳70, Jotno ৳29. No answer in time: free retry or money back.
  quick: {
    enabled: true,
    fee: 9_900,
    vetShare: 7_000,
    answerMinutes: REPLY_MINUTES,
    openMinutes: 120,
    ownerMessages: 6,
    photos: 3,
  },
  referral: {
    signupPoints: 5,
    firstPaidPoints: 25,
    welcomePoints: 20,
    signupMonthlyCap: 10,
    pointsExpireDays: 180,
    orderSpendBps: 500,
    commissionSpendBps: 5_000,
    vetOwnClientBps: 500,
    vetOwnClientLevel: "star",
    levels: { star: 3, gold: 10, platinum: 25 },
    multiplierBps: { star: 10_000, gold: 15_000, platinum: 20_000 },
    goldFeaturedDays: 7,
    watchPerDay: 5,
  },
  availableHours: 6,
  emergencyHotline: undefined,
};

export const businessConfig = businessSchema.parse(business);
