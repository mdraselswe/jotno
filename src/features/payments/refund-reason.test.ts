import { describe, expect, it } from "vitest";
import { translator } from "@/i18n";
import { refundReasonKey } from "./refund-reason";

describe("refundReasonKey", () => {
  it("maps the codes the app writes", () => {
    expect(refundReasonKey("vet_no_reply")).toBe("payAdmin.reasonVetNoReply");
    expect(refundReasonKey(" quick_unanswered ")).toBe("payAdmin.reasonQuickUnanswered");
    expect(refundReasonKey("admin")).toBe("payAdmin.reasonAdmin");
  });

  it("has text in every language", () => {
    for (const locale of ["bn", "en"]) {
      const key = refundReasonKey("vet_no_reply");
      expect(key).not.toBeNull();
      if (key) expect(translator(locale)(key)).not.toBe(key);
    }
  });

  it("leaves plain notes and empty values alone", () => {
    expect(refundReasonKey("order #1042 cancelled by customer")).toBeNull();
    expect(refundReasonKey("toString")).toBeNull();
    expect(refundReasonKey("")).toBeNull();
    expect(refundReasonKey(null)).toBeNull();
  });
});
