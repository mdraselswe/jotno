import "server-only";
import { and, desc, eq, gt, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
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
      paymentsReview: sql<number>`(select count(*)::int from ${schema.payments} where status = 'review')`,
      refundsDue: sql<number>`(select count(*)::int from ${schema.payments} where status = 'refund_due')`,
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
    | "paidOrders"
    | "paymentsReview"
    | "refundsDue",
    number
  >;
}

/** Vets by status (200 newest), optionally by name, email or BVC number. */
export async function providersByStatus(status: (typeof P.$inferSelect)["status"] | "all", q = "") {
  const term = q.trim().slice(0, 60);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
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
    .where(
      and(
        status === "all" ? undefined : eq(P.status, status),
        term
          ? or(ilike(P.displayName, like), ilike(schema.profiles.email, like), ilike(P.registrationNo, like))
          : undefined,
      ),
    )
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

export const AUDIT_PAGE = 50;

/**
 * The audit log, newest first: optionally only some action groups
 * (`["user."]`), a search over who, what and which id, and a page (50 a page;
 * one extra row tells the page there is a next one).
 */
export async function auditEntries({
  prefixes = [],
  q = "",
  page = 1,
}: { prefixes?: readonly string[]; q?: string; page?: number } = {}) {
  const A = schema.auditLog;
  const term = q.trim().slice(0, 60);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db()
    .select({
      id: A.id,
      action: A.action,
      entity: A.entity,
      entityId: A.entityId,
      meta: A.meta,
      createdAt: A.createdAt,
      actor: schema.profiles.email,
    })
    .from(A)
    .leftJoin(schema.profiles, eq(schema.profiles.id, A.actorId))
    .where(
      and(
        prefixes.length > 0 ? or(...prefixes.map((p) => ilike(A.action, `${p}%`))) : undefined,
        term
          ? or(
              ilike(A.action, like),
              ilike(A.entity, like),
              ilike(A.entityId, like),
              ilike(schema.profiles.email, like),
            )
          : undefined,
      ),
    )
    .orderBy(desc(A.createdAt))
    .limit(AUDIT_PAGE + 1)
    .offset((Math.max(1, page) - 1) * AUDIT_PAGE);
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

export type UserRoleFilter = "owner" | "vet" | "admin" | "all";

export const USERS_PAGE = 50;

/** Admin: people, newest first, by name/email/phone and role (50 a page, plus one to tell if there's more). */
export async function listUsers(q: string, role: UserRoleFilter, page = 1) {
  const PF = schema.profiles;
  const term = q.trim().slice(0, 60);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db()
    .select({
      id: PF.id,
      fullName: PF.fullName,
      email: PF.email,
      phone: PF.phone,
      role: PF.role,
      avatarPath: PF.avatarPath,
      isDemo: PF.isDemo,
      createdAt: PF.createdAt,
      blocked: sql<boolean>`coalesce((select u.banned_until > now() from auth.users u where u.id = "profiles"."id"), false)`,
      providerId: P.id,
      providerStatus: P.status,
    })
    .from(PF)
    .leftJoin(P, eq(P.profileId, PF.id))
    .where(
      and(
        role === "all" ? undefined : eq(PF.role, role),
        term ? or(ilike(PF.email, like), ilike(PF.fullName, like), ilike(PF.phone, like)) : undefined,
      ),
    )
    .orderBy(desc(PF.createdAt))
    .limit(USERS_PAGE + 1)
    .offset((Math.max(1, page) - 1) * USERS_PAGE);
}

/** Admin: every article (drafts too), newest first. */
export async function listArticles(status: "draft" | "published" | "all") {
  const AR = schema.articles;
  return db()
    .select({
      id: AR.id,
      slug: AR.slug,
      title: AR.title,
      status: AR.status,
      publishedAt: AR.publishedAt,
      updatedAt: AR.updatedAt,
      isDemo: AR.isDemo,
      vet: P.displayName,
    })
    .from(AR)
    .innerJoin(P, eq(P.id, AR.providerId))
    .where(status === "all" ? undefined : eq(AR.status, status))
    .orderBy(desc(AR.updatedAt))
    .limit(200);
}

export type AppointmentFilter = "upcoming" | "past" | "cancelled" | "all";

/** Admin: clinic visits across all vets. */
export async function listAppointments(filter: AppointmentFilter) {
  const A = schema.appointments;
  const PF = schema.profiles;
  const where =
    filter === "upcoming"
      ? and(inArray(A.status, ["pending_payment", "confirmed"]), gt(A.startsAt, new Date()))
      : filter === "past"
        ? and(inArray(A.status, ["confirmed", "completed", "no_show"]), lte(A.startsAt, new Date()))
        : filter === "cancelled"
          ? eq(A.status, "cancelled")
          : undefined;
  return db()
    .select({
      id: A.id,
      startsAt: A.startsAt,
      status: A.status,
      bookingFee: A.bookingFee,
      visitFee: A.visitFee,
      reason: A.reason,
      vet: P.displayName,
      owner: PF.fullName,
      ownerEmail: PF.email,
      ownerPhone: PF.phone,
    })
    .from(A)
    .innerJoin(P, eq(P.id, A.providerId))
    .innerJoin(PF, eq(PF.id, A.ownerId))
    .where(where)
    .orderBy(filter === "upcoming" ? A.startsAt : desc(A.startsAt))
    .limit(200);
}
