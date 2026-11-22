import "server-only";
import { and, asc, desc, eq, gt, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { business } from "@/config";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";
import { shortId, slugify } from "@/lib/slug";
import { rankScore } from "../ranking";

const p = schema.providers;
const a = schema.areas;
const d = schema.districts;

/** Effective "available now": switched on and not expired. */
const availableSql = sql<boolean>`(${p.availableNow} and (${p.availableUntil} is null or ${p.availableUntil} > now()))`;

const speciesSlugsSql = sql<
  string[]
>`coalesce((select array_agg(s.slug order by s.sort) from ${schema.providerSpecies} ps join ${schema.species} s on s.id = ps.species_id where ps.provider_id = ${p.id}), '{}')`;

export interface ProviderCard {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  photoUrl: string | null;
  clinicName: string | null;
  areaBn: string | null;
  areaEn: string | null;
  districtBn: string | null;
  districtEn: string | null;
  consultFee: number;
  visitFee: number;
  rating: number | null;
  ratingCount: number;
  experienceYears: number | null;
  availableNow: boolean;
  emergency24x7: boolean;
  homeVisit: boolean;
  phonePublic: string | null;
  species: string[];
  distanceKm: number | null;
  lat: number | null;
  lon: number | null;
  featured: boolean;
  isDemo: boolean;
}

const cardColumns = {
  id: p.id,
  slug: p.slug,
  displayName: p.displayName,
  title: p.title,
  photoPath: p.photoPath,
  clinicName: p.clinicName,
  areaId: p.areaId,
  areaBn: a.nameBn,
  areaEn: a.nameEn,
  districtBn: d.nameBn,
  districtEn: d.nameEn,
  consultFee: p.consultFee,
  visitFee: p.visitFee,
  ratingSum: p.ratingSum,
  ratingCount: p.ratingCount,
  consultCount: p.consultCount,
  completeness: p.completeness,
  experienceYears: p.experienceYears,
  availableNow: availableSql,
  emergency24x7: p.emergency24x7,
  homeVisit: p.homeVisit,
  phonePublic: p.phonePublic,
  lastSeenAt: p.lastSeenAt,
  species: speciesSlugsSql,
  lat: sql<number | null>`extensions.st_y(${p.location})`,
  lon: sql<number | null>`extensions.st_x(${p.location})`,
  isDemo: p.isDemo,
};

function toCard(row: Record<string, unknown>, distanceKm: number | null, featured: boolean): ProviderCard {
  const r = row as {
    id: string;
    slug: string;
    displayName: string;
    title: string | null;
    photoPath: string | null;
    clinicName: string | null;
    areaBn: string | null;
    areaEn: string | null;
    districtBn: string | null;
    districtEn: string | null;
    consultFee: number;
    visitFee: number;
    ratingSum: number;
    ratingCount: number;
    experienceYears: number | null;
    availableNow: boolean;
    emergency24x7: boolean;
    homeVisit: boolean;
    phonePublic: string | null;
    species: string[] | null;
    lat: number | null;
    lon: number | null;
    isDemo: boolean;
  };
  return {
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    title: r.title,
    photoUrl: mediaUrl(r.photoPath),
    clinicName: r.clinicName,
    areaBn: r.areaBn,
    areaEn: r.areaEn,
    districtBn: r.districtBn,
    districtEn: r.districtEn,
    consultFee: r.consultFee,
    visitFee: r.visitFee,
    rating: r.ratingCount > 0 ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null,
    ratingCount: r.ratingCount,
    experienceYears: r.experienceYears,
    availableNow: Boolean(r.availableNow),
    emergency24x7: r.emergency24x7,
    homeVisit: r.homeVisit,
    phonePublic: r.phonePublic,
    species: r.species ?? [],
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    lat: r.lat === null ? null : Number(r.lat),
    lon: r.lon === null ? null : Number(r.lon),
    featured,
    isDemo: r.isDemo,
  };
}

export interface SearchInput {
  districtId?: number | null;
  areaId?: number | null;
  species?: string | null;
  emergency?: boolean;
  /** Only vets who switched on "available now". */
  onlyAvailable?: boolean;
  near?: { lat: number; lon: number } | null;
  /** With `near`: only vets within this many km (their clinic location). */
  radiusKm?: number;
  q?: string | null;
  page?: number;
  pageSize?: number;
}

/**
 * Verified vets for a search: sponsored ones (max a few per district, clearly
 * labelled) and the organic list ranked by `rankScore`.
 */
export async function searchProviders(input: SearchInput): Promise<{
  featured: ProviderCard[];
  results: ProviderCard[];
  total: number;
}> {
  const conds: SQL[] = [eq(p.status, "verified")];
  if (input.districtId) conds.push(eq(p.districtId, input.districtId));
  if (input.species) {
    conds.push(
      sql`exists (select 1 from ${schema.providerSpecies} ps join ${schema.species} s on s.id = ps.species_id where ps.provider_id = ${p.id} and s.slug = ${input.species})`,
    );
  }
  if (input.emergency) {
    const either = or(availableSql, eq(p.emergency24x7, true));
    if (either) conds.push(either);
  }
  if (input.onlyAvailable) conds.push(availableSql);
  const q = input.q?.trim();
  if (q) {
    const like = or(ilike(p.displayName, `%${q}%`), ilike(p.clinicName, `%${q}%`));
    if (like) conds.push(like);
  }

  const near = input.near;
  const point = near
    ? sql`extensions.st_setsrid(extensions.st_makepoint(${near.lon}, ${near.lat}), 4326)::extensions.geography`
    : null;
  const distanceSql = point
    ? sql<number | null>`extensions.st_distance(${p.location}::extensions.geography, ${point}) / 1000`
    : sql<number | null>`null`;
  if (point) {
    // Only vets with a clinic location inside the radius (uses the location index).
    conds.push(
      sql`extensions.st_dwithin(${p.location}::extensions.geography, ${point}, ${(input.radiusKm ?? 10) * 1000})`,
    );
  }

  const rows = await db()
    .select({ ...cardColumns, distanceKm: distanceSql })
    .from(p)
    .leftJoin(a, eq(a.id, p.areaId))
    .leftJoin(d, eq(d.id, p.districtId))
    .where(and(...conds))
    .limit(300);

  const now = new Date();
  const ranked = rows
    .map((row) => {
      const distanceKm = row.distanceKm === null ? null : Number(row.distanceKm);
      const score = rankScore(
        {
          ratingSum: row.ratingSum,
          ratingCount: row.ratingCount,
          completeness: row.completeness,
          availableNow: Boolean(row.availableNow),
          emergency24x7: row.emergency24x7,
          consultCount: row.consultCount,
          distanceKm,
          sameArea: Boolean(input.areaId && row.areaId === input.areaId),
          speciesMatch: Boolean(input.species),
          lastSeenAt: row.lastSeenAt,
        },
        now,
        input.emergency,
      );
      return { card: toCard(row, distanceKm, false), score };
    })
    // Near me: nearest first (to the half km), best ranked among equals.
    .sort((x, y) =>
      near
        ? Math.round((x.card.distanceKm ?? 0) * 2) - Math.round((y.card.distanceKm ?? 0) * 2) ||
          y.score - x.score
        : y.score - x.score,
    );

  const featured = input.emergency ? [] : await featuredFor(input.districtId ?? null, input.species ?? null);
  const featuredIds = new Set(featured.map((f) => f.id));
  const organic = ranked.filter((r) => !featuredIds.has(r.card.id)).map((r) => r.card);
  const size = input.pageSize ?? 12;
  const page = Math.max(1, input.page ?? 1);
  return { featured, results: organic.slice(0, page * size), total: organic.length };
}

async function featuredFor(districtId: number | null, speciesSlug: string | null): Promise<ProviderCard[]> {
  const fs = schema.featuredSlots;
  const conds: SQL[] = [eq(p.status, "verified"), lte(fs.startsAt, sql`now()`), gt(fs.endsAt, sql`now()`)];
  if (districtId) {
    const scope = or(isNull(fs.districtId), eq(fs.districtId, districtId));
    if (scope) conds.push(scope);
  }
  if (speciesSlug) {
    conds.push(
      sql`(${fs.speciesId} is null or ${fs.speciesId} = (select id from ${schema.species} where slug = ${speciesSlug}))`,
    );
  }
  const rows = await db()
    .selectDistinctOn([p.id], cardColumns)
    .from(fs)
    .innerJoin(p, eq(p.id, fs.providerId))
    .leftJoin(a, eq(a.id, p.areaId))
    .leftJoin(d, eq(d.id, p.districtId))
    .where(and(...conds))
    .orderBy(p.id)
    .limit(business.featured.maxPerDistrict);
  // Rotate fairly: a different order each hour.
  const hour = Math.floor(Date.now() / 3_600_000);
  return rows
    .map((row) => toCard(row, null, true))
    .sort((x, y) => ((x.id.charCodeAt(0) + hour) % 7) - ((y.id.charCodeAt(0) + hour) % 7));
}

export interface ProviderPublic extends ProviderCard {
  bio: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  registrationBody: string;
  address: string | null;
  verifiedAt: Date | null;
  consultCount: number;
  reviews: { id: string; rating: number; body: string | null; createdAt: Date; ownerName: string | null }[];
  hasSchedule: boolean;
}

/** A verified vet's public profile, or null. */
export async function getProviderBySlug(slug: string): Promise<ProviderPublic | null> {
  const [row] = await db()
    .select({
      ...cardColumns,
      bio: p.bio,
      qualifications: p.qualifications,
      registrationNo: p.registrationNo,
      registrationBody: p.registrationBody,
      address: p.address,
      verifiedAt: p.verifiedAt,
      hasSchedule: sql<boolean>`exists (select 1 from ${schema.availability} av where av.provider_id = ${p.id})`,
      featured: sql<boolean>`exists (select 1 from ${schema.featuredSlots} f where f.provider_id = ${p.id} and f.starts_at <= now() and f.ends_at > now())`,
    })
    .from(p)
    .leftJoin(a, eq(a.id, p.areaId))
    .leftJoin(d, eq(d.id, p.districtId))
    .where(and(eq(p.slug, slug), eq(p.status, "verified")))
    .limit(1);
  if (!row) return null;

  const reviews = await db()
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      body: schema.reviews.body,
      createdAt: schema.reviews.createdAt,
      ownerName: schema.profiles.fullName,
    })
    .from(schema.reviews)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.reviews.ownerId))
    .where(eq(schema.reviews.providerId, row.id))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(10);

  return {
    ...toCard(row, null, Boolean(row.featured)),
    bio: row.bio,
    qualifications: row.qualifications,
    registrationNo: row.registrationNo,
    registrationBody: row.registrationBody,
    address: row.address,
    verifiedAt: row.verifiedAt,
    consultCount: row.consultCount,
    hasSchedule: Boolean(row.hasSchedule),
    reviews: reviews.map((r) => ({
      ...r,
      ownerName: r.ownerName ? (r.ownerName.split(" ")[0] ?? null) : null,
    })),
  };
}

export async function getProviderPhoto(providerId: string): Promise<string | null> {
  const [row] = await db().select({ photoPath: p.photoPath }).from(p).where(eq(p.id, providerId)).limit(1);
  return mediaUrl(row?.photoPath);
}

/** Live numbers for the home page: vets online now, verified vets, and map dots. */
export async function liveStats(): Promise<{
  online: number;
  verified: number;
  dots: { lat: number; lon: number; online: boolean }[];
}> {
  const rows = await db()
    .select({
      online: availableSql,
      lat: sql<number | null>`extensions.st_y(${p.location})`,
      lon: sql<number | null>`extensions.st_x(${p.location})`,
    })
    .from(p)
    .where(eq(p.status, "verified"))
    .limit(2000);
  const dots = rows
    .filter((r) => r.lat !== null && r.lon !== null)
    .map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), online: Boolean(r.online) }));
  return { online: rows.filter((r) => r.online).length, verified: rows.length, dots };
}

/** Counts a profile view, call tap or chat start (one row per vet per day). */
export async function recordStat(providerId: string, kind: "views" | "calls" | "chats"): Promise<void> {
  const t = schema.providerStatsDaily;
  const column = t[kind];
  await db()
    .insert(t)
    .values({ providerId, day: sql`(now() at time zone 'Asia/Dhaka')::date`, [kind]: 1 })
    .onConflictDoUpdate({ target: [t.providerId, t.day], set: { [kind]: sql`${column} + 1` } });
}

export async function providerIdForProfile(profileId: string): Promise<string | null> {
  const [row] = await db().select({ id: p.id }).from(p).where(eq(p.profileId, profileId)).limit(1);
  return row?.id ?? null;
}

/** Creates the vet's draft profile once (onboarding as a vet). */
export async function ensureDraftProvider(
  profileId: string,
  displayName: string,
  districtId: number | null,
  areaId: number | null,
): Promise<string> {
  const existing = await providerIdForProfile(profileId);
  if (existing) return existing;
  const name = displayName.startsWith("Dr") ? displayName : `Dr. ${displayName}`;
  const [row] = await db()
    .insert(p)
    .values({ profileId, displayName: name, slug: `${slugify(name)}-${shortId()}`, districtId, areaId })
    .returning({ id: p.id });
  if (!row) throw new Error("Could not create provider");
  return row.id;
}

export interface MyProvider {
  id: string;
  status: "draft" | "pending" | "verified" | "rejected" | "suspended";
  slug: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  experienceYears: number | null;
  consultFee: number;
  visitFee: number;
  clinicName: string | null;
  address: string | null;
  districtId: number | null;
  areaId: number | null;
  lat: number | null;
  lon: number | null;
  phonePublic: string | null;
  availableNow: boolean;
  availableUntil: Date | null;
  emergency24x7: boolean;
  homeVisit: boolean;
  photoPath: string | null;
  photoUrl: string | null;
  completeness: number;
  rejectionReason: string | null;
  speciesIds: number[];
  documents: { id: string; kind: string; path: string; createdAt: Date }[];
  ratingSum: number;
  ratingCount: number;
  consultCount: number;
}

export async function getMyProvider(profileId: string): Promise<MyProvider | null> {
  const [row] = await db()
    .select({
      id: p.id,
      status: p.status,
      slug: p.slug,
      displayName: p.displayName,
      title: p.title,
      bio: p.bio,
      qualifications: p.qualifications,
      registrationNo: p.registrationNo,
      experienceYears: p.experienceYears,
      consultFee: p.consultFee,
      visitFee: p.visitFee,
      clinicName: p.clinicName,
      address: p.address,
      districtId: p.districtId,
      areaId: p.areaId,
      lat: sql<number | null>`extensions.st_y(${p.location})`,
      lon: sql<number | null>`extensions.st_x(${p.location})`,
      phonePublic: p.phonePublic,
      availableNow: availableSql,
      availableUntil: p.availableUntil,
      emergency24x7: p.emergency24x7,
      homeVisit: p.homeVisit,
      photoPath: p.photoPath,
      completeness: p.completeness,
      rejectionReason: p.rejectionReason,
      ratingSum: p.ratingSum,
      ratingCount: p.ratingCount,
      consultCount: p.consultCount,
    })
    .from(p)
    .where(eq(p.profileId, profileId))
    .limit(1);
  if (!row) return null;
  const [speciesRows, documents] = await Promise.all([
    db()
      .select({ id: schema.providerSpecies.speciesId })
      .from(schema.providerSpecies)
      .where(eq(schema.providerSpecies.providerId, row.id)),
    db()
      .select({
        id: schema.providerDocuments.id,
        kind: schema.providerDocuments.kind,
        path: schema.providerDocuments.path,
        createdAt: schema.providerDocuments.createdAt,
      })
      .from(schema.providerDocuments)
      .where(eq(schema.providerDocuments.providerId, row.id))
      .orderBy(asc(schema.providerDocuments.createdAt)),
  ]);
  return {
    ...row,
    lat: row.lat === null ? null : Number(row.lat),
    lon: row.lon === null ? null : Number(row.lon),
    availableNow: Boolean(row.availableNow),
    photoUrl: mediaUrl(row.photoPath),
    speciesIds: speciesRows.map((s) => s.id),
    documents,
  };
}

/** Last 30 days of views, call taps and paid chats for the vet dashboard. */
export async function vetStats(providerId: string): Promise<{ views: number; calls: number; chats: number }> {
  const t = schema.providerStatsDaily;
  const [row] = await db()
    .select({
      views: sql<number>`coalesce(sum(${t.views}), 0)::int`,
      calls: sql<number>`coalesce(sum(${t.calls}), 0)::int`,
      chats: sql<number>`coalesce(sum(${t.chats}), 0)::int`,
    })
    .from(t)
    .where(and(eq(t.providerId, providerId), sql`${t.day} > (now() at time zone 'Asia/Dhaka')::date - 30`));
  return { views: Number(row?.views ?? 0), calls: Number(row?.calls ?? 0), chats: Number(row?.chats ?? 0) };
}

/** The vet's current and past featured periods (paid or manual). */
export async function myFeatured(providerId: string) {
  return db()
    .select({
      id: schema.featuredSlots.id,
      startsAt: schema.featuredSlots.startsAt,
      endsAt: schema.featuredSlots.endsAt,
      source: schema.featuredSlots.source,
    })
    .from(schema.featuredSlots)
    .where(
      and(
        eq(schema.featuredSlots.providerId, providerId),
        lte(schema.featuredSlots.startsAt, sql`now() + interval '1 year'`),
      ),
    )
    .orderBy(desc(schema.featuredSlots.endsAt))
    .limit(20);
}

/** Verified vet slugs for the sitemap. */
export async function verifiedVetSlugs() {
  return db()
    .select({ slug: schema.providers.slug, updatedAt: schema.providers.updatedAt })
    .from(schema.providers)
    .where(eq(schema.providers.status, "verified"))
    .limit(10_000);
}
