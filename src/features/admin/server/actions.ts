"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { business } from "@/config";
import { ROUTES } from "@/config/routes";
import { actionViewer, setRole, type Role } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { canPayout, vetBalance } from "@/features/payments";
import { refundConsult, refundPlatform } from "@/features/payments/server";
import type { MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { supabaseAdmin } from "@/infrastructure/supabase/server";

const P = schema.providers;
export type AdminResult = { ok: true } | { ok: false; error: MessageKey };
const uuid = z.uuid();

async function admin() {
  return actionViewer(["admin"]);
}

async function vetProfileId(providerId: string) {
  const [row] = await db().select({ profileId: P.profileId }).from(P).where(eq(P.id, providerId)).limit(1);
  return row?.profileId ?? null;
}

export async function verifyProvider(providerId: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(providerId).success) return { ok: false, error: "common.notAllowed" };
  await db()
    .update(P)
    .set({ status: "verified", verifiedAt: new Date(), rejectionReason: null })
    .where(eq(P.id, providerId));
  await audit(me.id, "provider.verify", "provider", providerId);
  const to = await vetProfileId(providerId);
  if (to)
    await notify(to, "vet.verified", {
      title: "You're verified on Jotno",
      body: "Pet owners can now find you and start chats.",
      url: ROUTES.dashboard,
      tag: "vet-status",
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectProvider(providerId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  const text = reason.trim().slice(0, 300);
  if (!me || !uuid.safeParse(providerId).success || text.length < 3)
    return { ok: false, error: "common.notAllowed" };
  await db().update(P).set({ status: "rejected", rejectionReason: text }).where(eq(P.id, providerId));
  await audit(me.id, "provider.reject", "provider", providerId, { reason: text });
  const to = await vetProfileId(providerId);
  if (to)
    await notify(to, "vet.rejected", {
      title: "Profile needs changes",
      body: text,
      url: ROUTES.dashboard,
      tag: "vet-status",
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function suspendProvider(providerId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(providerId).success) return { ok: false, error: "common.notAllowed" };
  await db()
    .update(P)
    .set({ status: "suspended", availableNow: false, rejectionReason: reason.trim().slice(0, 300) || null })
    .where(eq(P.id, providerId));
  await audit(me.id, "provider.suspend", "provider", providerId, { reason });
  revalidatePath("/", "layout");
  return { ok: true };
}

const featuredSchema = z.object({
  providerId: z.uuid(),
  districtId: z.number().int().positive().nullable(),
  days: z.number().int().min(1).max(90),
});

export async function addFeatured(input: z.input<typeof featuredSchema>): Promise<AdminResult> {
  const me = await admin();
  const parsed = featuredSchema.safeParse(input);
  if (!me || !parsed.success) return { ok: false, error: "common.notAllowed" };
  const { providerId, districtId, days } = parsed.data;
  if (districtId) {
    const [count] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.featuredSlots)
      .where(
        and(
          eq(schema.featuredSlots.districtId, districtId),
          sql`${schema.featuredSlots.endsAt} > now() and ${schema.featuredSlots.startsAt} <= now()`,
        ),
      );
    if (Number(count?.n ?? 0) >= business.featured.maxPerDistrict)
      return { ok: false, error: "admin.featuredFull" };
  }
  const now = new Date();
  const [slot] = await db()
    .insert(schema.featuredSlots)
    .values({
      providerId,
      districtId,
      startsAt: now,
      endsAt: new Date(now.getTime() + days * 86_400_000),
      source: "manual",
      createdBy: me.id,
    })
    .returning({ id: schema.featuredSlots.id });
  await audit(me.id, "featured.add", "featured", slot?.id ?? null, { providerId, districtId, days });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function endFeatured(id: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  await db().update(schema.featuredSlots).set({ endsAt: new Date() }).where(eq(schema.featuredSlots.id, id));
  await audit(me.id, "featured.end", "featured", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

const payoutSchema = z.object({
  providerId: z.uuid(),
  amount: z.number().int().positive(),
  method: z.enum(["bkash", "nagad", "bank"]),
  reference: z.string().trim().min(3).max(80),
});

/** Records a payout that was sent by hand (bKash/Nagad/bank) and debits the vet's ledger. */
export async function recordPayout(input: z.input<typeof payoutSchema>): Promise<AdminResult> {
  const me = await admin();
  const parsed = payoutSchema.safeParse(input);
  if (!me || !parsed.success) return { ok: false, error: "common.notAllowed" };
  const v = parsed.data;
  const rows = await db()
    .select({
      kind: schema.ledgerEntries.kind,
      amount: schema.ledgerEntries.amount,
      availableAt: schema.ledgerEntries.availableAt,
    })
    .from(schema.ledgerEntries)
    .where(
      and(
        eq(schema.ledgerEntries.providerId, v.providerId),
        sql`${schema.ledgerEntries.kind} in ('vet_payable','payout')`,
      ),
    );
  if (!canPayout(vetBalance(rows, new Date()), v.amount, 1))
    return { ok: false, error: "admin.payoutTooMuch" };
  const [payout] = await db()
    .insert(schema.payouts)
    .values({
      providerId: v.providerId,
      amount: v.amount,
      method: v.method,
      reference: v.reference,
      createdBy: me.id,
    })
    .returning({ id: schema.payouts.id });
  await db()
    .insert(schema.ledgerEntries)
    .values({
      kind: "payout",
      providerId: v.providerId,
      refId: payout?.id ?? null,
      amount: -v.amount,
      memo: `${v.method} ${v.reference}`,
    });
  await audit(me.id, "payout.record", "provider", v.providerId, {
    amount: v.amount,
    method: v.method,
    reference: v.reference,
  });
  const to = await vetProfileId(v.providerId);
  if (to)
    await notify(to, "vet.payout", {
      title: "Payout sent",
      body: `৳${v.amount / 100} via ${v.method} (${v.reference})`,
      url: ROUTES.vetEarnings,
      tag: "payout",
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminRefund(consultId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(consultId).success) return { ok: false, error: "common.notAllowed" };
  const done = await refundConsult(consultId, reason.trim() || "admin", me.id);
  revalidatePath("/", "layout");
  return done ? { ok: true } : { ok: false, error: "common.genericError" };
}

export async function resolveReport(id: string, hide: boolean): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  const [report] = await db()
    .update(schema.reports)
    .set({ resolvedAt: new Date() })
    .where(eq(schema.reports.id, id))
    .returning();
  if (report && hide) {
    if (report.entity === "question")
      await db()
        .update(schema.questions)
        .set({ status: "hidden" })
        .where(eq(schema.questions.id, report.entityId));
    if (report.entity === "answer")
      await db().delete(schema.answers).where(eq(schema.answers.id, report.entityId));
    if (report.entity === "review")
      await db().delete(schema.reviews).where(eq(schema.reviews.id, report.entityId));
  }
  await audit(me.id, hide ? "report.hide" : "report.dismiss", "report", id, {
    entity: report?.entity,
    entityId: report?.entityId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Signed URL to a vet's verification document (admins only). */
export async function adminDocumentUrl(documentId: string): Promise<string | null> {
  const me = await admin();
  if (!me || !uuid.safeParse(documentId).success) return null;
  const [doc] = await db()
    .select({ path: schema.providerDocuments.path })
    .from(schema.providerDocuments)
    .where(eq(schema.providerDocuments.id, documentId))
    .limit(1);
  if (!doc) return null;
  await audit(me.id, "document.view", "provider_document", documentId);
  const { storage } = await import("@/infrastructure/storage");
  return storage.signedUrl(doc.path, 120);
}

const ROLES = ["owner", "vet", "admin"] as const satisfies readonly Role[];

/**
 * Admin: change someone's role. A vet who stops being a vet is suspended, so
 * the profile leaves search; making someone a vet gives them a draft profile
 * the first time they open the dashboard.
 */
export async function changeUserRole(userId: string, role: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || me.role !== "admin" || !uuid.safeParse(userId).success)
    return { ok: false, error: "common.notAllowed" };
  if (userId === me.id) return { ok: false, error: "manage.notYourself" };
  if (!(ROLES as readonly string[]).includes(role)) return { ok: false, error: "common.notAllowed" };
  const [before] = await db()
    .select({ role: schema.profiles.role })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (!before) return { ok: false, error: "common.notAllowed" };
  if (before.role === role) return { ok: true };
  await setRole(userId, role as Role);
  if (before.role === "vet" && role === "owner")
    await db()
      .update(P)
      .set({ status: "suspended", availableNow: false })
      .where(and(eq(P.profileId, userId), eq(P.status, "verified")));
  await audit(me.id, "user.role", "profile", userId, { from: before.role, to: role });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin: block (or unblock) sign-in. A blocked person is signed out on their next page load. */
export async function setUserBlocked(userId: string, blocked: boolean): Promise<AdminResult> {
  const me = await admin();
  if (!me || me.role !== "admin" || !uuid.safeParse(userId).success)
    return { ok: false, error: "common.notAllowed" };
  if (userId === me.id) return { ok: false, error: "manage.notYourself" };
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
  });
  if (error) return { ok: false, error: "common.genericError" };
  if (blocked) await db().update(P).set({ availableNow: false }).where(eq(P.profileId, userId));
  await audit(me.id, blocked ? "user.block" : "user.unblock", "profile", userId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin: take an article down (back to draft) or put it back up. */
export async function setArticlePublished(articleId: string, publish: boolean): Promise<AdminResult> {
  const me = await admin();
  if (!me || me.role !== "admin" || !uuid.safeParse(articleId).success)
    return { ok: false, error: "common.notAllowed" };
  const AR = schema.articles;
  const [row] = await db()
    .update(AR)
    .set(
      publish
        ? { status: "published", publishedAt: sql`coalesce(${AR.publishedAt}, now())` }
        : { status: "draft" },
    )
    .where(eq(AR.id, articleId))
    .returning({ providerId: AR.providerId, title: AR.title });
  if (!row) return { ok: false, error: "common.notAllowed" };
  await audit(me.id, publish ? "article.publish" : "article.unpublish", "article", articleId);
  if (!publish) {
    const to = await vetProfileId(row.providerId);
    if (to)
      await notify(to, "article.unpublished", {
        title: "Your article was taken down",
        body: row.title,
        url: ROUTES.vetArticles,
        tag: `article-${articleId}`,
      });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminDeleteArticle(articleId: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || me.role !== "admin" || !uuid.safeParse(articleId).success)
    return { ok: false, error: "common.notAllowed" };
  const [row] = await db()
    .delete(schema.articles)
    .where(eq(schema.articles.id, articleId))
    .returning({ title: schema.articles.title });
  if (!row) return { ok: false, error: "common.notAllowed" };
  await audit(me.id, "article.delete", "article", articleId, { title: row.title });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin: cancel a visit for the vet or owner; a paid booking fee goes to the refund queue. */
export async function adminCancelAppointment(id: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  const why = reason.trim().slice(0, 200) || "cancelled by Jotno";
  if (!me || me.role !== "admin" || !uuid.safeParse(id).success)
    return { ok: false, error: "common.notAllowed" };
  const A = schema.appointments;
  const [row] = await db()
    .update(A)
    .set({ status: "cancelled" })
    .where(and(eq(A.id, id), sql`${A.status} in ('pending_payment', 'confirmed')`))
    .returning({ ownerId: A.ownerId, providerId: A.providerId, startsAt: A.startsAt });
  if (!row) return { ok: false, error: "common.notAllowed" };
  const refunded = await refundPlatform("appointment", id, why, me.id);
  await audit(me.id, "appointment.admin_cancel", "appointment", id, { reason: why, refunded });
  const note = {
    title: "Visit cancelled by Jotno",
    body: refunded ? `${why}. The booking fee will be refunded.` : why,
    tag: `appt-${id}`,
  };
  await notify(row.ownerId, "appointment.cancelled", { ...note, url: ROUTES.appointments });
  const vet = await vetProfileId(row.providerId);
  if (vet) await notify(vet, "appointment.cancelled", { ...note, url: ROUTES.vetAppointments });
  revalidatePath("/", "layout");
  return { ok: true };
}
