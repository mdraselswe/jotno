"use server";

import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { chatPath, prescriptionPath } from "@/config/routes";
import { actionViewer } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { rateLimit } from "@/infrastructure/db/helpers";
import { localeHref } from "@/lib/locale-href";
import { canWriteRx, rxSchema, withoutBlankRows, type RxInput } from "../prescription";
import { participant } from "./participant";

const X = schema.prescriptions;
const Pr = schema.products;

/** The vet writes (or updates) the consult's prescription. */
export async function savePrescription(
  locale: string,
  consultId: string,
  input: RxInput,
): Promise<{ ok: true } | { ok: false; error: MessageKey }> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const p = await participant(consultId, viewer.id);
  if (!p || p.role !== "vet") return { ok: false, error: "common.notAllowed" };
  if (!canWriteRx(p.c, new Date())) return { ok: false, error: "rx.closed" };
  const parsed = rxSchema.safeParse({ ...input, items: withoutBlankRows(input.items) });
  if (!parsed.success) return { ok: false, error: "rx.invalid" };
  if (!(await rateLimit(`rx:${viewer.id}`, 30, 600))) return { ok: false, error: "common.tooMany" };

  // Only keep shop links to products that exist.
  const wanted = parsed.data.items.map((i) => i.productId).filter((x): x is string => Boolean(x));
  const real = wanted.length
    ? new Set((await db().select({ id: Pr.id }).from(Pr).where(inArray(Pr.id, wanted))).map((r) => r.id))
    : new Set<string>();
  const items = parsed.data.items.map((i) => ({
    name: i.name,
    dose: i.dose,
    frequency: i.frequency,
    days: i.days,
    ...(i.note ? { note: i.note } : {}),
    productId: i.productId && real.has(i.productId) ? i.productId : null,
  }));

  const values = {
    diagnosis: parsed.data.diagnosis,
    items,
    advice: parsed.data.advice || null,
    followUpDays: parsed.data.followUpDays,
  };
  const [existing] = await db().select({ id: X.id }).from(X).where(eq(X.consultId, consultId)).limit(1);
  if (existing) {
    await db().update(X).set(values).where(eq(X.id, existing.id));
  } else {
    await db()
      .insert(X)
      .values({ ...values, consultId, providerId: p.c.providerId, patientId: p.c.patientId });
  }
  // A line in the chat (new or updated) with a link to the prescription.
  await db()
    .insert(schema.messages)
    .values({ consultId, senderId: null, body: existing ? "system:rx:updated" : "system:rx" });
  await notify(p.c.ownerId, "consult.prescription", {
    title: locale === "bn" ? "প্রেসক্রিপশন এসেছে" : "Your prescription is ready",
    body:
      locale === "bn"
        ? `${p.vetName} প্রেসক্রিপশন লিখেছেন। দেখুন, প্রিন্ট বা PDF করুন।`
        : `${p.vetName} wrote a prescription. View, print or save it as PDF.`,
    url: localeHref(locale, prescriptionPath(consultId)),
    tag: `rx-${consultId}`,
  });
  revalidatePath(localeHref(locale, chatPath(consultId)));
  revalidatePath(localeHref(locale, prescriptionPath(consultId)));
  return { ok: true };
}

/** The vet looks up shop products to link a medicine line to (so the owner can order it). */
export async function searchRxProducts(
  q: string,
): Promise<
  { id: string; nameEn: string; nameBn: string; unit: string | null; price: number; inStock: boolean }[]
> {
  const viewer = await actionViewer(["vet", "admin"]);
  const term = q.trim().slice(0, 60);
  if (!viewer || term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await db()
    .select({
      id: Pr.id,
      nameEn: Pr.nameEn,
      nameBn: Pr.nameBn,
      unit: Pr.unit,
      price: Pr.price,
      stock: Pr.stock,
    })
    .from(Pr)
    .where(and(eq(Pr.active, true), or(ilike(Pr.nameEn, like), ilike(Pr.nameBn, like), ilike(Pr.sku, like))))
    .limit(6);
  return rows.map((r) => ({ ...r, inStock: r.stock > 0 }));
}
