import { describe, expect, it } from "vitest";
import { toPoisha } from "@/lib/money";
import { vetFeeInput } from "./profile-values";

describe("vetFeeInput", () => {
  it("shows whole taka without decimals and keeps poisha", () => {
    expect(vetFeeInput(35_000)).toBe("350");
    expect(vetFeeInput(35_050)).toBe("350.50");
    expect(vetFeeInput(35_005)).toBe("350.05");
    expect(vetFeeInput(0)).toBe("0");
  });

  it("round-trips through toPoisha", () => {
    for (const p of [35_000, 35_050, 35_099, 101]) expect(toPoisha(vetFeeInput(p))).toBe(p);
  });
});
