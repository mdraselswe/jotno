import { describe, expect, it } from "vitest";
import { auditTone, consultTone, listHref, pageParam, providerTone } from "./status";

describe("admin status tones", () => {
  it("colours vet states", () => {
    expect(providerTone("verified")).toBe("success");
    expect(providerTone("pending")).toBe("warning");
    expect(providerTone("suspended")).toBe("danger");
    expect(providerTone("draft")).toBe("neutral");
  });
  it("colours consult states", () => {
    expect(consultTone("active")).toBe("info");
    expect(consultTone("refunded")).toBe("warning");
  });
  it("reads the verb of an audit action", () => {
    expect(auditTone("user.block")).toBe("danger");
    expect(auditTone("user.unblock")).toBe("success");
    expect(auditTone("consult.read")).toBe("warning");
    expect(auditTone("settings.update")).toBe("neutral");
  });
});

describe("pageParam", () => {
  it("falls back to 1 for junk", () => {
    expect(pageParam(undefined)).toBe(1);
    expect(pageParam("abc")).toBe(1);
    expect(pageParam("-3")).toBe(1);
    expect(pageParam("0")).toBe(1);
  });
  it("keeps real pages and caps huge ones", () => {
    expect(pageParam("3")).toBe(3);
    expect(pageParam("2.7")).toBe(2);
    expect(pageParam("99999")).toBe(500);
  });
});

describe("listHref", () => {
  it("drops empty values and defaults", () => {
    expect(listHref("/admin/users", { q: "", role: "all", page: 1 }, { role: "all", page: 1 })).toBe(
      "/admin/users",
    );
  });
  it("keeps the rest, encoded", () => {
    expect(listHref("/bn/admin/users", { q: "রহিম খান", role: "vet" }, { role: "all" })).toBe(
      "/bn/admin/users/?q=%E0%A6%B0%E0%A6%B9%E0%A6%BF%E0%A6%AE+%E0%A6%96%E0%A6%BE%E0%A6%A8&role=vet",
    );
  });
});
