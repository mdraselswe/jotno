import "server-only";
import { and, desc, eq, gt, ilike, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { business } from "@/config";
import { vetBalance } from "@/features/payments";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";
import { nameKey } from "@/lib/bangla-name";
import { bvcKey } from "@/lib/bvc";
import type { RegisterFilter } from "../bvc-match";
import { RESTORE_ACTION } from "../restore";

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
      // Paid by wallet, or cash on delivery waiting for the phone check: both need packing.
      paidOrders: sql<number>`(select count(*)::int from ${schema.orders} where status = 'paid')`,
      placedOrders: sql<number>`(select count(*)::int from ${schema.orders} where status = 'placed')`,
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
    | "placedOrders"
    | "paymentsReview"
    | "refundsDue",
    number
  >;
}

/** Rows per page on the admin lists; each query fetches one more to tell the page there is a next one. */
export const ADMIN_PAGE = 50;
const pageOffset = (page: number) => (Math.max(1, page) - 1) * ADMIN_PAGE;

/** `bvcKey` (lib/bvc.ts) in Postgres: Bangla digits to ASCII, digits only, no leading zeros. */
const bvcKeySql = sql<string>`ltrim(regexp_replace(translate(coalesce(${P.registrationNo}, ''), '০১২৩৪৫৬৭৮৯', '0123456789'), '[^0-9]', '', 'g'), '0')`;

const R = schema.bvcRegister;

/**
 * Vets by status, newest first, optionally by name, email or BVC number (a page
 * of 50, plus one), with their BVC register row. `register`: only vets whose
 * number is not in the register, or whose register name needs a look.
 */
export async function providersByStatus(
  status: (typeof P.$inferSelect)["status"] | "all",
  q = "",
  page = 1,
  register: RegisterFilter | null = null,
) {
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
      nameNidBn: P.nameNidBn,
      registerRow: R.regKey,
      registerName: R.nameBn,
    })
    .from(P)
    .innerJoin(schema.profiles, eq(schema.profiles.id, P.profileId))
    .leftJoin(schema.districts, eq(schema.districts.id, P.districtId))
    .leftJoin(R, eq(R.regKey, bvcKeySql))
    .where(
      and(
        status === "all" ? undefined : eq(P.status, status),
        register === "missing" ? isNull(R.regKey) : undefined,
        // Keys differ for "close" names too: the list shows each row's verdict.
        register === "check"
          ? and(isNotNull(R.regKey), or(isNull(R.nameKey), isNull(P.nameNidKey), ne(R.nameKey, P.nameNidKey)))
          : undefined,
        term
          ? or(ilike(P.displayName, like), ilike(schema.profiles.email, like), ilike(P.registrationNo, like))
          : undefined,
      ),
    )
    .orderBy(desc(P.submittedAt), desc(P.createdAt), desc(P.id))
    .limit(ADMIN_PAGE + 1)
    .offset(pageOffset(page));
}

/** Other profiles with the same BVC number, however it was typed (one number belongs to one vet). */
async function sameBvc(id: string, registrationNo: string | null) {
  const key = bvcKey(registrationNo);
  if (!key) return [];
  return db()
    .select({ id: P.id, name: P.displayName, status: P.status, registrationNo: P.registrationNo })
    .from(P)
    .where(and(ne(P.id, id), sql`${bvcKeySql} = ${key}`))
    .limit(5);
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
  const [documents, history, twins, register] = await Promise.all([
    db().select().from(schema.providerDocuments).where(eq(schema.providerDocuments.providerId, id)),
    db()
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, "provider"), eq(schema.auditLog.entityId, id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(20),
    sameBvc(id, row.p.registrationNo),
    registerFor(row.p.registrationNo, row.p.nameNidBn),
  ]);
  return { ...row, photoUrl: mediaUrl(row.p.photoPath), documents, history, twins, register };
}

const registerColumns = {
  regKey: R.regKey,
  regNo: R.regNo,
  nameBn: R.nameBn,
  division: R.division,
  page: R.page,
  updatedAt: R.updatedAt,
  sourceTitle: schema.bvcSources.title,
  sourceUrl: schema.bvcSources.url,
  sourcePublished: schema.bvcSources.publishedOn,
  /** Typed in by an admin (server/bvc-actions.ts), not from an imported list. */
  sourceManual: sql<boolean>`coalesce(${schema.bvcSources.fileHash} = 'manual', false)`,
};

/**
 * The register row for a vet's BVC number, and rows with the vet's NID name
 * (a typo in the number still finds them), for the admin's side-by-side check.
 */
async function registerFor(registrationNo: string | null, nameNidBn: string | null) {
  const key = bvcKey(registrationNo);
  const name = nameKey(nameNidBn);
  const [found, byName] = await Promise.all([
    key
      ? db()
          .select(registerColumns)
          .from(R)
          .leftJoin(schema.bvcSources, eq(schema.bvcSources.id, R.sourceId))
          .where(eq(R.regKey, key))
          .limit(1)
      : Promise.resolve([]),
    name
      ? db()
          .select(registerColumns)
          .from(R)
          .leftJoin(schema.bvcSources, eq(schema.bvcSources.id, R.sourceId))
          .where(and(eq(R.nameKey, name), key ? ne(R.regKey, key) : undefined))
          .limit(3)
      : Promise.resolve([]),
  ]);
  return { row: found[0] ?? null, byName };
}

/** The BVC register page: imported lists, size, and rows by number or name. */
export async function bvcOverview() {
  const [sources, [counts]] = await Promise.all([
    db()
      .select({
        id: schema.bvcSources.id,
        title: schema.bvcSources.title,
        url: schema.bvcSources.url,
        publishedOn: schema.bvcSources.publishedOn,
        rowCount: schema.bvcSources.rowCount,
        createdAt: schema.bvcSources.createdAt,
        manual: sql<boolean>`coalesce(${schema.bvcSources.fileHash} = 'manual', false)`,
        current: sql<number>`(select count(*)::int from ${R} where ${R.sourceId} = ${schema.bvcSources.id})`,
      })
      .from(schema.bvcSources)
      .orderBy(desc(schema.bvcSources.createdAt))
      .limit(20),
    db()
      .select({
        total: sql<number>`count(*)::int`,
        unreadable: sql<number>`count(*) filter (where ${R.nameBn} is null)::int`,
      })
      .from(R),
  ]);
  return { sources, total: Number(counts?.total ?? 0), unreadable: Number(counts?.unreadable ?? 0) };
}

/** Register rows by BVC number (exact) or Bangla name (part of it), up to 50. */
export async function bvcSearch(q: string) {
  const term = q.trim().slice(0, 60);
  if (!term) return [];
  const key = bvcKey(term);
  // Digits (either script), spaces and dashes: a number; anything else: a name.
  const byNumber = /^[\d\u09E6-\u09EF\s-]+$/.test(term);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db()
    .select(registerColumns)
    .from(R)
    .leftJoin(schema.bvcSources, eq(schema.bvcSources.id, R.sourceId))
    .where(byNumber && key ? eq(R.regKey, key) : ilike(R.nameBn, like))
    .orderBy(R.regKey)
    .limit(50);
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

/** Which of these "report.hide" audit entries have already been undone (`restoreHidden`). */
export async function restoredHides(auditIds: readonly number[]): Promise<Set<number>> {
  if (auditIds.length === 0) return new Set();
  const A = schema.auditLog;
  const rows = await db()
    .select({ from: sql<string>`${A.meta}->>'auditId'` })
    .from(A)
    .where(
      and(
        eq(A.action, RESTORE_ACTION),
        inArray(
          sql`${A.meta}->>'auditId'`,
          auditIds.map((id) => String(id)),
        ),
      ),
    );
  return new Set(rows.map((r) => Number(r.from)));
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

/** Admin: every article (drafts too), newest first (a page of 50, plus one). */
export async function listArticles(status: "draft" | "published" | "all", page = 1) {
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
    .orderBy(desc(AR.updatedAt), desc(AR.id))
    .limit(ADMIN_PAGE + 1)
    .offset(pageOffset(page));
}

export type AppointmentFilter = "upcoming" | "past" | "cancelled" | "all";

/** Admin: clinic visits across all vets (a page of 50, plus one). */
export async function listAppointments(filter: AppointmentFilter, page = 1) {
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
    .orderBy(filter === "upcoming" ? A.startsAt : desc(A.startsAt), A.id)
    .limit(ADMIN_PAGE + 1)
    .offset(pageOffset(page));
}
