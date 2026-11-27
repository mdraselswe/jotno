"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { business } from "@/config";
import { articlePath, districtPath, ROUTES, vetPath } from "@/config/routes";
import { DISTRICTS } from "@/content/geo";
import { districtSlug } from "@/content/places";
import { actionViewer, setRole, type Role } from "@/features/auth/server";
import { notify } from "@/features/notifications/server";
import { canPayout, vetBalance } from "@/features/payments";
import { refundConsult, refundPlatform } from "@/features/payments/server";
import { missingDocs } from "@/features/providers";
import { formatter, translator, type MessageKey } from "@/i18n";
import { db, schema } from "@/infrastructure/db";
import { audit } from "@/infrastructure/db/helpers";
import { announcePages } from "@/infrastructure/indexnow";
import { supabaseAdmin } from "@/infrastructure/supabase/server";
import { localeHref } from "@/lib/locale-href";
import { taka } from "@/lib/money";
import { RESTORE_ACTION, restorable, toCopy } from "../restore";
import { VERIFIABLE_STATUSES, VERIFY_CHECKS, verifyBlock, verifyOverrides } from "../status";

const P = schema.providers;
export type AdminResult = { ok: true } | { ok: false; error: MessageKey };
const uuid = z.uuid();

async function admin() {
  return actionViewer(["admin"]);
}

/** The vet's account and the language they use the app in (for pushes sent outside their own request). */
async function vetContact(providerId: string) {
  const [row] = await db()
    .select({ profileId: P.profileId, locale: schema.profiles.locale })
    .from(P)
    .innerJoin(schema.profiles, eq(schema.profiles.id, P.profileId))
    .where(eq(P.id, providerId))
    .limit(1);
  return row ?? null;
}

/** The language someone uses the app in (pushes go out in it). */
async function localeOf(profileId: string): Promise<string> {
  const [row] = await db()
    .select({ locale: schema.profiles.locale })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return row?.locale ?? "bn";
}

/** A reason the person sees (and the audit log keeps): 3 to 300 letters once trimmed. */
const reasonSchema = z.string().trim().min(3).max(300);

const checksSchema = z.array(z.enum(VERIFY_CHECKS)).max(VERIFY_CHECKS.length);

/**
 * Verify a vet: anyone not verified yet (see `verifyBlock`). `checks` are what the
 * admin ticked; the audit log keeps them, and notes when the normal review was
 * skipped (never sent, sent back, or the BVC certificate or NID missing).
 */
export async function verifyProvider(
  providerId: string,
  checks: readonly string[] = [],
): Promise<AdminResult> {
  const me = await admin();
  const ticked = checksSchema.safeParse([...new Set(checks)]);
  if (!me || !uuid.safeParse(providerId).success || !ticked.success)
    return { ok: false, error: "common.notAllowed" };
  const [current] = await db()
    .select({
      status: P.status,
      docKinds: sql<
        string[]
      >`(select coalesce(array_agg(distinct d.kind), '{}') from ${schema.providerDocuments} d where d.provider_id = ${P.id})`,
    })
    .from(P)
    .where(eq(P.id, providerId))
    .limit(1);
  if (!current) return { ok: false, error: "common.notAllowed" };
  const missing = missingDocs(current.docKinds);
  const override = verifyOverrides(current.status, missing);
  const block = verifyBlock(current.status);
  if (block) return { ok: false, error: block };
  const [done] = await db()
    .update(P)
    .set({ status: "verified", verifiedAt: new Date(), rejectionReason: null })
    .where(and(eq(P.id, providerId), inArray(P.status, [...VERIFIABLE_STATUSES])))
    .returning({ id: P.id, slug: P.slug, districtId: P.districtId, isDemo: P.isDemo });
  // Someone changed the status in the meantime.
  if (!done) return { ok: false, error: "common.genericError" };
  if (!done.isDemo) {
    // A new public profile (and maybe a district page that now has a vet): tell search engines.
    const district = DISTRICTS.find((d) => d.id === done.districtId);
    const routes = [vetPath(done.slug), ...(district ? [districtPath(districtSlug(district))] : [])];
    after(() => announcePages(routes));
  }
  await audit(me.id, "provider.verify", "provider", providerId, {
    checks: ticked.data,
    ...(override.length ? { override, missingDocs: missing } : {}),
  });
  const vet = await vetContact(providerId);
  if (vet) {
    const t = translator(vet.locale);
    await notify(vet.profileId, "vet.verified", {
      title: t("adminui.push.verifiedTitle"),
      body: t("adminui.push.verifiedBody"),
      url: localeHref(vet.locale, ROUTES.dashboard),
      tag: "vet-status",
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectProvider(providerId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(providerId).success) return { ok: false, error: "common.notAllowed" };
  const why = reasonSchema.safeParse(reason);
  if (!why.success) return { ok: false, error: "adminui.reasonShort" };
  const text = why.data;
  await db().update(P).set({ status: "rejected", rejectionReason: text }).where(eq(P.id, providerId));
  await audit(me.id, "provider.reject", "provider", providerId, { reason: text });
  const vet = await vetContact(providerId);
  if (vet)
    await notify(vet.profileId, "vet.rejected", {
      title: translator(vet.locale)("adminui.push.rejectedTitle"),
      body: text,
      url: localeHref(vet.locale, ROUTES.dashboard),
      tag: "vet-status",
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function suspendProvider(providerId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(providerId).success) return { ok: false, error: "common.notAllowed" };
  const why = reasonSchema.safeParse(reason);
  if (!why.success) return { ok: false, error: "adminui.reasonShort" };
  await db()
    .update(P)
    .set({ status: "suspended", availableNow: false, rejectionReason: why.data })
    .where(eq(P.id, providerId));
  await audit(me.id, "provider.suspend", "provider", providerId, { reason: why.data });
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

const PAYOUT_METHOD_LABEL: Record<z.infer<typeof payoutSchema>["method"], MessageKey> = {
  bkash: "pay.method.bkash",
  nagad: "pay.method.nagad",
  bank: "adminui.payout.bank",
};

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
  const vet = await vetContact(v.providerId);
  if (vet) {
    // In the vet's own language, not the admin's.
    const t = translator(vet.locale);
    await notify(vet.profileId, "vet.payout", {
      title: t("adminui.push.payoutTitle"),
      body: t("adminui.push.payoutBody", {
        amount: taka(formatter(vet.locale), v.amount),
        method: t(PAYOUT_METHOD_LABEL[v.method]),
        ref: v.reference,
      }),
      url: localeHref(vet.locale, ROUTES.vetEarnings),
      tag: "payout",
    });
  }
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

/**
 * Close a report; with `hide`, also take the content down. A question is
 * hidden; an answer or a review is deleted (an answer's helpful votes go with
 * it), but the audit entry keeps a full copy so `restoreHidden` can put it back.
 */
export async function resolveReport(id: string, hide: boolean): Promise<AdminResult> {
  const me = await admin();
  if (!me || !uuid.safeParse(id).success) return { ok: false, error: "common.notAllowed" };
  const meta = await db().transaction(async (tx) => {
    const [report] = await tx
      .update(schema.reports)
      .set({ resolvedAt: new Date() })
      .where(eq(schema.reports.id, id))
      .returning();
    const base: Record<string, unknown> = { entity: report?.entity, entityId: report?.entityId };
    if (!report || !hide) return base;
    if (report.entity === "question") {
      const Q = schema.questions;
      const [before] = await tx
        .select({ id: Q.id, status: Q.status })
        .from(Q)
        .where(eq(Q.id, report.entityId))
        .limit(1);
      await tx.update(Q).set({ status: "hidden" }).where(eq(Q.id, report.entityId));
      return before && before.status !== "hidden" ? { ...base, copy: before } : base;
    }
    if (report.entity === "answer") {
      const AN = schema.answers;
      const [row] = await tx.delete(AN).where(eq(AN.id, report.entityId)).returning();
      if (!row) return base;
      await tx
        .update(schema.questions)
        .set({
          answerCount: sql`greatest(${schema.questions.answerCount} - 1, 0)`,
          // Its last answer gone: the question is open again.
          status: sql`case when ${schema.questions.answerCount} <= 1 and ${schema.questions.status} = 'answered' then 'open' else ${schema.questions.status} end`,
        })
        .where(eq(schema.questions.id, row.questionId));
      return { ...base, copy: toCopy(row) };
    }
    if (report.entity === "review") {
      const R = schema.reviews;
      const [row] = await tx.delete(R).where(eq(R.id, report.entityId)).returning();
      if (!row) return base;
      await tx
        .update(P)
        .set({
          ratingSum: sql`greatest(${P.ratingSum} - ${row.rating}, 0)`,
          ratingCount: sql`greatest(${P.ratingCount} - 1, 0)`,
        })
        .where(eq(P.id, row.providerId));
      return { ...base, copy: toCopy(row) };
    }
    return base;
  });
  await audit(me.id, hide ? "report.hide" : "report.dismiss", "report", id, meta);
  revalidatePath("/", "layout");
  return { ok: true };
}

async function rowExists(table: "questions" | "providers" | "profiles" | "consults", id: string) {
  const T = schema[table];
  const [row] = await db().select({ id: T.id }).from(T).where(eq(T.id, id)).limit(1);
  return Boolean(row);
}

/**
 * Admin: put back content a report hid, from its audit entry. The row comes
 * back with its original id if what it belonged to (the question, the vet, the
 * reviewer) still exists and nothing has taken its place. Helpful votes deleted
 * with an answer stay gone.
 */
export async function restoreHidden(auditId: number): Promise<AdminResult> {
  const me = await admin();
  if (!me || me.role !== "admin" || !Number.isSafeInteger(auditId) || auditId < 1)
    return { ok: false, error: "common.notAllowed" };
  const A = schema.auditLog;
  const [entry] = await db()
    .select({ action: A.action, meta: A.meta })
    .from(A)
    .where(eq(A.id, auditId))
    .limit(1);
  const hidden = entry ? restorable(entry.action, entry.meta) : null;
  if (!hidden) return { ok: false, error: "adminui.restore.noCopy" };
  const [again] = await db()
    .select({ id: A.id })
    .from(A)
    .where(and(eq(A.action, RESTORE_ACTION), sql`${A.meta}->>'auditId' = ${String(auditId)}`))
    .limit(1);
  if (again) return { ok: false, error: "adminui.restore.already" };

  let error: MessageKey | null = null;
  if (hidden.entity === "question") {
    const Q = schema.questions;
    const [back] = await db()
      .update(Q)
      .set({ status: hidden.copy.status })
      .where(and(eq(Q.id, hidden.copy.id), eq(Q.status, "hidden")))
      .returning({ id: Q.id });
    if (!back)
      error = (await rowExists("questions", hidden.copy.id))
        ? "adminui.restore.taken"
        : "adminui.restore.gone";
  } else if (hidden.entity === "answer") {
    const c = hidden.copy;
    const AN = schema.answers;
    if (!(await rowExists("questions", c.questionId)) || !(await rowExists("providers", c.providerId)))
      error = "adminui.restore.gone";
    else
      error = await db().transaction(async (tx): Promise<MessageKey | null> => {
        // The vet may have answered the same question again since (one answer each).
        const [newer] = await tx
          .select({ id: AN.id })
          .from(AN)
          .where(and(eq(AN.questionId, c.questionId), eq(AN.providerId, c.providerId)))
          .limit(1);
        if (newer) return "adminui.restore.taken";
        const [back] = await tx
          .insert(AN)
          .values({ ...c, helpfulCount: 0 })
          .onConflictDoNothing()
          .returning({ id: AN.id });
        if (!back) return "adminui.restore.taken";
        await tx
          .update(schema.questions)
          .set({
            answerCount: sql`${schema.questions.answerCount} + 1`,
            status: sql`case when ${schema.questions.status} = 'open' then 'answered' else ${schema.questions.status} end`,
          })
          .where(eq(schema.questions.id, c.questionId));
        return null;
      });
  } else {
    const c = hidden.copy;
    const R = schema.reviews;
    if (!(await rowExists("providers", c.providerId)) || !(await rowExists("profiles", c.ownerId)))
      error = "adminui.restore.gone";
    else {
      // A deleted consult sets a review's link to null; restore it the same way.
      const consultId = c.consultId && (await rowExists("consults", c.consultId)) ? c.consultId : null;
      error = await db().transaction(async (tx): Promise<MessageKey | null> => {
        // Same id, or one review per consult/visit already there: it can't come back.
        const [back] = await tx
          .insert(R)
          .values({ ...c, consultId })
          .onConflictDoNothing()
          .returning({ id: R.id });
        if (!back) return "adminui.restore.taken";
        await tx
          .update(P)
          .set({ ratingSum: sql`${P.ratingSum} + ${c.rating}`, ratingCount: sql`${P.ratingCount} + 1` })
          .where(eq(P.id, c.providerId));
        return null;
      });
    }
  }
  if (error) return { ok: false, error };
  await audit(me.id, RESTORE_ACTION, hidden.entity, hidden.entityId, { auditId: String(auditId) });
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
    .returning({ providerId: AR.providerId, title: AR.title, slug: AR.slug });
  if (!row) return { ok: false, error: "common.notAllowed" };
  if (publish) after(() => announcePages([articlePath(row.slug)]));
  await audit(me.id, publish ? "article.publish" : "article.unpublish", "article", articleId);
  if (!publish) {
    const vet = await vetContact(row.providerId);
    if (vet)
      await notify(vet.profileId, "article.unpublished", {
        title: translator(vet.locale)("adminui.push.articleDownTitle"),
        body: row.title,
        url: localeHref(vet.locale, ROUTES.vetArticles),
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
  const why = reason.trim().slice(0, 200);
  if (!me || me.role !== "admin" || !uuid.safeParse(id).success)
    return { ok: false, error: "common.notAllowed" };
  const A = schema.appointments;
  const [row] = await db()
    .update(A)
    .set({ status: "cancelled" })
    .where(and(eq(A.id, id), sql`${A.status} in ('pending_payment', 'confirmed')`))
    .returning({ ownerId: A.ownerId, providerId: A.providerId, startsAt: A.startsAt });
  if (!row) return { ok: false, error: "common.notAllowed" };
  const refunded = await refundPlatform("appointment", id, why || "cancelled by Jotno", me.id);
  await audit(me.id, "appointment.admin_cancel", "appointment", id, { reason: why, refunded });
  // Each side hears it in their own language.
  const note = (locale: string) => {
    const t = translator(locale);
    return {
      title: t("adminui.push.visitCancelledTitle"),
      body: refunded
        ? t("adminui.push.visitCancelledRefund", { reason: why || t("adminui.push.visitCancelledTitle") })
        : why || t("adminui.push.visitCancelledTitle"),
      tag: `appt-${id}`,
    };
  };
  const ownerLocale = await localeOf(row.ownerId);
  await notify(row.ownerId, "appointment.cancelled", {
    ...note(ownerLocale),
    url: localeHref(ownerLocale, ROUTES.appointments),
  });
  const vet = await vetContact(row.providerId);
  if (vet)
    await notify(vet.profileId, "appointment.cancelled", {
      ...note(vet.locale),
      url: localeHref(vet.locale, ROUTES.vetAppointments),
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

const readSchema = z.object({ consultId: z.uuid(), reason: z.string().trim().min(10).max(300) });

/**
 * Admin: read a consult's conversation. Only with a written reason (a complaint,
 * a refund dispute, a safety concern); the reason goes to the audit log and the
 * consult's timeline, and the access lasts 30 minutes.
 */
export async function openConsultTranscript(consultId: string, reason: string): Promise<AdminResult> {
  const me = await admin();
  const parsed = readSchema.safeParse({ consultId, reason });
  if (!me) return { ok: false, error: "common.notAllowed" };
  if (!parsed.success) return { ok: false, error: "monitor.reasonShort" };
  await audit(me.id, "consult.read", "consult", parsed.data.consultId, { reason: parsed.data.reason });
  return { ok: true };
}
