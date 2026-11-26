"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionViewer } from "@/features/auth/server";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { hasBangla, nameKey } from "@/lib/bangla-name";
import { bvcKey } from "@/lib/bvc";
import { BVC_DIVISIONS } from "../bvc-match";
import type { AdminResult } from "./actions";

const R = schema.bvcRegister;
/** Rows typed in by an admin (from a registration notice) share one source row. */
const MANUAL_HASH = "manual";

const entrySchema = z.object({
  regNo: z.string().trim().min(1).max(12),
  nameBn: z.string().trim().min(3).max(100),
  division: z.enum(BVC_DIVISIONS).nullable(),
  url: z.url().max(300).nullable(),
});
export type BvcEntryInput = z.input<typeof entrySchema>;

async function manualSource(): Promise<string> {
  const [row] = await db()
    .insert(schema.bvcSources)
    .values({ title: "Added by an admin", fileHash: MANUAL_HASH })
    .onConflictDoUpdate({ target: schema.bvcSources.fileHash, set: { fileHash: MANUAL_HASH } })
    .returning({ id: schema.bvcSources.id });
  if (!row) throw new Error("No manual BVC source");
  return row.id;
}

/**
 * Add a vet to the register by hand (a new registration notice), or correct a
 * row: the number decides which. The link to the notice goes in the audit log.
 */
export async function saveBvcEntry(input: BvcEntryInput): Promise<AdminResult> {
  const me = await actionViewer(["admin"]);
  const parsed = entrySchema.safeParse(input);
  if (!me || !parsed.success) return { ok: false, error: "common.notAllowed" };
  const v = parsed.data;
  const key = bvcKey(v.regNo);
  if (!key) return { ok: false, error: "adminui.bvc.badNumber" };
  if (!hasBangla(v.nameBn)) return { ok: false, error: "vetui.err.nidName" };
  const sourceId = await manualSource();
  const [before] = await db().select({ nameBn: R.nameBn }).from(R).where(eq(R.regKey, key)).limit(1);
  const row = {
    regKey: key,
    regNo: v.regNo,
    nameBn: v.nameBn,
    nameKey: nameKey(v.nameBn),
    division: v.division,
    sourceId,
    page: null,
  };
  await db()
    .insert(R)
    .values(row)
    .onConflictDoUpdate({ target: R.regKey, set: { ...row, updatedAt: new Date() } });
  await audit(me.id, before ? "bvc.edit" : "bvc.add", "bvc", key, {
    regNo: v.regNo,
    name: v.nameBn,
    ...(before ? { was: before.nameBn } : {}),
    url: v.url,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Take a row out of the register (typed in by mistake); the audit log keeps what it was. */
export async function removeBvcEntry(regKey: string): Promise<AdminResult> {
  const me = await actionViewer(["admin"]);
  if (!me || !/^\d{1,8}$/.test(regKey)) return { ok: false, error: "common.notAllowed" };
  const [gone] = await db()
    .delete(R)
    .where(eq(R.regKey, regKey))
    .returning({ regNo: R.regNo, nameBn: R.nameBn });
  if (!gone) return { ok: false, error: "common.genericError" };
  await audit(me.id, "bvc.remove", "bvc", regKey, { regNo: gone.regNo, name: gone.nameBn });
  revalidatePath("/", "layout");
  return { ok: true };
}
