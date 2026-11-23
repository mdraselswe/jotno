import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { business } from "@/config";
import { db, schema } from "@/infrastructure/db";

/**
 * Consult monitoring for the team: how each paid chat went (reply time, who wrote
 * how much, calls and their length, rating, complaints) without reading what
 * people wrote. Reading the conversation itself needs a reason and is logged
 * (the admin action `openConsultTranscript`; checked by consults' `adminCanRead`).
 */
const C = schema.consults;
const Pv = schema.providers;
const O = schema.profiles;

export type ConsultFilter = "all" | "active" | "late" | "refunded" | "calls" | "reported";
export const CONSULT_FILTERS: readonly ConsultFilter[] = [
  "all",
  "active",
  "late",
  "reported",
  "calls",
  "refunded",
];

/** A first reply slower than this counts as late (half the refund window). */
const lateMinutes = () => Math.max(5, Math.floor(business.consult.replyWindowMinutes / 2));

const ownerMsgs = sql<number>`(select count(*)::int from ${schema.messages} m where m.consult_id = ${C.id} and m.sender_id = ${C.ownerId})`;
const vetMsgs = sql<number>`(select count(*)::int from ${schema.messages} m where m.consult_id = ${C.id} and m.sender_id = ${Pv.profileId})`;
const photos = sql<number>`(select count(*)::int from ${schema.messages} m where m.consult_id = ${C.id} and m.image_path is not null)`;
const callsTalked = sql<number>`(select count(*)::int from ${schema.calls} k where k.consult_id = ${C.id} and k.answered_at is not null)`;
const callsMissed = sql<number>`(select count(*)::int from ${schema.calls} k where k.consult_id = ${C.id} and k.answered_at is null and k.status <> 'ringing')`;
const callSeconds = sql<number>`(select coalesce(sum(extract(epoch from (k.ended_at - k.answered_at))), 0)::int from ${schema.calls} k where k.consult_id = ${C.id} and k.answered_at is not null and k.ended_at is not null)`;
const videoCalls = sql<number>`(select count(*)::int from ${schema.calls} k where k.consult_id = ${C.id} and k.answered_at is not null and k.media = 'video')`;
const rating = sql<
  number | null
>`(select r.rating from ${schema.reviews} r where r.consult_id = ${C.id} limit 1)`;
const openReports = sql<number>`(select count(*)::int from ${schema.reports} rp where rp.entity = 'consult' and rp.entity_id = ${C.id} and rp.resolved_at is null)`;
const replyMinutes = sql<
  number | null
>`case when ${C.firstReplyAt} is not null and ${C.openedAt} is not null then round(extract(epoch from (${C.firstReplyAt} - ${C.openedAt})) / 60)::int end`;
const hasRx = sql<boolean>`exists (select 1 from ${schema.prescriptions} x where x.consult_id = ${C.id})`;

export interface ConsultRow {
  id: string;
  status: (typeof C.$inferSelect)["status"];
  fee: number;
  summary: string;
  openedAt: Date | null;
  firstReplyAt: Date | null;
  closedAt: Date | null;
  closeReason: string | null;
  createdAt: Date;
  vetId: string;
  vetProfileId: string;
  ownerId: string;
  vet: string;
  owner: string | null;
  ownerEmail: string | null;
  replyMinutes: number | null;
  ownerMsgs: number;
  vetMsgs: number;
  photos: number;
  callsTalked: number;
  callsMissed: number;
  callSeconds: number;
  videoCalls: number;
  rating: number | null;
  openReports: number;
  hasRx: boolean;
}

const columns = {
  id: C.id,
  status: C.status,
  fee: C.fee,
  summary: C.summary,
  openedAt: C.openedAt,
  firstReplyAt: C.firstReplyAt,
  closedAt: C.closedAt,
  closeReason: C.closeReason,
  createdAt: C.createdAt,
  vetId: Pv.id,
  vetProfileId: Pv.profileId,
  ownerId: C.ownerId,
  vet: Pv.displayName,
  owner: O.fullName,
  ownerEmail: O.email,
  replyMinutes,
  ownerMsgs,
  vetMsgs,
  photos,
  callsTalked,
  callsMissed,
  callSeconds,
  videoCalls,
  rating,
  openReports,
  hasRx,
};

const num = (r: ConsultRow): ConsultRow => ({
  ...r,
  replyMinutes: r.replyMinutes === null ? null : Number(r.replyMinutes),
  ownerMsgs: Number(r.ownerMsgs),
  vetMsgs: Number(r.vetMsgs),
  photos: Number(r.photos),
  callsTalked: Number(r.callsTalked),
  callsMissed: Number(r.callsMissed),
  callSeconds: Number(r.callSeconds),
  videoCalls: Number(r.videoCalls),
  rating: r.rating === null ? null : Number(r.rating),
  openReports: Number(r.openReports),
  hasRx: Boolean(r.hasRx),
});

function filterWhere(filter: ConsultFilter): SQL | undefined {
  switch (filter) {
    case "active":
      return eq(C.status, "active");
    case "late":
      return sql`${C.openedAt} is not null and (
        (${C.firstReplyAt} is null and ${C.status} in ('active','refunded'))
        or ${C.firstReplyAt} - ${C.openedAt} > make_interval(mins => ${lateMinutes()})
      )`;
    case "refunded":
      return eq(C.status, "refunded");
    case "calls":
      return sql`exists (select 1 from ${schema.calls} k where k.consult_id = ${C.id})`;
    case "reported":
      return sql`exists (select 1 from ${schema.reports} rp where rp.entity = 'consult' and rp.entity_id = ${C.id})`;
    default:
      return undefined;
  }
}

/** Newest paid consults (100), filtered, optionally by vet or owner name/email. */
export async function listConsults(filter: ConsultFilter, q = ""): Promise<ConsultRow[]> {
  const term = q.trim().slice(0, 60);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await db()
    .select(columns)
    .from(C)
    .innerJoin(Pv, eq(Pv.id, C.providerId))
    .leftJoin(O, eq(O.id, C.ownerId))
    .where(
      and(
        sql`${C.status} in ('active','closed','refunded')`,
        filterWhere(filter),
        term ? or(ilike(Pv.displayName, like), ilike(O.fullName, like), ilike(O.email, like)) : undefined,
      ),
    )
    .orderBy(desc(C.createdAt))
    .limit(100);
  return rows.map(num);
}

export async function consultForAdmin(id: string): Promise<ConsultRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db()
    .select(columns)
    .from(C)
    .innerJoin(Pv, eq(Pv.id, C.providerId))
    .leftJoin(O, eq(O.id, C.ownerId))
    .where(eq(C.id, id))
    .limit(1);
  return row ? num(row) : null;
}

export type TimelineItem =
  | { at: Date; kind: "message"; who: "owner" | "vet"; photo: boolean }
  | { at: Date; kind: "system"; body: string }
  | {
      at: Date;
      kind: "call";
      who: "owner" | "vet" | null;
      media: "audio" | "video";
      status: (typeof schema.calls.$inferSelect)["status"];
      seconds: number;
      relayed: boolean | null;
      endReason: string | null;
    }
  | { at: Date; kind: "report"; reason: string; by: string | null; resolved: boolean }
  | { at: Date; kind: "review"; rating: number }
  | { at: Date; kind: "read"; by: string | null; reason: string }
  | { at: Date; kind: "rx" };

/**
 * What happened in a consult, in order, without message text: who wrote when
 * (text or photo), calls, reports, the review and every time the team read it.
 */
export async function consultTimeline(
  id: string,
  ownerId: string,
  vetProfileId: string,
): Promise<TimelineItem[]> {
  const [msgs, callRows, reports, reviews, reads, rx] = await Promise.all([
    db()
      .select({
        at: schema.messages.createdAt,
        sender: schema.messages.senderId,
        body: schema.messages.body,
        image: schema.messages.imagePath,
      })
      .from(schema.messages)
      .where(eq(schema.messages.consultId, id))
      .orderBy(asc(schema.messages.createdAt)),
    db().select().from(schema.calls).where(eq(schema.calls.consultId, id)),
    db()
      .select({
        at: schema.reports.createdAt,
        reason: schema.reports.reason,
        by: O.email,
        resolvedAt: schema.reports.resolvedAt,
      })
      .from(schema.reports)
      .leftJoin(O, eq(O.id, schema.reports.reporterId))
      .where(and(eq(schema.reports.entity, "consult"), eq(schema.reports.entityId, id))),
    db()
      .select({ at: schema.reviews.createdAt, rating: schema.reviews.rating })
      .from(schema.reviews)
      .where(eq(schema.reviews.consultId, id)),
    db()
      .select({ at: schema.auditLog.createdAt, by: O.email, meta: schema.auditLog.meta })
      .from(schema.auditLog)
      .leftJoin(O, eq(O.id, schema.auditLog.actorId))
      .where(
        and(
          eq(schema.auditLog.action, "consult.read"),
          eq(schema.auditLog.entity, "consult"),
          eq(schema.auditLog.entityId, id),
        ),
      ),
    db()
      .select({ at: schema.prescriptions.createdAt })
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.consultId, id)),
  ]);
  const items: TimelineItem[] = [];
  for (const m of msgs) {
    if (m.sender === null) {
      // Call lines are shown from the calls table (with more detail).
      if (!m.body?.startsWith("system:call:")) items.push({ at: m.at, kind: "system", body: m.body ?? "" });
    } else {
      items.push({
        at: m.at,
        kind: "message",
        who: m.sender === vetProfileId ? "vet" : "owner",
        photo: m.image !== null,
      });
    }
  }
  for (const k of callRows)
    items.push({
      at: k.createdAt,
      kind: "call",
      who: k.callerId === ownerId ? "owner" : k.callerId === vetProfileId ? "vet" : null,
      media: k.media,
      status: k.status,
      seconds:
        k.answeredAt && k.endedAt
          ? Math.max(0, Math.round((k.endedAt.getTime() - k.answeredAt.getTime()) / 1000))
          : 0,
      relayed: k.relayed,
      endReason: k.endReason,
    });
  for (const r of reports)
    items.push({ at: r.at, kind: "report", reason: r.reason, by: r.by, resolved: r.resolvedAt !== null });
  for (const r of reviews) items.push({ at: r.at, kind: "review", rating: r.rating });
  for (const r of reads)
    items.push({
      at: r.at,
      kind: "read",
      by: r.by,
      reason: String((r.meta as { reason?: unknown } | null)?.reason ?? ""),
    });
  for (const r of rx) items.push({ at: r.at, kind: "rx" });
  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface VetConsultStats {
  consults: number;
  answered: number;
  noReplyRefunds: number;
  avgReplyMinutes: number | null;
  lateReplies: number;
  callsTalked: number;
  callMinutes: number;
  videoShare: number | null;
  avgVetMessages: number | null;
  rating: number | null;
  ratings: number;
  reports: number;
}

/** One vet's last 30 days of consults, for the admin's vet page. */
export async function vetConsultStats(providerId: string): Promise<VetConsultStats> {
  const late = lateMinutes();
  const rows = await db().execute<Record<keyof VetConsultStats, number | string | null>>(sql`
    with c as (
      select c.*, p.profile_id as vet_profile
      from ${C} c join ${Pv} p on p.id = c.provider_id
      where c.provider_id = ${providerId}
        and c.status in ('active','closed','refunded')
        and c.created_at > now() - interval '30 days'
    ), k as (
      select k.* from ${schema.calls} k join c on c.id = k.consult_id where k.answered_at is not null
    )
    select
      (select count(*) from c)::int as "consults",
      (select count(*) from c where first_reply_at is not null)::int as "answered",
      (select count(*) from c where status = 'refunded' and first_reply_at is null)::int as "noReplyRefunds",
      (select round(avg(extract(epoch from (first_reply_at - opened_at)) / 60)) from c where first_reply_at is not null)::int as "avgReplyMinutes",
      (select count(*) from c where first_reply_at - opened_at > make_interval(mins => ${late}))::int as "lateReplies",
      (select count(*) from k)::int as "callsTalked",
      (select coalesce(round(sum(extract(epoch from (ended_at - answered_at))) / 60), 0) from k where ended_at is not null)::int as "callMinutes",
      (select round(100.0 * count(*) filter (where media = 'video') / nullif(count(*), 0)) from k)::int as "videoShare",
      (select round(avg(n), 1) from (
        select count(m.*) as n from c left join ${schema.messages} m on m.consult_id = c.id and m.sender_id = c.vet_profile
        where c.first_reply_at is not null group by c.id) x)::float as "avgVetMessages",
      (select round(avg(r.rating), 1) from ${schema.reviews} r join c on c.id = r.consult_id)::float as "rating",
      (select count(*) from ${schema.reviews} r join c on c.id = r.consult_id)::int as "ratings",
      (select count(*) from ${schema.reports} rp join c on c.id = rp.entity_id where rp.entity = 'consult')::int as "reports"
  `);
  const r: Partial<Record<keyof VetConsultStats, number | string | null>> = rows[0] ?? {};
  const n = (k: keyof VetConsultStats) => {
    const v = r[k];
    return v === null || v === undefined ? null : Number(v);
  };
  return {
    consults: n("consults") ?? 0,
    answered: n("answered") ?? 0,
    noReplyRefunds: n("noReplyRefunds") ?? 0,
    avgReplyMinutes: n("avgReplyMinutes"),
    lateReplies: n("lateReplies") ?? 0,
    callsTalked: n("callsTalked") ?? 0,
    callMinutes: n("callMinutes") ?? 0,
    videoShare: n("videoShare"),
    avgVetMessages: n("avgVetMessages"),
    rating: n("rating"),
    ratings: n("ratings") ?? 0,
    reports: n("reports") ?? 0,
  };
}

/** Alerts for the admin home: late first replies (7 days) and open consult complaints. */
export async function consultAlerts(): Promise<{ late7: number; reports: number; noAnswerCalls7: number }> {
  const late = lateMinutes();
  const rows = await db().execute<{ late7: number; reports: number; noAnswerCalls7: number }>(sql`
    select
      (select count(*) from ${C} where created_at > now() - interval '7 days' and opened_at is not null
        and ((first_reply_at is null and status in ('active','refunded')) or first_reply_at - opened_at > make_interval(mins => ${late})))::int as "late7",
      (select count(*) from ${schema.reports} where entity = 'consult' and resolved_at is null)::int as "reports",
      (select count(*) from ${schema.calls} where created_at > now() - interval '7 days' and status in ('missed','failed'))::int as "noAnswerCalls7"
  `);
  const r = rows[0];
  return {
    late7: Number(r?.late7 ?? 0),
    reports: Number(r?.reports ?? 0),
    noAnswerCalls7: Number(r?.noAnswerCalls7 ?? 0),
  };
}
