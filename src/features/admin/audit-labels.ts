import type { MessageKey, Translate } from "@/i18n";

/**
 * A readable name for each audit action code ("consult.refund" → "Consult
 * refunded"). The page shows the name with the code as small secondary text;
 * a code missing here (a new action) shows as the code itself.
 */
export const AUDIT_ACTION_LABELS = {
  "user.role": "adminui.act.user.role",
  "user.block": "adminui.act.user.block",
  "user.unblock": "adminui.act.user.unblock",
  "provider.submit": "adminui.act.provider.submit",
  "provider.edit": "adminui.act.provider.edit",
  "provider.verify": "adminui.act.provider.verify",
  "provider.reject": "adminui.act.provider.reject",
  "provider.suspend": "adminui.act.provider.suspend",
  "provider.payout_account": "adminui.act.provider.payoutAccount",
  "vet.recheck": "adminui.act.vet.recheck",
  "document.view": "adminui.act.document.view",
  "bvc.add": "adminui.act.bvc.add",
  "bvc.edit": "adminui.act.bvc.edit",
  "bvc.remove": "adminui.act.bvc.remove",
  "featured.add": "adminui.act.featured.add",
  "featured.end": "adminui.act.featured.end",
  "consult.read": "adminui.act.consult.read",
  "consult.refund": "adminui.act.consult.refund",
  "appointment.completed": "adminui.act.appointment.completed",
  "appointment.no_show": "adminui.act.appointment.no_show",
  "appointment.cancelled": "adminui.act.appointment.cancelled",
  "appointment.owner_cancelled": "adminui.act.appointment.owner_cancelled",
  "appointment.admin_cancel": "adminui.act.appointment.admin_cancel",
  "appointment.refund": "adminui.act.appointment.refund",
  "report.create": "adminui.act.report.create",
  "report.hide": "adminui.act.report.hide",
  "report.dismiss": "adminui.act.report.dismiss",
  "report.restore": "adminui.act.report.restore",
  "payment.submitted": "adminui.act.payment.submitted",
  "payment.paid": "adminui.act.payment.paid",
  "payment.rejected": "adminui.act.payment.rejected",
  "payment.refunded": "adminui.act.payment.refunded",
  "payment.amount_mismatch": "adminui.act.payment.amount_mismatch",
  "payout.record": "adminui.act.payout.record",
  "order.cod": "adminui.act.order.cod",
  "order.process": "adminui.act.order.process",
  "order.ship": "adminui.act.order.ship",
  "order.deliver": "adminui.act.order.deliver",
  "order.cancel": "adminui.act.order.cancel",
  "order.return": "adminui.act.order.return",
  "order.refund": "adminui.act.order.refund",
  "product.create": "adminui.act.product.create",
  "product.update": "adminui.act.product.update",
  "product.delete": "adminui.act.product.delete",
  "stock.adjust": "adminui.act.stock.adjust",
  "coupon.create": "adminui.act.coupon.create",
  "coupon.update": "adminui.act.coupon.update",
  "category.create": "adminui.act.category.create",
  "category.update": "adminui.act.category.update",
  "category.delete": "adminui.act.category.delete",
  "article.publish": "adminui.act.article.publish",
  "article.unpublish": "adminui.act.article.unpublish",
  "article.delete": "adminui.act.article.delete",
  "settings.update": "adminui.act.settings.update",
} as const satisfies Record<string, MessageKey>;

/** The message key naming this action, or null for a code with no name yet (show the code). */
export function auditActionLabel(action: string): MessageKey | null {
  return Object.hasOwn(AUDIT_ACTION_LABELS, action)
    ? AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS]
    : null;
}

/** The action's name in the reader's language, or the code itself when it has no name yet. */
export function auditActionName(t: Translate, action: string): string {
  const key = auditActionLabel(action);
  return key ? t(key) : action;
}
