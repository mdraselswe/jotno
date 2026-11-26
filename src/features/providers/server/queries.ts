import "server-only";
import { and, asc, desc, eq, gt, ilike, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { business } from "@/config";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";
import { shortId, slugify } from "@/lib/slug";
import { completeness, RANK } from "../ranking";
import { withDoctorTitle } from "../vet-name";
import { DEFAULT_VET_SORT, type VetSort } from "../vet-sort";

const p = schema.providers;
const a = schema.areas;
const d = schema.districts;

/** Effective "available now": switched on and not expired. */
const availableSql = sql<boolean>`(${p.availableNow} and (${p.availableUntil} is null or ${p.availableUntil} > now()))`;

const speciesSlugsSql = sql<
  string[]
>`coalesce((select array_agg(s.slug order by s.sort) from ${schema.providerSpecies} ps join ${schema.species} s on s.id = ps.species_id where ps.provider_id = "providers"."id"), '{}')`;

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
  areaId: number | null;
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
  /** Has weekly clinic hours, so a visit can be booked. */
  hasSchedule: boolean;
}

const hasScheduleSql = sql<boolean>`exists (select 1 from ${schema.availability} av where av.provider_id = "providers"."id")`;

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
  hasSchedule: hasScheduleSql,
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
    areaId: number | null;
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
    hasSchedule: boolean;
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
    areaId: r.areaId ?? null,
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
    hasSchedule: Boolean(r.hasSchedule),
  };
}

export interface SearchInput {
  districtId?: number | null;
  /** With `districtId`: this area's vets come first (`areaTotal` says how many). */
  areaId?: number | null;
  species?: string | null;
  emergency?: boolean;
  /** Only vets who switched on "available now". */
  onlyAvailable?: boolean;
  near?: { lat: number; lon: number } | null;
  /** With `near`: only vets within this many km (their clinic location). */
  radiusKm?: number;
  q?: string | null;
  sort?: VetSort;
  /** Page `page` of `pageSize` (default: the first 12). */
  page?: number;
  pageSize?: number;
  /** A row window instead of a page: skip `offset` vets, return up to `limit` (max 300). */
  offset?: number;
  limit?: number;
}

/** A number we wrote ourselves, inlined into SQL (never user input). */
const num = (v: number) => sql.raw(String(v));

/** Bayesian average rating in SQL (see `bayesianRating`). */
const bayesSql = sql<number>`((${p.ratingSum} + ${num(RANK.priorRating)} * ${num(RANK.priorWeight)})::float8 / (${p.ratingCount} + ${num(RANK.priorWeight)}))`;

/**
 * `rankScore` (ranking.ts) as SQL, so the database can sort and page the
 * whole result. Species match is left out: it is the same for every row of a
 * species search, so it never changes the order.
 */
function rankScoreSql(o: { areaId: number | null; distanceKm: SQL | null; emergency: boolean }): SQL<number> {
  const parts: SQL[] = [
    sql`${bayesSql} / 5 * ${num(RANK.ratingPoints)}`,
    sql`least(${p.completeness}, 100)::float8 / 100 * ${num(RANK.completenessPoints)}`,
    sql`least(log((1 + ${p.consultCount})::float8) * ${num(RANK.consultFactor)}, ${num(RANK.consultMax)})`,
    sql`case when ${availableSql} then ${num(o.emergency ? RANK.availableEmergency : RANK.available)} else 0 end`,
    sql`case ${sql.join(
      RANK.seen.map(
        ([days, points]) =>
          sql`when ${p.lastSeenAt} > now() - ${num(days)} * interval '1 day' then ${num(points)}`,
      ),
      sql` `,
    )} else 0 end`,
  ];
  if (o.areaId) parts.push(sql`case when ${p.areaId} = ${o.areaId} then ${num(RANK.sameArea)} else 0 end`);
  if (o.distanceKm)
    parts.push(sql`greatest(0, ${num(RANK.nearMax)} - ${o.distanceKm} * ${num(RANK.nearPerKm)})`);
  if (o.emergency) parts.push(sql`case when ${p.emergency24x7} then ${num(RANK.emergency24x7)} else 0 end`);
  parts.push(
    sql`case when (select count(*) from referrals r where r.referrer_id = ${p.profileId} and r.status = 'ok' and r.first_paid_at is not null) >= ${num(business.referral.levels.platinum)} then ${num(RANK.topPromoter)} else 0 end`,
  );
  return sql<number>`round((${sql.join(parts, sql` + `)})::numeric, 2)`;
}

export interface SearchResult {
  /** Sponsored vets (not counted in `total`, never repeated in `results`). */
  featured: ProviderCard[];
  results: ProviderCard[];
  /** All matching organic vets. */
  total: number;
  /** With an area: how many of `total` are in it (they come first). Else null. */
  areaTotal: number | null;
}

/**
 * Verified vets for a search: sponsored ones (max a few per district, clearly
 * labelled) and one page of the organic list, sorted and paged by the
 * database ("recommended" is `rankScore`).
 */
export async function searchProviders(input: SearchInput): Promise<SearchResult> {
  // Filters on the vet itself: sponsored cards must match them too (district is the slot's scope there).
  const filters: SQL[] = [];
  if (input.species) {
    filters.push(
      sql`exists (select 1 from ${schema.providerSpecies} ps join ${schema.species} s on s.id = ps.species_id where ps.provider_id = ${p.id} and s.slug = ${input.species})`,
    );
  }
  if (input.emergency) {
    const either = or(availableSql, eq(p.emergency24x7, true));
    if (either) filters.push(either);
  }
  if (input.onlyAvailable) filters.push(availableSql);
  const q = input.q?.trim();
  if (q) {
    const like = or(ilike(p.displayName, `%${q}%`), ilike(p.clinicName, `%${q}%`));
    if (like) filters.push(like);
  }

  const near = input.near;
  const point = near
    ? sql`extensions.st_setsrid(extensions.st_makepoint(${near.lon}, ${near.lat}), 4326)::extensions.geography`
    : null;
  const distanceSql = point
    ? sql<number | null>`(extensions.st_distance(${p.location}::extensions.geography, ${point}) / 1000)`
    : null;
  if (point) {
    // Only vets with a clinic location inside the radius (uses the location index).
    filters.push(
      sql`extensions.st_dwithin(${p.location}::extensions.geography, ${point}, ${(input.radiusKm ?? 10) * 1000})`,
    );
  }
  const conds: SQL[] = [eq(p.status, "verified"), ...filters];
  if (input.districtId) conds.push(eq(p.districtId, input.districtId));

  // Sponsored vets show on their own, so the organic list leaves them out.
  const featured = input.emergency
    ? []
    : await featuredFor(input.districtId ?? null, input.species ?? null, filters);
  if (featured.length > 0)
    conds.push(
      notInArray(
        p.id,
        featured.map((f) => f.id),
      ),
    );
  const where = and(...conds);

  const areaId = input.districtId && input.areaId ? input.areaId : null;
  const inArea = areaId ? sql`coalesce(${p.areaId} = ${areaId}, false)` : null;
  const score = rankScoreSql({ areaId, distanceKm: distanceSql, emergency: Boolean(input.emergency) });
  const order: SQL[] = inArea ? [sql`${inArea} desc`] : [];
  switch (input.sort ?? DEFAULT_VET_SORT) {
    case "rating":
      order.push(sql`${bayesSql} desc`, desc(p.ratingCount));
      break;
    case "fee":
      order.push(asc(p.consultFee));
      break;
    case "experience":
      order.push(sql`${p.experienceYears} desc nulls last`);
      break;
    case "recommended":
      // Near me: nearest first (to the half km), best ranked among equals.
      if (distanceSql) order.push(sql`round(${distanceSql} * 2) asc`);
      // No place given: the owner wants a chat, so vets online now come first.
      else if (!input.districtId) order.push(sql`${availableSql} desc`);
      break;
  }
  order.push(sql`${score} desc`, asc(p.id));

  const size = Math.min(300, Math.max(1, input.limit ?? input.pageSize ?? 12));
  const offset = Math.max(0, input.offset ?? (Math.max(1, input.page ?? 1) - 1) * size);

  const [rows, counts] = await Promise.all([
    db()
      .select({ ...cardColumns, distanceKm: distanceSql ?? sql<number | null>`null` })
      .from(p)
      .leftJoin(a, eq(a.id, p.areaId))
      .leftJoin(d, eq(d.id, p.districtId))
      .where(where)
      .orderBy(...order)
      .limit(size)
      .offset(offset),
    db()
      .select({
        total: sql<number>`count(*)::int`,
        inArea: inArea ? sql<number>`(count(*) filter (where ${inArea}))::int` : sql<number>`0`,
      })
      .from(p)
      .where(where),
  ]);

  const count = counts[0];
  return {
    featured,
    results: rows.map((row) => toCard(row, row.distanceKm === null ? null : Number(row.distanceKm), false)),
    total: Number(count?.total ?? 0),
    areaTotal: areaId ? Number(count?.inArea ?? 0) : null,
  };
}

/**
 * Sponsored vets for a search: a slot for this district (or every district)
 * and species (or every species), and the vet must also pass the list's own
 * filters (`filters`: search text, available now, near me, species), so an
 * offline or non-matching vet never sits above "0 vets".
 */
async function featuredFor(
  districtId: number | null,
  speciesSlug: string | null,
  filters: readonly SQL[],
): Promise<ProviderCard[]> {
  const fs = schema.featuredSlots;
  const conds: SQL[] = [
    eq(p.status, "verified"),
    lte(fs.startsAt, sql`now()`),
    gt(fs.endsAt, sql`now()`),
    ...filters,
  ];
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
      featured: sql<boolean>`exists (select 1 from ${schema.featuredSlots} f where f.provider_id = "providers"."id" and f.starts_at <= now() and f.ends_at > now())`,
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
  const name = withDoctorTitle(displayName);
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

/**
 * Recomputes a vet's profile completeness (a search ranking input) from what
 * is stored. Call it after anything that changes an input: the profile, the
 * species, the weekly hours.
 */
export async function refreshCompleteness(providerId: string): Promise<void> {
  const [row] = await db()
    .select({
      photoPath: p.photoPath,
      bio: p.bio,
      qualifications: p.qualifications,
      registrationNo: p.registrationNo,
      experienceYears: p.experienceYears,
      clinicName: p.clinicName,
      address: p.address,
      areaId: p.areaId,
      hasLocation: sql<boolean>`${p.location} is not null`,
      phonePublic: p.phonePublic,
      speciesCount: sql<number>`(select count(*)::int from ${schema.providerSpecies} ps where ps.provider_id = "providers"."id")`,
      hasAvailability: hasScheduleSql,
    })
    .from(p)
    .where(eq(p.id, providerId))
    .limit(1);
  if (!row) return;
  const { score } = completeness({ ...row, speciesCount: Number(row.speciesCount) });
  await db().update(p).set({ completeness: score }).where(eq(p.id, providerId));
}
