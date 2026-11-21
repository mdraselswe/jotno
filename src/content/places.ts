import { BREEDS, DISTRICTS, SPECIES } from "./geo";

type Named = { en: string; bn: string };
const pick = (x: Named | undefined, locale: string) => (x ? (locale === "bn" ? x.bn : x.en) : null);

export const districtName = (id: number | null | undefined, locale: string) =>
  pick(
    DISTRICTS.find((d) => d.id === id),
    locale,
  );
export const speciesName = (id: number | null | undefined, locale: string) =>
  pick(
    SPECIES.find((s) => s.id === id),
    locale,
  );
export const breedName = (id: number | null | undefined, locale: string) =>
  pick(
    BREEDS.find((b) => b.id === id),
    locale,
  );
export const speciesSlug = (id: number | null | undefined) => SPECIES.find((s) => s.id === id)?.slug ?? null;

/** Area names need the big list: server-side only (import cost is fine there). */
export async function areaName(id: number | null | undefined, locale: string): Promise<string | null> {
  if (!id) return null;
  const { AREAS } = await import("./geo-areas");
  return pick(
    AREAS.find((a) => a.id === id),
    locale,
  );
}
