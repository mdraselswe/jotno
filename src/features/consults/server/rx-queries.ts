import "server-only";
import { eq, inArray } from "drizzle-orm";
import type { RxItem } from "@/infrastructure/db/schema";
import { db, schema } from "@/infrastructure/db";
import { adminCanRead, participant } from "./participant";

export interface RxProduct {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  unit: string | null;
  price: number;
  inStock: boolean;
}

export interface PrescriptionView {
  consultId: string;
  role: "owner" | "vet" | "admin";
  writtenAt: Date;
  updatedAt: Date;
  diagnosis: string;
  items: (RxItem & { product: RxProduct | null })[];
  advice: string | null;
  followUpDays: number | null;
  vet: {
    displayName: string;
    title: string | null;
    qualifications: string | null;
    registrationBody: string;
    registrationNo: string | null;
    clinicName: string | null;
    address: string | null;
    phonePublic: string | null;
  };
  ownerName: string | null;
  pet: {
    name: string;
    speciesId: number | null;
    breedId: number | null;
    sex: string | null;
    birthDate: string | null;
    weightGrams: number | null;
  } | null;
  summary: string;
}

/** The prescription data the vet can edit (or null when none yet). Vet only. */
export async function rxForVet(consultId: string, vetId: string) {
  const p = await participant(consultId, vetId);
  if (!p || p.role !== "vet") return null;
  const [x] = await db()
    .select()
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.consultId, consultId))
    .limit(1);
  return x ?? null;
}

/** For the two people in the consult, or an admin holding a logged reading grant. */
export async function getPrescription(
  consultId: string,
  viewer: { id: string; role: string },
): Promise<PrescriptionView | null> {
  if (!/^[0-9a-f-]{36}$/.test(consultId)) return null;
  const p = await participant(consultId, viewer.id);
  const role =
    p?.role ?? (viewer.role === "admin" && (await adminCanRead(viewer.id, consultId)) ? "admin" : null);
  if (!role) return null;

  const [row] = await db()
    .select({
      x: schema.prescriptions,
      c: schema.consults,
      v: schema.providers,
      ownerName: schema.profiles.fullName,
    })
    .from(schema.prescriptions)
    .innerJoin(schema.consults, eq(schema.consults.id, schema.prescriptions.consultId))
    .innerJoin(schema.providers, eq(schema.providers.id, schema.prescriptions.providerId))
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.consults.ownerId))
    .where(eq(schema.prescriptions.consultId, consultId))
    .limit(1);
  if (!row) return null;

  const ids = row.x.items.map((i) => i.productId).filter((x): x is string => Boolean(x));
  const [products, pets] = await Promise.all([
    ids.length
      ? db()
          .select({
            id: schema.products.id,
            slug: schema.products.slug,
            nameEn: schema.products.nameEn,
            nameBn: schema.products.nameBn,
            unit: schema.products.unit,
            price: schema.products.price,
            stock: schema.products.stock,
            active: schema.products.active,
          })
          .from(schema.products)
          .where(inArray(schema.products.id, ids))
      : Promise.resolve([]),
    row.x.patientId
      ? db().select().from(schema.patients).where(eq(schema.patients.id, row.x.patientId)).limit(1)
      : Promise.resolve([]),
  ]);
  const byId = new Map(
    products
      .filter((pr) => pr.active)
      .map((pr) => [
        pr.id,
        {
          id: pr.id,
          slug: pr.slug,
          nameEn: pr.nameEn,
          nameBn: pr.nameBn,
          unit: pr.unit,
          price: pr.price,
          inStock: pr.stock > 0,
        },
      ]),
  );
  const pet = pets[0];
  return {
    consultId,
    role,
    writtenAt: row.x.createdAt,
    updatedAt: row.x.updatedAt,
    diagnosis: row.x.diagnosis,
    items: row.x.items.map((i) => ({ ...i, product: (i.productId && byId.get(i.productId)) || null })),
    advice: row.x.advice,
    followUpDays: row.x.followUpDays,
    vet: {
      displayName: row.v.displayName,
      title: row.v.title,
      qualifications: row.v.qualifications,
      registrationBody: row.v.registrationBody,
      registrationNo: row.v.registrationNo,
      clinicName: row.v.clinicName,
      address: row.v.address,
      phonePublic: row.v.phonePublic,
    },
    ownerName: row.ownerName,
    pet: pet
      ? {
          name: pet.name,
          speciesId: pet.speciesId,
          breedId: pet.breedId,
          sex: pet.sex,
          birthDate: pet.birthDate,
          weightGrams: pet.weightGrams,
        }
      : null,
    summary: row.c.summary,
  };
}
