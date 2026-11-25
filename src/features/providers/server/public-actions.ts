"use server";

import { clientIp, rateLimit } from "@/infrastructure/db/helpers";
import { paramsFromQueryString, parseVetQuery, vetSearchOf, VETS_PAGE_SIZE } from "../search-params";
import { recordStat, searchProviders, type ProviderCard } from "./queries";

/** Counts a tap on a vet's Call button (one per visitor per vet per hour). */
export async function recordCallTap(providerId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(providerId)) return;
  const ip = await clientIp();
  if (!(await rateLimit(`call:${providerId}:${ip}`, 1, 3600))) return;
  await recordStat(providerId, "calls");
}

/**
 * The vet list's "load more": the next page only (the vets after the first
 * `offset`), for the same search as the URL (`query` is its search params).
 */
export async function loadMoreVets(query: string, offset: number): Promise<ProviderCard[]> {
  if (typeof query !== "string" || query.length > 600) return [];
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) return [];
  const ip = await clientIp();
  if (!(await rateLimit(`vets-more:${ip}`, 120, 600))) return [];
  const search = vetSearchOf(parseVetQuery(paramsFromQueryString(query)));
  const { results } = await searchProviders({ ...search, offset, limit: VETS_PAGE_SIZE });
  return results;
}
