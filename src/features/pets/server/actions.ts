"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { petPath, ROUTES } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { ownsUpload } from "@/features/uploads/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { storage } from "@/infrastructure/storage";
import { localeHref } from "@/lib/locale-href";
import { defaultDue, type HealthKind } from "@/features/health";

const { patients, healthRecords } = schema;
export type PetResult = { ok: true } | { ok: false; error: MessageKey };

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const petSchema = z.object({
  name: z.string().trim().min(1).max(40),
  speciesId: z.coerce.number().int().positive(),
  breedId: z.coerce.number().int().positive().nullable().optional(),
  sex: z.enum(["male", "female", "unknown"]),
  birthDate: day.nullable().optional(),
  weightKg: z.coerce.number().min(0).max(2000).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  photoPath: z.string().nullable().optional(),
});
export type PetInput = z.input<typeof petSchema>;

export async function savePet(locale: string, id: string | null, input: PetInput): Promise<PetResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = petSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "pets.invalid" };
  const v = parsed.data;
  if (v.photoPath && !ownsUpload(v.photoPath, "pet", viewer.id))
    return { ok: false, error: "common.notAllowed" };

  const values = {
    name: v.name,
    speciesId: v.speciesId,
    breedId: v.breedId ?? null,
    sex: v.sex,
    birthDate: v.birthDate ?? null,
    weightGrams: v.weightKg == null ? null : Math.round(v.weightKg * 1000),
    color: v.color || null,
    notes: v.notes || null,
    photoPath: v.photoPath ?? null,
  };

  let petId = id;
  if (id) {
    const [old] = await db()
      .select({ photoPath: patients.photoPath })
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.ownerId, viewer.id)))
      .limit(1);
    if (!old) return { ok: false, error: "common.notAllowed" };
    await db().update(patients).set(values).where(eq(patients.id, id));
    if (old.photoPath && old.photoPath !== values.photoPath) await storage.remove("media", [old.photoPath]);
  } else {
    const [row] = await db()
      .insert(patients)
      .values({ ...values, ownerId: viewer.id })
      .returning({ id: patients.id });
    petId = row?.id ?? null;
  }
  revalidatePath(localeHref(locale, ROUTES.pets));
  redirect(petId ? localeHref(locale, petPath(petId)) : localeHref(locale, ROUTES.pets));
}

export async function deletePet(locale: string, id: string): Promise<PetResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const [row] = await db()
    .delete(patients)
    .where(and(eq(patients.id, id), eq(patients.ownerId, viewer.id)))
    .returning({ photoPath: patients.photoPath });
  if (!row) return { ok: false, error: "common.notAllowed" };
  if (row.photoPath) await storage.remove("media", [row.photoPath]);
  redirect(localeHref(locale, ROUTES.pets));
}

const recordSchema = z.object({
  kind: z.enum(["vaccine", "deworm", "checkup"]),
  title: z.string().trim().min(1).max(80),
  givenOn: day,
  dueOn: day.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type RecordInput = z.input<typeof recordSchema>;

async function ownsPet(ownerId: string, petId: string) {
  const [row] = await db()
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, petId), eq(patients.ownerId, ownerId)))
    .limit(1);
  return Boolean(row);
}

export async function addHealthRecord(locale: string, petId: string, input: RecordInput): Promise<PetResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "health.invalid" };
  if (!(await ownsPet(viewer.id, petId))) return { ok: false, error: "common.notAllowed" };
  const v = parsed.data;
  await db()
    .insert(healthRecords)
    .values({
      patientId: petId,
      kind: v.kind,
      title: v.title,
      givenOn: v.givenOn,
      dueOn: v.dueOn ?? defaultDue(v.kind as HealthKind, v.givenOn),
      note: v.note || null,
    });
  revalidatePath(localeHref(locale, petPath(petId)));
  return { ok: true };
}

export async function deleteHealthRecord(
  locale: string,
  petId: string,
  recordId: string,
): Promise<PetResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  if (!(await ownsPet(viewer.id, petId))) return { ok: false, error: "common.notAllowed" };
  await db()
    .delete(healthRecords)
    .where(and(eq(healthRecords.id, recordId), eq(healthRecords.patientId, petId)));
  revalidatePath(localeHref(locale, petPath(petId)));
  return { ok: true };
}
