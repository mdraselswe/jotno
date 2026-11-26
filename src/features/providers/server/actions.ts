"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { business } from "@/config";
import { LOCALES } from "@/config/locale";
import { adminVetPath, ROUTES, vetPath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify, notifyAdmins } from "@/features/notifications/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { storage } from "@/infrastructure/storage";
import { hasBangla, nameKey } from "@/lib/bangla-name";
import { localeHref } from "@/lib/locale-href";
import { payoutAccountSchema, type PayoutAccountInput } from "../payout-account";
import { payoutAccountKey } from "./payout-account";
import { refreshCompleteness } from "./queries";

const p = schema.providers;
export type VetResult = { ok: true } | { ok: false; error: MessageKey };

const money = z.coerce.number().int().min(0);
const profileSchema = z.object({
  displayName: z.string().trim().min(3).max(80),
  title: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  qualifications: z.string().trim().max(500).nullable().optional(),
  registrationNo: z.string().trim().max(40).nullable().optional(),
  nameNidBn: z.string().trim().max(100).nullable().optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).nullable().optional(),
  consultFee: money,
  visitFee: money,
  clinicName: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  districtId: z.coerce.number().int().positive().nullable(),
  areaId: z.coerce.number().int().positive().nullable(),
  lat: z.number().min(20).max(27).nullable().optional(),
  lon: z.number().min(88).max(93).nullable().optional(),
  phonePublic: z.string().trim().max(20).nullable().optional(),
  emergency24x7: z.boolean(),
  homeVisit: z.boolean(),
  photoPath: z.string().nullable().optional(),
  speciesIds: z.array(z.number().int().positive()).max(10),
});
export type VetProfileInput = z.input<typeof profileSchema>;

async function myProvider(profileId: string) {
  const [row] = await db()
    .select({
      id: p.id,
      status: p.status,
      photoPath: p.photoPath,
      slug: p.slug,
      displayName: p.displayName,
      registrationNo: p.registrationNo,
      nameNidBn: p.nameNidBn,
    })
    .from(p)
    .where(eq(p.profileId, profileId))
    .limit(1);
  return row ?? null;
}

export async function saveVetProfile(locale: string, input: VetProfileInput): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const mine = await myProvider(viewer.id);
  if (!mine) return { ok: false, error: "common.notAllowed" };
  return writeProfile(locale, mine, viewer.id, input, false);
}

/** Admin: edit any vet's profile (no re-review; the change is in the audit log). */
export async function adminSaveVetProfile(
  locale: string,
  providerId: string,
  input: VetProfileInput,
): Promise<VetResult> {
  const viewer = await actionViewer(["admin"]);
  if (!viewer || viewer.role !== "admin" || !z.uuid().safeParse(providerId).success)
    return { ok: false, error: "common.notAllowed" };
  const [row] = await db().select({ profileId: p.profileId }).from(p).where(eq(p.id, providerId)).limit(1);
  const target = row ? await myProvider(row.profileId) : null;
  if (!target) return { ok: false, error: "common.notAllowed" };
  const r = await writeProfile(locale, target, viewer.id, input, true);
  if (r.ok) {
    await audit(viewer.id, "provider.edit", "provider", providerId);
    revalidatePath(localeHref(locale, adminVetPath(providerId)));
  }
  return r;
}

async function writeProfile(
  locale: string,
  mine: NonNullable<Awaited<ReturnType<typeof myProvider>>>,
  actorId: string,
  input: VetProfileInput,
  byAdmin: boolean,
): Promise<VetResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "vet.invalid" };
  const v = parsed.data;
  if (v.consultFee < business.consult.minFee || v.consultFee > business.consult.maxFee)
    return { ok: false, error: "vet.feeRange" };
  if (v.nameNidBn && !hasBangla(v.nameNidBn)) return { ok: false, error: "vetui.err.nidName" };
  // A new photo must be one this person (the vet, or the admin editing) just uploaded.
  if (v.photoPath && v.photoPath !== mine.photoPath && !ownsUpload(v.photoPath, "vetPhoto", actorId))
    return { ok: false, error: "common.notAllowed" };

  const location =
    v.lat != null && v.lon != null
      ? sql`extensions.st_setsrid(extensions.st_makepoint(${v.lon}, ${v.lat}), 4326)`
      : v.areaId
        ? sql`(select extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326) from public.areas where id = ${v.areaId} and lat is not null)`
        : null;

  // The names and BVC number are what an admin checked against the register:
  // changing any of them sends a verified vet back to review.
  const same = (a: string | null | undefined, b: string | null | undefined) =>
    (a ?? "").replace(/\s+/g, " ").trim().toLowerCase() ===
    (b ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const recheck =
    !byAdmin &&
    mine.status === "verified" &&
    (!same(mine.registrationNo, v.registrationNo) ||
      !same(mine.displayName, v.displayName) ||
      !same(mine.nameNidBn, v.nameNidBn));

  await db()
    .update(p)
    .set({
      ...(recheck ? { status: "pending" as const } : {}),
      displayName: v.displayName,
      title: v.title || null,
      bio: v.bio || null,
      qualifications: v.qualifications || null,
      registrationNo: v.registrationNo || null,
      nameNidBn: v.nameNidBn || null,
      nameNidKey: nameKey(v.nameNidBn),
      experienceYears: v.experienceYears ?? null,
      consultFee: v.consultFee,
      visitFee: v.visitFee,
      clinicName: v.clinicName || null,
      address: v.address || null,
      districtId: v.districtId,
      areaId: v.areaId,
      location,
      phonePublic: v.phonePublic || null,
      emergency24x7: v.emergency24x7,
      homeVisit: v.homeVisit,
      photoPath: v.photoPath ?? null,
    })
    .where(eq(p.id, mine.id));

  await db().delete(schema.providerSpecies).where(eq(schema.providerSpecies.providerId, mine.id));
  if (v.speciesIds.length > 0) {
    await db()
      .insert(schema.providerSpecies)
      .values([...new Set(v.speciesIds)].map((speciesId) => ({ providerId: mine.id, speciesId })));
  }
  if (mine.photoPath && mine.photoPath !== v.photoPath) await storage.remove("media", [mine.photoPath]);
  await refreshCompleteness(mine.id);
  if (recheck) {
    await audit(actorId, "vet.recheck", "provider", mine.id, {
      from: { name: mine.displayName, bvc: mine.registrationNo, nidName: mine.nameNidBn },
      to: { name: v.displayName, bvc: v.registrationNo, nidName: v.nameNidBn },
    });
    await notifyAdmins("vet.recheck", {
      title: "Vet changed name or BVC number",
      body: `${v.displayName} · BVC ${v.registrationNo ?? "-"}: check again`,
      url: adminVetPath(mine.id),
      tag: `vet-${mine.id}`,
    });
  }
  revalidatePath(localeHref(locale, vetPath(mine.slug)));
  revalidatePath(localeHref(locale, ROUTES.vetProfile));
  return { ok: true };
}

const DOC_KINDS = ["bvc_certificate", "degree", "nid", "other"] as const;

export async function addVetDocument(kind: string, path: string): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const mine = await myProvider(viewer.id);
  if (!mine || !(DOC_KINDS as readonly string[]).includes(kind) || !ownsUpload(path, "vetDoc", viewer.id))
    return { ok: false, error: "common.notAllowed" };
  await db().insert(schema.providerDocuments).values({ providerId: mine.id, kind, path });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeVetDocument(id: string): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const mine = await myProvider(viewer.id);
  if (!mine) return { ok: false, error: "common.notAllowed" };
  const [row] = await db()
    .delete(schema.providerDocuments)
    .where(and(eq(schema.providerDocuments.id, id), eq(schema.providerDocuments.providerId, mine.id)))
    .returning({ path: schema.providerDocuments.path });
  if (row) await storage.remove("private", [row.path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Draft/rejected → pending. Needs the basics an admin checks against the BVC register. */
export async function submitForReview(locale: string): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const [row] = await db()
    .select({
      id: p.id,
      status: p.status,
      registrationNo: p.registrationNo,
      nameNidBn: p.nameNidBn,
      photoPath: p.photoPath,
      areaId: p.areaId,
      docs: sql<number>`(select count(*)::int from ${schema.providerDocuments} d where d.provider_id = "providers"."id")`,
      species: sql<number>`(select count(*)::int from ${schema.providerSpecies} s where s.provider_id = "providers"."id")`,
    })
    .from(p)
    .where(eq(p.profileId, viewer.id))
    .limit(1);
  if (!row || !["draft", "rejected"].includes(row.status)) return { ok: false, error: "common.notAllowed" };
  if (
    !row.registrationNo ||
    !row.nameNidBn ||
    !row.photoPath ||
    !row.areaId ||
    Number(row.docs) === 0 ||
    Number(row.species) === 0
  )
    return { ok: false, error: "vet.submitMissing" };
  await db()
    .update(p)
    .set({ status: "pending", submittedAt: new Date(), rejectionReason: null })
    .where(eq(p.id, row.id));
  await audit(viewer.id, "provider.submit", "provider", row.id);

  const admins = await db()
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.role, "admin"));
  await Promise.all(
    admins.map((a) =>
      notify(a.id, "admin.vet_pending", {
        title: "New vet to verify",
        body: viewer.fullName ?? "A vet submitted a profile",
        url: localeHref(locale, ROUTES.adminVets),
        tag: "vet-pending",
      }),
    ),
  );
  revalidatePath(localeHref(locale, ROUTES.dashboard));
  return { ok: true };
}

/** "Available now" for the next few hours (shows a green dot and ranks higher). */
export async function setAvailableNow(on: boolean): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  const until = new Date(Date.now() + business.availableHours * 3_600_000);
  const [row] = await db()
    .update(p)
    .set({ availableNow: on, availableUntil: on ? until : null, lastSeenAt: new Date() })
    .where(eq(p.profileId, viewer.id))
    .returning({ slug: p.slug });
  // Re-render the dashboard so the switch's server value (and "until") catch up;
  // without it useOptimistic falls back to the old value and the switch flips back.
  revalidatePath("/[locale]/dashboard", "page");
  if (row) revalidateAvailability(row.slug);
  return { ok: true };
}

/**
 * Every public page that shows a vet's live dot: their profile (each
 * language; the route file's path, since the default language is a rewrite),
 * the vet list, the emergency list and the home page's "online now".
 * These pages read the database per request today (no "use cache"), so this
 * mainly drops stale copies in the client router cache, and keeps them right
 * if they are ever cached.
 */
function revalidateAvailability(slug: string) {
  for (const locale of LOCALES) revalidatePath(`/${locale}${vetPath(slug)}`);
  revalidatePath("/[locale]/vets", "page");
  revalidatePath("/[locale]/emergency", "page");
  revalidatePath("/[locale]", "page");
}

/** Vet: where to send my earnings (bKash/Nagad number or bank account). Private to me and admins. */
export async function savePayoutAccount(input: PayoutAccountInput): Promise<VetResult> {
  const viewer = await actionViewer(["vet"]);
  if (!viewer) return { ok: false, error: "common.notAllowed" };
  // Only ever my own vet profile: the row is found by who is signed in.
  const mine = await myProvider(viewer.id);
  if (!mine) return { ok: false, error: "common.notAllowed" };
  const parsed = payoutAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "vet.invalid" };
  const key = payoutAccountKey(mine.id);
  await db()
    .insert(schema.settings)
    .values({ key, value: parsed.data, updatedBy: viewer.id })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: parsed.data, updatedBy: viewer.id, updatedAt: new Date() },
    });
  await audit(viewer.id, "provider.payout_account", "provider", mine.id, { method: parsed.data.method });
  revalidatePath("/[locale]/dashboard/earnings", "page");
  revalidatePath("/[locale]/admin/payouts", "page");
  return { ok: true };
}

/** Signed URL to view one of my own documents. */
export async function viewMyDocument(id: string): Promise<string | null> {
  const viewer = await actionViewer(["vet", "admin"]);
  if (!viewer) return null;
  const [row] = await db()
    .select({ path: schema.providerDocuments.path, profileId: p.profileId })
    .from(schema.providerDocuments)
    .innerJoin(p, eq(p.id, schema.providerDocuments.providerId))
    .where(eq(schema.providerDocuments.id, id))
    .limit(1);
  if (!row || (viewer.role !== "admin" && row.profileId !== viewer.id)) return null;
  return storage.signedUrl(row.path, 120);
}
