import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { business } from "@/config";
import { publicEnv } from "@/config/env";
import { quickRequestPath, ROUTES } from "@/config/routes";
import { levelFor, type Level } from "@/features/referrals";
import { notify } from "@/features/notifications/server";
import { translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { storage } from "@/infrastructure/storage";
import { dhakaMinute } from "@/lib/dhaka";
import { localeHref } from "@/lib/locale-href";

const Q = schema.quickRequests;
const V = schema.providers;

/** On duty now, as SQL (mirrors `onDuty` in ../rules.ts). */
function onDutySql(now: Date) {
  const m = dhakaMinute(now);
  return sql<boolean>`(
    (${V.availableNow} and (${V.availableUntil} is null or ${V.availableUntil} > now()))
    or (${V.dutyStart} is not null and ${V.dutyEnd} is not null and (
      case
        when ${V.dutyStart} = ${V.dutyEnd} then true
        when ${V.dutyStart} < ${V.dutyEnd} then ${m} >= ${V.dutyStart} and ${m} < ${V.dutyEnd}
        else ${m} >= ${V.dutyStart} or ${m} < ${V.dutyEnd}
      end))
  )`;
}

/** Verified vets who can take quick help right now (demo vets only on the demo site). */
function dutyWhere(now: Date) {
  return and(
    eq(V.status, "verified"),
    publicEnv.NEXT_PUBLIC_DEMO ? undefined : eq(V.isDemo, false),
    onDutySql(now),
  );
}

export async function onDutyCount(): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(V)
    .where(dutyWhere(new Date()));
  return Number(row?.n ?? 0);
}

/**
 * Payment arrived (or a credit was used): the question opens and every vet on
 * duty gets a push. Idempotent.
 */
export async function openQuick(requestId: string, paymentId: string, locale: string): Promise<void> {
  const [r] = await db()
    .update(Q)
    .set({ status: "open", openedAt: new Date(), paymentId })
    .where(and(eq(Q.id, requestId), inArray(Q.status, ["pending_payment"])))
    .returning();
  if (!r) return;
  await announce(r.id, r.ownerId, r.summary, locale);
}

async function announce(requestId: string, ownerId: string, summary: string, ownerLocale: string) {
  const vets = await db()
    .select({ profileId: V.profileId, locale: schema.profiles.locale })
    .from(V)
    .innerJoin(schema.profiles, eq(schema.profiles.id, V.profileId))
    .where(and(dutyWhere(new Date()), ne(V.profileId, ownerId)))
    .limit(200);
  const earn = business.quick.vetShare / 100;
  await Promise.all(
    vets.map((v) => {
      const t = translator(v.locale);
      return notify(v.profileId, "quick.new", {
        title: t("quick.pushNewTitle", { amount: earn }),
        body: summary.slice(0, 120),
        url: localeHref(v.locale, ROUTES.vetQuick),
        tag: `quick-${requestId}`,
      });
    }),
  );
  const t = translator(ownerLocale);
  await notify(ownerId, "quick.opened", {
    title: t("quick.pushOpenedTitle"),
    body: t("quick.pushOpenedBody", { n: business.quick.answerMinutes }),
    url: localeHref(ownerLocale, quickRequestPath(requestId)),
    tag: `quick-${requestId}`,
  });
}

/** Opens a request funded by an earlier credit (no new payment). */
export async function openWithCredit(requestId: string, locale: string): Promise<void> {
  const [r] = await db().select().from(Q).where(eq(Q.id, requestId)).limit(1);
  if (!r || r.status !== "open") return;
  await announce(r.id, r.ownerId, r.summary, locale);
}

export interface PoolItem {
  id: string;
  summary: string;
  speciesId: number | null;
  petName: string | null;
  petBirthDate: string | null;
  openedAt: Date;
  photoUrls: string[];
  /** The owner's invite level: higher levels are shown first. */
  ownerLevel: Level;
}

/** Open quick-help questions for a vet to answer (oldest first, top inviters first). */
export async function openPool(vetProfileId: string): Promise<PoolItem[]> {
  const rows = await db()
    .select({
      id: Q.id,
      summary: Q.summary,
      speciesId: sql<number | null>`coalesce(${Q.speciesId}, ${schema.patients.speciesId})`,
      petName: schema.patients.name,
      petBirthDate: schema.patients.birthDate,
      openedAt: Q.openedAt,
      photos: Q.photos,
      ownerPaid: sql<number>`(select count(*) from referrals r where r.referrer_id = ${Q.ownerId} and r.status = 'ok' and r.first_paid_at is not null)::int`,
    })
    .from(Q)
    .leftJoin(schema.patients, eq(schema.patients.id, Q.patientId))
    .where(and(eq(Q.status, "open"), ne(Q.ownerId, vetProfileId)))
    .orderBy(asc(Q.openedAt))
    .limit(30);
  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      summary: r.summary,
      speciesId: r.speciesId,
      petName: r.petName,
      petBirthDate: r.petBirthDate,
      openedAt: r.openedAt ?? new Date(),
      photoUrls: await Promise.all(r.photos.map((p) => storage.signedUrl(p, 1800))),
      ownerLevel: levelFor(Number(r.ownerPaid), business.referral),
    })),
  );
  const rank = (l: Level) => ["none", "star", "gold", "platinum"].indexOf(l);
  // Gold and platinum inviters go first (a thank-you that costs nothing); otherwise oldest first.
  return items.sort((a, b) => {
    const boost = Number(rank(b.ownerLevel) >= 2) - Number(rank(a.ownerLevel) >= 2);
    return boost || a.openedAt.getTime() - b.openedAt.getTime();
  });
}

export type QuickRequestRow = typeof Q.$inferSelect;

/** One of the owner's quick-help requests (or null). */
export async function ownQuickRequest(id: string, ownerId: string): Promise<QuickRequestRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [r] = await db()
    .select()
    .from(Q)
    .where(and(eq(Q.id, id), eq(Q.ownerId, ownerId)))
    .limit(1);
  return r ?? null;
}

/** The owner's unused credit (a quick help nobody answered), oldest first. */
export async function unusedCredit(ownerId: string): Promise<QuickRequestRow | null> {
  const [r] = await db()
    .select()
    .from(Q)
    .where(and(eq(Q.ownerId, ownerId), eq(Q.status, "credited")))
    .orderBy(asc(Q.createdAt))
    .limit(1);
  return r ?? null;
}

/** The owner's recent quick-help requests (account page). */
export async function myQuickRequests(ownerId: string, limit = 10): Promise<QuickRequestRow[]> {
  return db()
    .select()
    .from(Q)
    .where(and(eq(Q.ownerId, ownerId), ne(Q.status, "cancelled"), ne(Q.status, "pending_payment")))
    .orderBy(desc(Q.createdAt))
    .limit(limit);
}

/** The vet's duty hours (minutes from midnight Dhaka) and "available now". */
export async function vetDuty(profileId: string) {
  const [v] = await db()
    .select({
      id: V.id,
      status: V.status,
      dutyStart: V.dutyStart,
      dutyEnd: V.dutyEnd,
      availableNow: V.availableNow,
      availableUntil: V.availableUntil,
    })
    .from(V)
    .where(eq(V.profileId, profileId))
    .limit(1);
  return v ?? null;
}
