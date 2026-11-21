"use server";

import { clientIp, rateLimit } from "@/infrastructure/db/helpers";
import { recordStat } from "./queries";

/** Counts a tap on a vet's Call button (one per visitor per vet per hour). */
export async function recordCallTap(providerId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(providerId)) return;
  const ip = await clientIp();
  if (!(await rateLimit(`call:${providerId}:${ip}`, 1, 3600))) return;
  await recordStat(providerId, "calls");
}
