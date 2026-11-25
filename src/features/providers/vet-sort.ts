/**
 * The vet search's sort orders (`?sort=` in the URL). "Recommended" is the
 * earned ranking and stays out of the URL; the others are plain orders with
 * the ranking as the tie-break.
 */
export const VET_SORTS = ["recommended", "rating", "fee", "experience"] as const;
export type VetSort = (typeof VET_SORTS)[number];
export const DEFAULT_VET_SORT: VetSort = "recommended";

/** Vets per page of the list ("load more" adds this many). */
export const VETS_PAGE_SIZE = 12;

/** `?sort=` → a known sort, else the default. */
export function parseVetSort(v: string | null | undefined): VetSort {
  return (VET_SORTS as readonly string[]).includes(v ?? "") ? (v as VetSort) : DEFAULT_VET_SORT;
}
