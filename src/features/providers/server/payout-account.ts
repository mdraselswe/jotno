import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { readPayoutAccount, type PayoutAccount } from "../payout-account";

/**
 * Payout accounts live in the `settings` key/value table (no table of their
 * own), one row per vet. The table has RLS on and no policies, so only the
 * server reads it. `getSettings` reads its own key only, so these rows never
 * reach the business settings.
 */
export const payoutAccountKey = (providerId: string) => `payout_account:${providerId}`;

/** A vet's payout account, or null. Private: for the vet's own pages and admins only. */
export async function getPayoutAccount(providerId: string): Promise<PayoutAccount | null> {
  const [row] = await db()
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, payoutAccountKey(providerId)))
    .limit(1);
  return readPayoutAccount(row?.value);
}

/** Payout accounts for several vets (admin payouts), by provider id. */
export async function payoutAccountsFor(providerIds: readonly string[]): Promise<Map<string, PayoutAccount>> {
  const out = new Map<string, PayoutAccount>();
  if (providerIds.length === 0) return out;
  const rows = await db()
    .select({ key: schema.settings.key, value: schema.settings.value })
    .from(schema.settings)
    .where(inArray(schema.settings.key, providerIds.map(payoutAccountKey)));
  for (const row of rows) {
    const account = readPayoutAccount(row.value);
    if (account) out.set(row.key.slice(payoutAccountKey("").length), account);
  }
  return out;
}
