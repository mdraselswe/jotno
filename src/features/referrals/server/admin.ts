import "server-only";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { business } from "@/config";
import { db, schema } from "@/infrastructure/db";

const RF = schema.referrals;
const who = alias(schema.profiles, "who");
const inviter = alias(schema.profiles, "inviter");
const invited = alias(schema.profiles, "invited");

export interface InviteLeader {
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "vet" | "admin";
  joined: number;
  paid: number;
  flagged: number;
  today: number;
}

export interface InviteRow {
  refereeId: string;
  referrerId: string;
  inviterName: string | null;
  inviterEmail: string | null;
  invitedName: string | null;
  invitedEmail: string | null;
  status: "ok" | "flagged";
  flagReason: string | null;
  activatedAt: Date | null;
  firstPaidAt: Date | null;
  createdAt: Date;
}

export interface InviteOverview {
  leaders: InviteLeader[];
  /** Inviters with more sign-ups in the last day than `watchPerDay`. */
  watch: InviteLeader[];
  recent: InviteRow[];
  totals: { joined: number; paid: number; flagged: number; points: number };
}

/** Admin: who brings people in, who looks suspicious, and the latest invites. */
export async function inviteOverview(filter: "all" | "flagged" = "all"): Promise<InviteOverview> {
  const leaderCols = {
    userId: RF.referrerId,
    name: who.fullName,
    email: who.email,
    role: who.role,
    joined: sql<number>`count(*) filter (where ${RF.status} = 'ok')::int`,
    paid: sql<number>`count(*) filter (where ${RF.status} = 'ok' and ${RF.firstPaidAt} is not null)::int`,
    flagged: sql<number>`count(*) filter (where ${RF.status} = 'flagged')::int`,
    today: sql<number>`count(*) filter (where ${RF.createdAt} > now() - interval '1 day')::int`,
  };
  const grouped = () =>
    db()
      .select(leaderCols)
      .from(RF)
      .innerJoin(who, eq(who.id, RF.referrerId))
      .groupBy(RF.referrerId, who.fullName, who.email, who.role);

  const [leaders, watch, recent, [totals], [pts]] = await Promise.all([
    grouped().orderBy(desc(leaderCols.paid), desc(leaderCols.joined)).limit(20),
    grouped()
      .having(
        sql`count(*) filter (where ${RF.createdAt} > now() - interval '1 day') > ${business.referral.watchPerDay}`,
      )
      .orderBy(desc(leaderCols.today))
      .limit(20),
    db()
      .select({
        refereeId: RF.refereeId,
        referrerId: RF.referrerId,
        inviterName: inviter.fullName,
        inviterEmail: inviter.email,
        invitedName: invited.fullName,
        invitedEmail: invited.email,
        status: RF.status,
        flagReason: RF.flagReason,
        activatedAt: RF.activatedAt,
        firstPaidAt: RF.firstPaidAt,
        createdAt: RF.createdAt,
      })
      .from(RF)
      .innerJoin(inviter, eq(inviter.id, RF.referrerId))
      .innerJoin(invited, eq(invited.id, RF.refereeId))
      .where(filter === "flagged" ? eq(RF.status, "flagged") : undefined)
      .orderBy(desc(RF.createdAt))
      .limit(50),
    db()
      .select({
        joined: sql<number>`count(*) filter (where ${RF.status} = 'ok')::int`,
        paid: sql<number>`count(*) filter (where ${RF.status} = 'ok' and ${RF.firstPaidAt} is not null)::int`,
        flagged: sql<number>`count(*) filter (where ${RF.status} = 'flagged')::int`,
      })
      .from(RF),
    db()
      .select({ points: sql<number>`coalesce(sum(${schema.points.amount}), 0)::int` })
      .from(schema.points)
      .where(and(gt(schema.points.amount, 0), inArray(schema.points.status, ["available", "pending"]))),
  ]);
  const num = (r: InviteLeader) => ({
    ...r,
    joined: Number(r.joined),
    paid: Number(r.paid),
    flagged: Number(r.flagged),
    today: Number(r.today),
  });
  return {
    leaders: leaders.map(num),
    watch: watch.map(num),
    recent,
    totals: {
      joined: Number(totals?.joined ?? 0),
      paid: Number(totals?.paid ?? 0),
      flagged: Number(totals?.flagged ?? 0),
      points: Number(pts?.points ?? 0),
    },
  };
}
