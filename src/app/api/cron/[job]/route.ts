import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/config/env";
import { runAppointmentJobs } from "@/features/appointments/server";
import { runConsultJobs } from "@/features/consults/server";
import { expireUnpaid } from "@/features/payments/server";
import { runHealthReminders } from "@/features/pets/server";
import { notifyLowStock } from "@/features/shop/server";

/**
 * Scheduled jobs, called by GitHub Actions (.github/workflows/cron.yml) with
 * `Authorization: Bearer $CRON_SECRET`. Every job is idempotent, so a retry or
 * a double call is harmless.
 *   /api/cron/frequent  every 5 min: unpaid holds, chat refunds/closing, visit reminders
 *   /api/cron/daily     once a day: vaccine & deworming reminders, low stock
 */
const JOBS = {
  frequent: async () => ({
    payments: await expireUnpaid(),
    consults: await runConsultJobs(),
    appointments: await runAppointmentJobs(),
  }),
  daily: async () => ({ health: await runHealthReminders(), stock: await notifyLowStock() }),
} as const;

function authorized(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/cron/[job]">) {
  const { job } = await ctx.params;
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(job in JOBS)) return NextResponse.json({ error: "unknown job" }, { status: 404 });
  const started = Date.now();
  try {
    const result = await JOBS[job as keyof typeof JOBS]();
    return NextResponse.json({ ok: true, job, ms: Date.now() - started, result });
  } catch (error) {
    console.error(`cron ${job} failed`, error);
    return NextResponse.json({ ok: false, job }, { status: 500 });
  }
}
