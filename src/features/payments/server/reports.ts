import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { dhakaDay } from "@/lib/dhaka";
import { vetBalance, type VetBalance } from "../ledger";

const L = schema.ledgerEntries;

/** A vet's balance and recent ledger lines (earnings page). */
export async function vetLedger(providerId: string): Promise<{
  balance: VetBalance;
  lines: {
    id: number;
    kind: string;
    amount: number;
    memo: string | null;
    createdAt: Date;
    availableAt: Date | null;
  }[];
  payouts: { id: string; amount: number; method: string; reference: string | null; createdAt: Date }[];
  /** Earned (vet share, net of refunds) in the current Dhaka calendar month, in poisha. */
  month: number;
}> {
  const rows = await db()
    .select({
      id: L.id,
      kind: L.kind,
      amount: L.amount,
      memo: L.memo,
      createdAt: L.createdAt,
      availableAt: L.availableAt,
    })
    .from(L)
    .where(sql`${L.providerId} = ${providerId} and ${L.kind} in ('vet_payable', 'payout')`)
    .orderBy(desc(L.createdAt));
  const payouts = await db()
    .select({
      id: schema.payouts.id,
      amount: schema.payouts.amount,
      method: schema.payouts.method,
      reference: schema.payouts.reference,
      createdAt: schema.payouts.createdAt,
    })
    .from(schema.payouts)
    .where(eq(schema.payouts.providerId, providerId))
    .orderBy(desc(schema.payouts.createdAt))
    .limit(50);
  const now = new Date();
  const thisMonth = dhakaDay(now).slice(0, 7);
  const month = rows
    .filter((r) => r.kind === "vet_payable" && dhakaDay(r.createdAt).slice(0, 7) === thisMonth)
    .reduce((n, r) => n + r.amount, 0);
  return { balance: vetBalance(rows, now), lines: rows.slice(0, 50), payouts, month };
}

/** Admin numbers: money in, Jotno's income, refunds, owed to vets. Last 30 days and all time. */
export async function platformSummary() {
  const [row] = await db()
    .select({
      charges30: sql<number>`coalesce(sum(${L.amount}) filter (where ${L.kind} = 'charge' and ${L.createdAt} > now() - interval '30 days'), 0)::int`,
      income30: sql<number>`coalesce(sum(${L.amount}) filter (where ${L.kind} = 'commission' and ${L.createdAt} > now() - interval '30 days'), 0)::int`,
      refunds30: sql<number>`coalesce(sum(${L.amount}) filter (where ${L.kind} = 'refund' and ${L.createdAt} > now() - interval '30 days'), 0)::int`,
      owed: sql<number>`coalesce(sum(${L.amount}) filter (where ${L.kind} in ('vet_payable', 'payout')), 0)::int`,
      incomeAll: sql<number>`coalesce(sum(${L.amount}) filter (where ${L.kind} = 'commission'), 0)::int`,
    })
    .from(L);
  return {
    charges30: Number(row?.charges30 ?? 0),
    income30: Number(row?.income30 ?? 0),
    refunds30: Number(row?.refunds30 ?? 0),
    owed: Number(row?.owed ?? 0),
    incomeAll: Number(row?.incomeAll ?? 0),
  };
}
