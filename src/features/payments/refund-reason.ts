import type { MessageKey } from "@/i18n";

/**
 * Refund reasons the code writes itself (`refundConsult(…, "vet_no_reply")`)
 * and their text for people. Anything else in `payments.note` was typed by an
 * admin or built as a sentence ("order #1042 cancelled by customer") and is
 * shown as it is.
 */
const REASONS = new Map<string, MessageKey>([
  ["vet_no_reply", "payAdmin.reasonVetNoReply"],
  ["quick_unanswered", "payAdmin.reasonQuickUnanswered"],
  ["admin", "payAdmin.reasonAdmin"],
]);

/** The message key for a refund reason code, or null when the note is already plain text. */
export function refundReasonKey(note: string | null | undefined): MessageKey | null {
  const code = note?.trim();
  return code ? (REASONS.get(code) ?? null) : null;
}
