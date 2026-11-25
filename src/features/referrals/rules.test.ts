import { describe, expect, it } from "vitest";
import { inviteFlag, isDisposableEmail, makeCode } from "./rules";

describe("makeCode", () => {
  it("makes six readable characters", () => {
    const code = makeCode(new Uint8Array([0, 1, 2, 3, 4, 255]));
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(code).toHaveLength(6);
  });
});

describe("isDisposableEmail", () => {
  it("spots throwaway inboxes, subdomains included", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@eu.mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@gmail.com")).toBe(false);
    expect(isDisposableEmail(null)).toBe(false);
  });
});

describe("inviteFlag", () => {
  const base = { email: "a@gmail.com", deviceId: "d1", inviterDeviceId: "d2", deviceSeenBefore: false };
  it("passes a normal invite", () => {
    expect(inviteFlag(base)).toBeNull();
  });
  it("flags inviting yourself from the same browser", () => {
    expect(inviteFlag({ ...base, inviterDeviceId: "d1" })).toBe("same_device");
  });
  it("flags a browser that signed up through an invite before", () => {
    expect(inviteFlag({ ...base, deviceSeenBefore: true })).toBe("device_reused");
  });
  it("flags a throwaway email", () => {
    expect(inviteFlag({ ...base, email: "a@yopmail.com" })).toBe("disposable_email");
  });
  it("does not flag when the browser is unknown", () => {
    expect(inviteFlag({ ...base, deviceId: null, inviterDeviceId: null, deviceSeenBefore: true })).toBeNull();
  });
});
