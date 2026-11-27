import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../../src/i18n/messages";
import { clientMessagesModule, pickClientMessages, scanClientKeys } from "./client-keys";

const root = path.resolve(import.meta.dirname, "..", "..");
const scan = scanClientKeys(root);

describe("client text", () => {
  it("src/i18n/client-messages.ts is up to date (pnpm dev or pnpm build regenerates it)", () => {
    const current = readFileSync(path.join(root, "src", "i18n", "client-messages.ts"), "utf8");
    expect(current.replaceAll("\r\n", "\n")).toBe(clientMessagesModule(CATALOGUE, scan));
  });

  it("no browser-side file imports values from @/i18n (it loads every language)", () => {
    // Use "@/i18n/core" for helpers and useT() from "@/i18n/client" for text.
    expect(scan.catalogueImports).toEqual([]);
  });

  it("finds the keys client components use, and leaves server-only text out", () => {
    expect(scan.keys).toContain("error.retry");
    expect(scan.keys).toContain("connection.online");
    const all = Object.keys(CATALOGUE.en ?? {}).length;
    expect(scan.keys.length).toBeLessThan(all);
  });

  it("keeps listed keys and keys under a prefix", () => {
    const picked = pickClientMessages(
      { "a.one": "1", "a.two": "2", "pay.status.paid": "P", "pay.other": "O" },
      { keys: ["a.one"], prefixes: ["pay.status."] },
    );
    expect(picked).toEqual({ "a.one": "1", "pay.status.paid": "P" });
  });
});
