import { describe, expect, it } from "vitest";
import { messagesFor, translator } from "@/i18n";
import { AUDIT_ACTION_LABELS, auditActionLabel, auditActionName } from "./audit-labels";

describe("audit action labels", () => {
  it("names known actions", () => {
    expect(auditActionLabel("consult.refund")).toBe("adminui.act.consult.refund");
    expect(auditActionLabel("payment.paid")).toBe("adminui.act.payment.paid");
    expect(auditActionLabel("report.restore")).toBe("adminui.act.report.restore");
  });

  it("falls back (null) for unknown codes, including object keys", () => {
    expect(auditActionLabel("rocket.launch")).toBeNull();
    expect(auditActionLabel("toString")).toBeNull();
    expect(auditActionLabel("")).toBeNull();
  });

  it("has text for every label in English and Bangla", () => {
    const en = messagesFor("en");
    const bn = messagesFor("bn");
    for (const key of Object.values(AUDIT_ACTION_LABELS)) {
      expect(en[key], key).toBeTruthy();
      expect(bn[key], key).toBeTruthy();
      expect(bn[key], key).not.toBe(en[key]);
    }
  });

  it("names an action in each language, or shows the code", () => {
    expect(auditActionName(translator("en"), "payment.paid")).toBe("Payment confirmed");
    expect(auditActionName(translator("bn"), "payment.paid")).toBe("পেমেন্ট নিশ্চিত হয়েছে");
    expect(auditActionName(translator("en"), "rocket.launch")).toBe("rocket.launch");
  });
});
