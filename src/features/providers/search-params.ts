import { AREAS } from "@/content/geo-areas";
import { parseNear, parseRadius } from "@/lib/geo";
import { parseVetSort, type VetSort } from "./vet-sort";

export { VETS_PAGE_SIZE } from "./vet-sort";
/** A shared `?page=` link renders at most this many pages in one go. */
export const VETS_MAX_PAGES = 20;

/** The vet search as the URL says it (`/vets?district=…&area=…&sort=…&page=…`). */
export interface VetQuery {
  districtId: number | null;
  /** Only set when it is an area of `districtId`. */
  areaId: number | null;
  species: string | null;
  q: string | null;
  onlyAvailable: boolean;
  near: { lat: number; lon: number } | null;
  radiusKm: number;
  sort: VetSort;
  /** Pages shown (1 = the first page only). */
  page: number;
}

type Params = Readonly<Record<string, string | undefined>>;

const positiveInt = (v: string | undefined) => (v && /^\d{1,9}$/.test(v) && Number(v) > 0 ? Number(v) : null);

/** Search params (first value of each) → a checked vet query. "Near me" wins over a district. */
export function parseVetQuery(params: Params): VetQuery {
  const near = parseNear(params.near);
  const districtId = near ? null : positiveInt(params.district);
  const area = districtId ? positiveInt(params.area) : null;
  const areaId = area && AREAS.some((a) => a.id === area && a.d === districtId) ? area : null;
  const species = params.species && /^[a-z-]{1,30}$/.test(params.species) ? params.species : null;
  const q = params.q?.trim().slice(0, 80) || null;
  const page = Math.min(VETS_MAX_PAGES, positiveInt(params.page) ?? 1);
  return {
    districtId,
    areaId,
    species,
    q,
    onlyAvailable: params.now === "1",
    near,
    radiusKm: parseRadius(params.r),
    sort: parseVetSort(params.sort),
    page,
  };
}

/** The query without `page`: what the database search needs. */
export function vetSearchOf(v: VetQuery): Omit<VetQuery, "page"> {
  return {
    districtId: v.districtId,
    areaId: v.areaId,
    species: v.species,
    q: v.q,
    onlyAvailable: v.onlyAvailable,
    near: v.near,
    radiusKm: v.radiusKm,
    sort: v.sort,
  };
}

/** A `?a=b&c=d` string → the flat map `parseVetQuery` takes (first value of each). */
export function paramsFromQueryString(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(qs)) if (!(k in out) && v) out[k] = v;
  return out;
}
