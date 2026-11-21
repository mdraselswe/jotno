/**
 * Cloudflare entry: the OpenNext worker plus Cron Triggers (free on Workers),
 * so scheduled jobs don't spend GitHub Actions minutes. Each trigger calls our
 * own /api/cron/<job> route with CRON_SECRET, exactly like an outside caller.
 *   "*\/5 * * * *"  → frequent (chat refunds/closing, booking holds, visit reminders)
 *   "0 2 * * *"    → daily (vaccine reminders at 8:00 Dhaka time)
 * Schedules live in wrangler.jsonc → triggers.crons.
 */
import handler from "../.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";

const JOB_BY_CRON = { "*/5 * * * *": "frequent", "0 2 * * *": "daily" };

const worker = {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    const job = JOB_BY_CRON[event.cron];
    if (!job || !env.CRON_SECRET) return;
    const request = new Request(`https://cron.internal/api/cron/${job}/`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const response = await handler.fetch(request, env, ctx);
    if (!response.ok) console.error(`cron ${job}: HTTP ${response.status}`);
  },
};

export default worker;
