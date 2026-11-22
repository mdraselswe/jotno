/**
 * "Near me": the search radius and the browser's location, shared by the vet
 * search and the vet's own profile form.
 */

/** Radius choices (km) for "near me"; the search starts at the default. */
export const NEAR_RADII = [2, 5, 10, 25, 50] as const;
export const DEFAULT_RADIUS_KM = 10;

/** `?r=` → a known radius, else the default. */
export function parseRadius(v: string | null | undefined): number {
  const n = Number(v);
  return (NEAR_RADII as readonly number[]).includes(n) ? n : DEFAULT_RADIUS_KM;
}

/** The next radius up (to suggest when nothing is close), or null at the largest. */
export function widerRadius(km: number): number | null {
  return NEAR_RADII.find((r) => r > km) ?? null;
}

/** `?near=lat,lon` → a point inside Bangladesh's rough bounds (with margin), else null. */
export function parseNear(v: string | null | undefined): { lat: number; lon: number } | null {
  const parts = v?.split(",").map(Number);
  if (!parts || parts.length !== 2) return null;
  const [lat, lon] = parts as [number, number];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 19 || lat > 28 || lon < 86 || lon > 94) return null;
  return { lat, lon };
}

export type LocateError = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout" | "outside";

/** The browser's position, or a reason it couldn't be had (each gets its own message). */
export function locate(): Promise<{ lat: number; lon: number; accuracy: number }> {
  return new Promise((resolve, reject: (reason: LocateError) => void) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return reject("unsupported");
    // Browsers only share location on https (and localhost).
    if (!window.isSecureContext) return reject("insecure");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        if (!parseNear(`${lat},${lon}`)) return reject("outside"); // vets are only in Bangladesh
        resolve({ lat, lon, accuracy });
      },
      (err) =>
        reject(
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable",
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
