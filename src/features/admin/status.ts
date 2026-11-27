import type { BadgeTone } from "@/components/layout/app-ui";
import type { MessageKey } from "@/i18n";

/**
 * Which colour each state gets on the admin pages, so "pending" looks the same
 * everywhere: green = done/good, yellow = waiting on someone, red = stopped or
 * a problem, blue = live right now, grey = nothing to do.
 */
export function providerTone(status: string): BadgeTone {
  switch (status) {
    case "verified":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
    case "suspended":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * The statuses an admin can verify from: any vet not verified yet. The normal
 * path is a profile the vet sent for review (`pending`, which needs the BVC
 * certificate and NID) or a suspended vet coming back; an admin may still verify
 * anyone else, and the page warns and the audit log notes it (`verifyOverrides`).
 */
export const VERIFIABLE_STATUSES = ["draft", "pending", "rejected", "suspended"] as const;

/**
 * What an admin can tick before verifying a vet. Optional, but what was ticked
 * goes into the audit log with the verification, so the history shows how
 * each vet was checked. (Old entries may still hold "call", no longer offered.)
 */
export const VERIFY_CHECKS = ["certificate", "nid", "bvcSite"] as const;
export type VerifyCheck = (typeof VERIFY_CHECKS)[number];

/** Why Verify is off for a vet in this status, or null when it can be verified. */
export function verifyBlock(status: string): MessageKey | null {
  if ((VERIFIABLE_STATUSES as readonly string[]).includes(status)) return null;
  return status === "verified" ? "adminui.vet.verifyAlready" : "common.notAllowed";
}

/** How verifying now would skip the normal review: never sent, sent back, documents missing. */
export const VERIFY_OVERRIDES = ["draft", "rejected", "missingDocs"] as const;
export type VerifyOverride = (typeof VERIFY_OVERRIDES)[number];

/** The ways verifying a vet in `status`, missing `missingDocs`, skips the normal review. */
export function verifyOverrides(status: string, missingDocs: readonly string[]): VerifyOverride[] {
  const out: VerifyOverride[] = [];
  if (status === "draft" || status === "rejected") out.push(status);
  if (missingDocs.length) out.push("missingDocs");
  return out;
}

export function consultTone(status: string): BadgeTone {
  switch (status) {
    case "active":
      return "info";
    case "closed":
      return "success";
    case "refunded":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function appointmentTone(status: string): BadgeTone {
  switch (status) {
    case "confirmed":
      return "info";
    case "completed":
      return "success";
    case "pending_payment":
      return "warning";
    case "cancelled":
    case "no_show":
      return "danger";
    default:
      return "neutral";
  }
}

export function articleTone(status: string): BadgeTone {
  return status === "published" ? "success" : "neutral";
}

export function roleTone(role: string): BadgeTone {
  return role === "admin" ? "primary" : role === "vet" ? "info" : "neutral";
}

/** Audit actions that undo, block or take money back read red; approvals green. */
export function auditTone(action: string): BadgeTone {
  const verb = action.split(".").at(-1) ?? "";
  if (
    /^(delete|block|reject|suspend|refund|refunded|cancel|admin_cancel|hide|unpublish|rejected)$/.test(verb)
  )
    return "danger";
  if (/^(verify|paid|publish|unblock|record|add|create|restore)$/.test(verb)) return "success";
  if (verb === "read" || verb === "view") return "warning";
  return "neutral";
}

/** Search words for the audit filter: which action prefixes belong to each group. */
export const AUDIT_GROUPS = {
  all: [],
  people: ["user."],
  vets: ["provider.", "document.", "vet.", "featured.", "bvc."],
  care: ["consult.", "appointment.", "report."],
  money: ["payment.", "payout."],
  shop: ["order.", "product.", "stock.", "coupon.", "category."],
  content: ["article.", "settings."],
} as const satisfies Record<string, readonly string[]>;
export type AuditGroup = keyof typeof AUDIT_GROUPS;
export const AUDIT_GROUP_KEYS = Object.keys(AUDIT_GROUPS) as AuditGroup[];

/** A page number from the address (?page=2), at least 1, at most 500. */
export function pageParam(raw: string | undefined): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1;
}

/**
 * The address of a filtered admin list: drops empty values and defaults so
 * links stay short (`/admin/users/?role=vet&q=rahim`).
 */
export function listHref(
  base: string,
  params: Record<string, string | number | null | undefined>,
  defaults: Record<string, string | number> = {},
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    if (defaults[k] !== undefined && String(defaults[k]) === String(v)) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `${base}/?${s}` : base;
}
