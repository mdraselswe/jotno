import { describe, expect, it } from "vitest";
import { payoutAccountLine, payoutAccountSchema, readPayoutAccount } from "./payout-account";

describe("payout account", () => {
  it("normalises a wallet number and rejects a non-mobile one", () => {
    const ok = payoutAccountSchema.safeParse({ method: "bkash", number: "+880 1712-345678" });
    expect(ok.success && ok.data).toEqual({ method: "bkash", number: "01712345678" });
    expect(payoutAccountSchema.safeParse({ method: "nagad", number: "0212345678" }).success).toBe(false);
  });

  it("needs every bank field and a digits-only account number", () => {
    const bank = {
      method: "bank",
      bankName: "Dutch-Bangla Bank",
      accountName: "Dr. Rahim",
      accountNumber: "১২৩-৪৫৬ 7890",
      branch: "Dhanmondi",
    };
    const ok = payoutAccountSchema.safeParse(bank);
    expect(ok.success && ok.data.method === "bank" && ok.data.accountNumber).toBe("1234567890");
    expect(payoutAccountSchema.safeParse({ ...bank, branch: " " }).success).toBe(false);
    expect(payoutAccountSchema.safeParse({ ...bank, accountNumber: "12ab" }).success).toBe(false);
  });

  it("reads a stored value, or null when it is not an account", () => {
    expect(readPayoutAccount({ method: "nagad", number: "01812345678" })).toEqual({
      method: "nagad",
      number: "01812345678",
    });
    expect(readPayoutAccount(null)).toBeNull();
    expect(readPayoutAccount({ method: "paypal" })).toBeNull();
  });

  it("puts the account on one line for copying", () => {
    expect(payoutAccountLine({ method: "bkash", number: "01712345678" })).toBe("01712345678");
    expect(
      payoutAccountLine({
        method: "bank",
        bankName: "B",
        accountName: "N",
        accountNumber: "123456",
        branch: "X",
      }),
    ).toBe("B · N · 123456 · X");
  });
});
