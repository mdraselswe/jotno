import { describe, expect, it } from "vitest";
import { registerStatus, registerTone } from "./bvc-match";

const vet = { registrationNo: "BVC-0277", nameNidBn: "মোঃ সামছুল ইসলাম" };

describe("registerStatus", () => {
  it("needs a number to look up", () => {
    expect(registerStatus({ ...vet, registrationNo: null }, null)).toBe("noNumber");
    expect(registerStatus({ ...vet, registrationNo: "BVC" }, { nameBn: "x" })).toBe("noNumber");
  });

  it("says when the number is not in the register", () => {
    expect(registerStatus(vet, null)).toBe("notFound");
  });

  it("can't compare an unreadable row or a missing NID name", () => {
    expect(registerStatus(vet, { nameBn: null })).toBe("unreadable");
    expect(registerStatus({ ...vet, nameNidBn: " " }, { nameBn: "ডাঃ সামছুল ইসলাম" })).toBe("noNidName");
  });

  it("compares the NID name with the register name", () => {
    expect(registerStatus(vet, { nameBn: "ডাঃ মোঃ সামছুল ইসলাম" })).toBe("same");
    expect(registerStatus(vet, { nameBn: "ডাঃ সামছুল ইসলাম খান" })).toBe("close");
    expect(registerStatus(vet, { nameBn: "ডাঃ ফারুক হোসেন" })).toBe("different");
  });
});

describe("registerTone", () => {
  it("is green only for a full match", () => {
    expect(registerTone("same")).toBe("success");
    expect(registerTone("close")).toBe("warning");
    expect(registerTone("different")).toBe("danger");
    expect(registerTone("notFound")).toBe("danger");
  });
});
