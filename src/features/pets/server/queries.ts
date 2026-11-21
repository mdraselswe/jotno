import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";

const { patients, healthRecords } = schema;

export type Pet = typeof patients.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;

export async function listPets(ownerId: string): Promise<Pet[]> {
  return db().select().from(patients).where(eq(patients.ownerId, ownerId)).orderBy(asc(patients.createdAt));
}

/** One of the owner's pets with its health records (newest first), or null. */
export async function getPet(
  ownerId: string,
  id: string,
): Promise<{ pet: Pet; records: HealthRecord[] } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [pet] = await db()
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.ownerId, ownerId)))
    .limit(1);
  if (!pet) return null;
  const records = await db()
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.patientId, id))
    .orderBy(desc(healthRecords.givenOn), desc(healthRecords.createdAt));
  return { pet, records };
}

/** Records due soon across all of an owner's pets (for the account home). */
export async function upcomingCare(ownerId: string) {
  return db()
    .select({
      id: healthRecords.id,
      petId: patients.id,
      petName: patients.name,
      kind: healthRecords.kind,
      title: healthRecords.title,
      dueOn: healthRecords.dueOn,
    })
    .from(healthRecords)
    .innerJoin(patients, eq(patients.id, healthRecords.patientId))
    .where(eq(patients.ownerId, ownerId))
    .orderBy(asc(healthRecords.dueOn))
    .limit(20);
}
