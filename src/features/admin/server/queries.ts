import "server-only";
import { and, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { business } from "@/config";
import { vetBalance } from "@/features/payments";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";

const P = schema.providers;

export async function adminCounts() {
  const [row] = await db()
    .select({
      users: sql<number>`(select count(*)::int from ${schema.profiles})`,
      owners: sql<number>`(select count(*)::int from ${schema.profiles} where role = 'owner')`,
      verified: sql<number>`(select count(*)::int from ${P} where status = 'verified')`,
      pending: sql<number>`(select count(*)::int from ${P} where status = 'pending')`,
      activeConsults: sql<number>`(select count(*)::int from ${schema.consults} where status = 'active')`,
      consults30: sql<number>`(select count(*)::int from ${schema.consults} where status in ('active','closed','refunded') and created_at > now() - interval '30 days')`,
      refunded30: sql<number>`(select count(*)::int from ${schema.consults} where status = 'refunded' and created_at > now() - interval '30 days')`,
      openQuestions: sql<number>`(select count(*)::int from ${schema.questions} where status = 'open')`,
      openReports: sql<number>`(select count(*)::int from ${schema.reports} where resolved_at is null)`,
      paidOrders: sql<number>`(select count(*)::int from ${schema.orders} where status = 'paid')`,
    })
    .from(sql`(select 1) as one`);
  return Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v)])) as Record<
    | "users"
    | "owners"
    | "verified"
    | "pending"
    | "activeConsults"
    | "consults30"
    | "refunded30"
    | "openQuestions"
    | "openReports"
    | "paidOrders",
    number
  >;
}

export async function providersByStatus(status: (typeof P.$inferSelect)["status"] | "all") {
  return db()
    .select({
      id: P.id,
      displayName: P.displayName,
      status: P.status,
      registrationNo: P.registrationNo,
      submittedAt: P.submittedAt,
      completeness: P.completeness,
      isDemo: P.isDemo,
      email: schema.profiles.email,
      district: schema.districts.nameEn,
    })
    .from(P)
    .innerJoin(schema.profiles, eq(schema.profiles.id, P.profileId))
    .leftJoin(schema.districts, eq(schema.districts.id, P.districtId))
    .where(status === "all" ? undefined : eq(P.status, status))
    .orderBy(desc(P.submittedAt), desc(P.createdAt))
    .limit(200);
}

export async function providerForReview(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db()
    .select({
      p: P,
      email: schema.profiles.email,
      phone: schema.profiles.phone,
      district: schema.districts.nameEn,
      area: schema.areas.nameEn,
    })
    .from(P)
    .innerJoin(schema.profiles, eq(schema.profiles.id, P.profileId))
    .leftJoin(schema.districts, eq(schema.districts.id, P.districtId))
    .leftJoin(schema.areas, eq(schema.areas.id, P.areaId))
    .where(eq(P.id, id))
    .limit(1);
  if (!row) return null;
  const [documents, history] = await Promise.all([
    db().select().from(schema.providerDocuments).where(eq(schema.providerDocuments.providerId, id)),
    db()
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, "provider"), eq(schema.auditLog.entityId, id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(20),
  ]);
  return { ...row, photoUrl: mediaUrl(row.p.photoPath), documents, history };
}

/** Vets with money ready to pay out (balance ≥ minimum). */
export async function payoutQueue() {
  const rows = await db()
    .select({
      providerId: schema.ledgerEntries.providerId,
      kind: schema.ledgerEntries.kind,
      amount: schema.ledgerEntries.amount,
      availableAt: schema.ledgerEntries.availableAt,
    })
    .from(schema.ledgerEntries)
    .where(inArray(schema.ledgerEntries.kind, ["vet_payable", "payout"]));
  const byVet = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.providerId) continue;
    const list = byVet.get(r.providerId) ?? [];
    list.push(r);
    byVet.set(r.providerId, list);
  }
  const now = new Date();
  const due = [...byVet.entries()]
    .map(([providerId, list]) => ({ providerId, balance: vetBalance(list, now) }))
    .filter((v) => v.balance.available > 0 || v.balance.pending > 0);
  if (due.length === 0) return [];
  const names = await db()
    .select({ id: P.id, name: P.displayName, phone: P.phonePublic, email: schema.profiles.email })
    .from(P)
    .innerJoin(schema.profiles, eq(schema.profiles.id, P.profileId))
    .where(
      inArray(
        P.id,
        due.map((d) => d.providerId),
      ),
    );
  return due
    .map((d) => {
      const n = names.find((x) => x.id === d.providerId);
      return {
        ...d,
        name: n?.name ?? "—",
        email: n?.email ?? null,
        phone: n?.phone ?? null,
        ready: d.balance.available >= business.payout.minimum,
      };
    })
    .sort((a, b) => b.balance.available - a.balance.available);
}

export async function recentPayouts() {
  return db()
    .select({
      id: schema.payouts.id,
      amount: schema.payouts.amount,
      method: schema.payouts.method,
      reference: schema.payouts.reference,
      createdAt: schema.payouts.createdAt,
      name: P.displayName,
    })
    .from(schema.payouts)
    .innerJoin(P, eq(P.id, schema.payouts.providerId))
    .orderBy(desc(schema.payouts.createdAt))
    .limit(50);
}

export async function activeFeatured() {
  return db()
    .select({
      id: schema.featuredSlots.id,
      name: P.displayName,
      districtId: schema.featuredSlots.districtId,
      startsAt: schema.featuredSlots.startsAt,
      endsAt: schema.featuredSlots.endsAt,
      source: schema.featuredSlots.source,
    })
    .from(schema.featuredSlots)
    .innerJoin(P, eq(P.id, schema.featuredSlots.providerId))
    .where(and(gt(schema.featuredSlots.endsAt, new Date()), lte(schema.featuredSlots.startsAt, new Date())))
    .orderBy(schema.featuredSlots.endsAt)
    .limit(200);
}

export async function verifiedVetOptions() {
  return db()
    .select({ id: P.id, name: P.displayName, districtId: P.districtId })
    .from(P)
    .where(eq(P.status, "verified"))
    .orderBy(P.displayName)
    .limit(1000);
}

export async function openReports() {
  return db()
    .select({
      id: schema.reports.id,
      entity: schema.reports.entity,
      entityId: schema.reports.entityId,
      reason: schema.reports.reason,
      createdAt: schema.reports.createdAt,
      reporter: schema.profiles.email,
    })
    .from(schema.reports)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.reports.reporterId))
    .where(isNull(schema.reports.resolvedAt))
    .orderBy(desc(schema.reports.createdAt))
    .limit(100);
}

export async function auditEntries(limit = 200) {
  return db()
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      meta: schema.auditLog.meta,
      createdAt: schema.auditLog.createdAt,
      actor: schema.profiles.email,
    })
    .from(schema.auditLog)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.auditLog.actorId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}

export async function recentRefundable() {
  return db()
    .select({
      id: schema.consults.id,
      summary: schema.consults.summary,
      fee: schema.consults.fee,
      openedAt: schema.consults.openedAt,
      vet: P.displayName,
    })
    .from(schema.consults)
    .innerJoin(P, eq(P.id, schema.consults.providerId))
    .where(eq(schema.consults.status, "active"))
    .orderBy(desc(schema.consults.openedAt))
    .limit(50);
}
