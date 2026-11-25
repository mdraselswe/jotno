import "server-only";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { business, site } from "@/config";
import { publicEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { notify } from "@/features/notifications/server";
import { commissionFor } from "@/features/payments";
import { translator } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { localeHref } from "@/lib/locale-href";
import { DEVICE_COOKIE, MY_REF_COOKIE, normalizeRef, REF_COOKIE, withRef } from "@/lib/ref";
import { atLeast, levelFor, nextLevel, withMultiplier, type Level, type RankedLevel } from "../levels";
import { addDays, maxPointsFor, pointsBalance, type PointsBalance } from "../points";
import { inviteFlag, makeCode } from "../rules";

const R = business.referral;
const P = schema.points;
const RF = schema.referrals;
const RC = schema.referralCodes;

/** The person's own invite code, made on first use. */
export async function ensureCode(userId: string, deviceId?: string | null): Promise<string> {
  const [row] = await db().select().from(RC).where(eq(RC.userId, userId)).limit(1);
  if (row) {
    if (deviceId && !row.deviceId) await db().update(RC).set({ deviceId }).where(eq(RC.userId, userId));
    return row.code;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeCode(crypto.getRandomValues(new Uint8Array(6)));
    const [made] = await db()
      .insert(RC)
      .values({ userId, code, deviceId: deviceId ?? null })
      .onConflictDoNothing()
      .returning({ code: RC.code });
    if (made) return made.code;
    // Either the code was taken (try another) or another request made this person's code.
    const [again] = await db().select({ code: RC.code }).from(RC).where(eq(RC.userId, userId)).limit(1);
    if (again) return again.code;
  }
  throw new Error("Could not make an invite code");
}

/** Lets the share button add the person's code to links (server actions only). */
export async function rememberMyCode(code: string): Promise<void> {
  (await cookies()).set(MY_REF_COOKIE, code, {
    path: "/",
    maxAge: 365 * 86_400,
    sameSite: "lax",
    secure: (publicEnv.NEXT_PUBLIC_SITE_URL ?? site.url).startsWith("https://"),
  });
}

export async function forgetMyCode(): Promise<void> {
  (await cookies()).delete(MY_REF_COOKIE);
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * At sign-up (end of onboarding): gives the new person their own code and, if
 * they came through someone's link, records the invite and its points. A
 * flagged invite (same browser, throwaway email) is kept for the admins but
 * earns nothing.
 */
export async function recordSignup(user: { id: string; email: string | null }): Promise<void> {
  const jar = await cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value ?? null;
  const mine = await ensureCode(user.id, deviceId);
  await rememberMyCode(mine);
  const code = normalizeRef(jar.get(REF_COOKIE)?.value);
  if (!code) return;
  jar.delete(REF_COOKIE);

  const [inviter] = await db().select().from(RC).where(eq(RC.code, code)).limit(1);
  if (!inviter || inviter.userId === user.id) return;
  const seen = deviceId
    ? await db().select({ id: RF.refereeId }).from(RF).where(eq(RF.deviceId, deviceId)).limit(1)
    : [];
  const flag = inviteFlag({
    email: user.email,
    deviceId,
    inviterDeviceId: inviter.deviceId,
    deviceSeenBefore: seen.length > 0,
  });
  const [made] = await db()
    .insert(RF)
    .values({
      refereeId: user.id,
      referrerId: inviter.userId,
      code,
      deviceId,
      status: flag ? "flagged" : "ok",
      flagReason: flag,
    })
    .onConflictDoNothing()
    .returning({ id: RF.refereeId });
  if (!made || flag) return;
  await awardSignup(inviter.userId, user.id);
}

/** Sign-up points (inviter, pending until the new person does something) and welcome points. */
export async function awardSignup(inviterId: string, refereeId: string): Promise<void> {
  const now = new Date();
  const expiresAt = addDays(now, R.pointsExpireDays);
  const [{ n } = { n: 0 }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(P)
    .where(and(eq(P.userId, inviterId), eq(P.kind, "signup"), gte(P.createdAt, startOfMonth(now))));
  const rows: (typeof P.$inferInsert)[] = [];
  if (R.signupPoints > 0 && Number(n) < R.signupMonthlyCap)
    rows.push({
      userId: inviterId,
      amount: R.signupPoints,
      kind: "signup",
      status: "pending",
      refType: "referral",
      refId: refereeId,
      expiresAt,
    });
  if (R.welcomePoints > 0)
    rows.push({
      userId: refereeId,
      amount: R.welcomePoints,
      kind: "welcome",
      refType: "referral",
      refId: refereeId,
      expiresAt,
    });
  if (rows.length > 0) await db().insert(P).values(rows);
  await tell(inviterId, "referral.joined", "grow.pushJoinedTitle", "grow.pushJoinedBody", R.signupPoints);
}

/** The invited person did something real (added a pet, asked a question): sign-up points unlock. */
export async function activateReferral(userId: string): Promise<void> {
  const moved = await db()
    .update(RF)
    .set({ activatedAt: new Date() })
    .where(and(eq(RF.refereeId, userId), sql`${RF.activatedAt} is null`, eq(RF.status, "ok")))
    .returning({ id: RF.refereeId });
  if (moved.length > 0) await unlockSignup(userId);
}

async function unlockSignup(refereeId: string) {
  await db()
    .update(P)
    .set({ status: "available" })
    .where(
      and(eq(P.kind, "signup"), eq(P.refType, "referral"), eq(P.refId, refereeId), eq(P.status, "pending")),
    );
}

/** The invited person paid for the first time: the inviter earns the big reward. Idempotent. */
export async function onFirstPayment(userId: string): Promise<void> {
  const now = new Date();
  const [r] = await db()
    .update(RF)
    .set({ firstPaidAt: now, activatedAt: sql`coalesce(${RF.activatedAt}, ${now})` })
    .where(and(eq(RF.refereeId, userId), sql`${RF.firstPaidAt} is null`, eq(RF.status, "ok")))
    .returning({ referrerId: RF.referrerId });
  if (!r) return;
  await unlockSignup(userId);
  const level = await levelOf(r.referrerId);
  const amount = withMultiplier(R.firstPaidPoints, level, R);
  if (amount > 0)
    await db()
      .insert(P)
      .values({
        userId: r.referrerId,
        amount,
        kind: "first_paid",
        refType: "referral",
        refId: userId,
        expiresAt: addDays(now, R.pointsExpireDays),
      });
  await tell(r.referrerId, "referral.paid", "grow.pushPaidTitle", "grow.pushPaidBody", amount);
}

async function tell(
  userId: string,
  kind: string,
  title: "grow.pushJoinedTitle" | "grow.pushPaidTitle",
  body: "grow.pushJoinedBody" | "grow.pushPaidBody",
  n: number,
) {
  const [p] = await db()
    .select({ locale: schema.profiles.locale, role: schema.profiles.role })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  const locale = p?.locale ?? site.i18n.defaultLocale;
  const t = translator(locale);
  await notify(userId, kind, {
    title: t(title),
    body: t(body, { n }),
    url: localeHref(locale, p?.role === "vet" ? ROUTES.vetPromote : ROUTES.invite),
    tag: kind,
  });
}

/** Paid invites that count for levels. */
export async function paidInvites(userId: string): Promise<number> {
  const [{ n } = { n: 0 }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(RF)
    .where(and(eq(RF.referrerId, userId), isNotNull(RF.firstPaidAt), eq(RF.status, "ok")));
  return Number(n);
}

export async function levelOf(userId: string): Promise<Level> {
  return levelFor(await paidInvites(userId), R);
}

/** Whether `ownerId` came to Jotno through `inviterId`'s link. */
export async function invitedBy(ownerId: string, inviterId: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: RF.refereeId })
    .from(RF)
    .where(and(eq(RF.refereeId, ownerId), eq(RF.referrerId, inviterId), eq(RF.status, "ok")))
    .limit(1);
  return Boolean(row);
}

/**
 * Jotno's commission on a full chat: lower when the owner is the vet's own
 * invite and the vet has reached the level for it.
 */
export async function chatCommissionBps(ownerId: string, vetProfileId: string): Promise<number> {
  const normal = business.consult.commissionBps;
  if (!(await invitedBy(ownerId, vetProfileId))) return normal;
  if (!atLeast(await levelOf(vetProfileId), R.vetOwnClientLevel)) return normal;
  return Math.min(normal, R.vetOwnClientBps);
}

// ── Points ──────────────────────────────────────────────────────────────────

/** The most points an owner may use on a full chat with this vet (shown on the start page). */
export async function chatPointsCap(ownerId: string, providerId: string, fee: number): Promise<number> {
  const [v] = await db()
    .select({ profileId: schema.providers.profileId })
    .from(schema.providers)
    .where(eq(schema.providers.id, providerId))
    .limit(1);
  if (!v) return 0;
  const commission = commissionFor(fee, await chatCommissionBps(ownerId, v.profileId));
  return maxPointsFor(commission, R.commissionSpendBps, (await pointsOf(ownerId)).available);
}

async function pointRows(userId: string) {
  return db()
    .select({ amount: P.amount, status: P.status, createdAt: P.createdAt, expiresAt: P.expiresAt })
    .from(P)
    .where(eq(P.userId, userId));
}

export async function pointsOf(userId: string): Promise<PointsBalance> {
  return pointsBalance(await pointRows(userId), new Date());
}

/**
 * Spends points on an order, chat or quick help. False when the balance is
 * too small (checked under a per-person lock, so two tabs can't overspend).
 */
export async function spendPoints(
  userId: string,
  amount: number,
  refType: "order" | "consult" | "quick",
  refId: string,
): Promise<boolean> {
  if (amount <= 0) return true;
  return db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`points:${userId}`}))`);
    const rows = await tx
      .select({ amount: P.amount, status: P.status, createdAt: P.createdAt, expiresAt: P.expiresAt })
      .from(P)
      .where(eq(P.userId, userId));
    if (pointsBalance(rows, new Date()).available < amount) return false;
    await tx.insert(P).values({ userId, amount: -amount, kind: "spend", refType, refId });
    return true;
  });
}

/** Gives back points spent on something that was cancelled or refunded. Idempotent. */
export async function givePointsBack(
  userId: string,
  refType: "order" | "consult" | "quick",
  refId: string,
): Promise<void> {
  const [row] = await db()
    .select({ net: sql<number>`coalesce(sum(${P.amount}), 0)::int` })
    .from(P)
    .where(
      and(
        eq(P.userId, userId),
        eq(P.refType, refType),
        eq(P.refId, refId),
        sql`${P.kind} in ('spend', 'refund')`,
      ),
    );
  const owed = -Number(row?.net ?? 0);
  if (owed <= 0) return;
  await db()
    .insert(P)
    .values({
      userId,
      amount: owed,
      kind: "refund",
      refType,
      refId,
      expiresAt: addDays(new Date(), R.pointsExpireDays),
    });
}

// ── Invite page ─────────────────────────────────────────────────────────────

export interface InviteSummary {
  code: string;
  joined: number;
  active: number;
  paid: number;
  level: Level;
  next: { level: RankedLevel; left: number } | null;
  points: PointsBalance;
  history: { id: number; amount: number; kind: string; status: string; createdAt: Date }[];
}

export async function inviteSummary(userId: string): Promise<InviteSummary> {
  const code = await ensureCode(userId);
  const [counts] = await db()
    .select({
      joined: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${RF.activatedAt} is not null)::int`,
      paid: sql<number>`count(*) filter (where ${RF.firstPaidAt} is not null)::int`,
    })
    .from(RF)
    .where(and(eq(RF.referrerId, userId), eq(RF.status, "ok")));
  const paid = Number(counts?.paid ?? 0);
  const [points, history] = await Promise.all([
    pointsOf(userId),
    db()
      .select({ id: P.id, amount: P.amount, kind: P.kind, status: P.status, createdAt: P.createdAt })
      .from(P)
      .where(eq(P.userId, userId))
      .orderBy(desc(P.createdAt))
      .limit(20),
  ]);
  return {
    code,
    joined: Number(counts?.joined ?? 0),
    active: Number(counts?.active ?? 0),
    paid,
    level: levelFor(paid, R),
    next: nextLevel(paid, R),
    points,
    history,
  };
}

/** An absolute link on this site (for QR codes and copy boxes), with an invite code. */
export function siteLink(path: string, code?: string | null): string {
  return withRef(new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL ?? site.url).toString(), code);
}
