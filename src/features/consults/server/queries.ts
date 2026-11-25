import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { mediaUrl } from "@/infrastructure/storage";
import { roleIn, type ConsultRole } from "../rules";

const C = schema.consults;
const M = schema.messages;
const Pv = schema.providers;

/** The vet's photo: the profile photo, else the account photo they uploaded. */
const vetPhotoPath = sql<
  string | null
>`coalesce(${Pv.photoPath}, (select avatar_path from profiles vp where vp.id = ${Pv.profileId}))`;

export interface ChatMessage {
  id: string;
  senderId: string | null;
  body: string | null;
  hasImage: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ConsultView {
  id: string;
  status: (typeof C.$inferSelect)["status"];
  kind: (typeof C.$inferSelect)["kind"];
  fee: number;
  summary: string;
  openedAt: Date | null;
  firstReplyAt: Date | null;
  closesAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  role: Exclude<ConsultRole, null> | "admin";
  ownerId: string;
  ownerName: string | null;
  ownerPhotoUrl: string | null;
  vet: { id: string; profileId: string; displayName: string; slug: string; photoUrl: string | null };
  pet: {
    id: string;
    name: string;
    speciesId: number | null;
    breedId: number | null;
    birthDate: string | null;
    weightGrams: number | null;
    notes: string | null;
  } | null;
  messages: ChatMessage[];
  reviewed: boolean;
}

export const toChatMessage = (m: typeof M.$inferSelect): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  body: m.body,
  hasImage: Boolean(m.imagePath),
  readAt: m.readAt?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
});

/** A consult for one of its two participants (or an admin, read-only). */
export async function getConsult(
  id: string,
  viewer: { id: string; role: string },
): Promise<ConsultView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db()
    .select({
      c: C,
      vetProfileId: Pv.profileId,
      vetName: Pv.displayName,
      vetSlug: Pv.slug,
      vetPhoto: vetPhotoPath,
      ownerName: schema.profiles.fullName,
      ownerPhoto: schema.profiles.avatarPath,
    })
    .from(C)
    .innerJoin(Pv, eq(Pv.id, C.providerId))
    .leftJoin(schema.profiles, eq(schema.profiles.id, C.ownerId))
    .where(eq(C.id, id))
    .limit(1);
  if (!row) return null;
  const role = roleIn({ ownerId: row.c.ownerId, providerProfileId: row.vetProfileId }, viewer.id);
  if (!role && viewer.role !== "admin") return null;

  const [messages, petRows, review] = await Promise.all([
    db().select().from(M).where(eq(M.consultId, id)).orderBy(asc(M.createdAt)),
    row.c.patientId
      ? db().select().from(schema.patients).where(eq(schema.patients.id, row.c.patientId)).limit(1)
      : Promise.resolve([]),
    db()
      .select({ id: schema.reviews.id })
      .from(schema.reviews)
      .where(eq(schema.reviews.consultId, id))
      .limit(1),
  ]);
  const pet = petRows[0];
  return {
    id: row.c.id,
    status: row.c.status,
    kind: row.c.kind,
    fee: row.c.fee,
    summary: row.c.summary,
    openedAt: row.c.openedAt,
    firstReplyAt: row.c.firstReplyAt,
    closesAt: row.c.closesAt,
    closedAt: row.c.closedAt,
    createdAt: row.c.createdAt,
    role: role ?? "admin",
    ownerId: row.c.ownerId,
    ownerName: row.ownerName,
    ownerPhotoUrl: mediaUrl(row.ownerPhoto),
    vet: {
      id: row.c.providerId,
      profileId: row.vetProfileId,
      displayName: row.vetName,
      slug: row.vetSlug,
      photoUrl: mediaUrl(row.vetPhoto),
    },
    pet: pet
      ? {
          id: pet.id,
          name: pet.name,
          speciesId: pet.speciesId,
          breedId: pet.breedId,
          birthDate: pet.birthDate,
          weightGrams: pet.weightGrams,
          notes: pet.notes,
        }
      : null,
    messages: messages.map(toChatMessage),
    reviewed: review.length > 0,
  };
}

export interface LastMessage {
  body: string | null;
  hasImage: boolean;
  /** Sent by the person viewing the list. */
  mine: boolean;
  at: Date;
}

export interface ConsultListItem {
  id: string;
  status: (typeof C.$inferSelect)["status"];
  summary: string;
  fee: number;
  createdAt: Date;
  firstReplyAt: Date | null;
  otherName: string | null;
  otherPhoto: string | null;
  unread: number;
  /** The newest message or call line, for the inbox preview. */
  last: LastMessage | null;
}

/** The newest real message or call line of each consult (system notices skipped). */
const lastFor = async (consultIds: string[], viewerId: string) => {
  const map = new Map<string, LastMessage>();
  if (consultIds.length === 0) return map;
  const rows = await db()
    .selectDistinctOn([M.consultId], {
      consultId: M.consultId,
      senderId: M.senderId,
      body: M.body,
      imagePath: M.imagePath,
      createdAt: M.createdAt,
    })
    .from(M)
    .where(
      and(
        inArray(M.consultId, consultIds),
        sql`(${M.senderId} is not null or ${M.body} like 'system:call:%')`,
      ),
    )
    .orderBy(M.consultId, desc(M.createdAt));
  for (const r of rows)
    map.set(r.consultId, {
      body: r.body,
      hasImage: r.imagePath !== null,
      mine: r.senderId === viewerId,
      at: r.createdAt,
    });
  return map;
};

/** Newest activity first: the last message, else when the chat was made. */
const byActivity = (a: ConsultListItem, b: ConsultListItem) =>
  (b.last?.at ?? b.createdAt).getTime() - (a.last?.at ?? a.createdAt).getTime();

const unreadFor = async (consultIds: string[], viewerId: string) => {
  if (consultIds.length === 0) return new Map<string, number>();
  const rows = await db()
    .select({ consultId: M.consultId, senderId: M.senderId, readAt: M.readAt })
    .from(M)
    .where(inArray(M.consultId, consultIds));
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.senderId && r.senderId !== viewerId && !r.readAt)
      map.set(r.consultId, (map.get(r.consultId) ?? 0) + 1);
  }
  return map;
};

export async function listOwnerConsults(ownerId: string): Promise<ConsultListItem[]> {
  const rows = await db()
    .select({ c: C, name: Pv.displayName, photo: vetPhotoPath })
    .from(C)
    .innerJoin(Pv, eq(Pv.id, C.providerId))
    .where(and(eq(C.ownerId, ownerId), inArray(C.status, ["active", "closed", "refunded"])))
    .orderBy(desc(C.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.c.id);
  const [unread, last] = await Promise.all([unreadFor(ids, ownerId), lastFor(ids, ownerId)]);
  return rows
    .map((r) => ({
      id: r.c.id,
      status: r.c.status,
      summary: r.c.summary,
      fee: r.c.fee,
      createdAt: r.c.createdAt,
      firstReplyAt: r.c.firstReplyAt,
      otherName: r.name,
      otherPhoto: mediaUrl(r.photo),
      unread: unread.get(r.c.id) ?? 0,
      last: last.get(r.c.id) ?? null,
    }))
    .sort(byActivity);
}

export async function listVetConsults(
  providerId: string,
  vetProfileId: string,
  onlyWaiting = false,
): Promise<ConsultListItem[]> {
  const rows = await db()
    .select({ c: C, name: schema.profiles.fullName, photo: schema.profiles.avatarPath })
    .from(C)
    .leftJoin(schema.profiles, eq(schema.profiles.id, C.ownerId))
    .where(
      and(
        eq(C.providerId, providerId),
        onlyWaiting ? eq(C.status, "active") : inArray(C.status, ["active", "closed", "refunded"]),
      ),
    )
    .orderBy(desc(C.createdAt))
    .limit(100);
  const ids = rows.map((r) => r.c.id);
  const [unread, last] = await Promise.all([unreadFor(ids, vetProfileId), lastFor(ids, vetProfileId)]);
  const items = rows.map((r) => ({
    id: r.c.id,
    status: r.c.status,
    summary: r.c.summary,
    fee: r.c.fee,
    createdAt: r.c.createdAt,
    firstReplyAt: r.c.firstReplyAt,
    otherName: r.name,
    otherPhoto: mediaUrl(r.photo),
    unread: unread.get(r.c.id) ?? 0,
    last: last.get(r.c.id) ?? null,
  }));
  items.sort(byActivity);
  return onlyWaiting ? items.filter((i) => !i.firstReplyAt || i.unread > 0) : items;
}
