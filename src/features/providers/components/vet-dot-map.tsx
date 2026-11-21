/**
 * Hairline dot map of vets across Bangladesh: each verified vet with a
 * location is a dot; vets online now pulse. A plain projection of
 * Bangladesh's bounding box is enough at this size.
 */
const BOUNDS = { minLat: 20.6, maxLat: 26.7, minLon: 88.0, maxLon: 92.7 };
const W = 300;
const H = 360;

export function VetDotMap({
  dots,
  label,
}: {
  dots: { lat: number; lon: number; online: boolean }[];
  label: string;
}) {
  const project = (lat: number, lon: number) => ({
    x: ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * W,
    y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
  });
  const inside = dots.filter(
    (d) =>
      d.lat >= BOUNDS.minLat && d.lat <= BOUNDS.maxLat && d.lon >= BOUNDS.minLon && d.lon <= BOUNDS.maxLon,
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full text-primary">
      <defs>
        <pattern id="vdm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#vdm-grid)" rx="16" />
      {inside.map((d, i) => {
        const { x, y } = project(d.lat, d.lon);
        return d.online ? (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="9"
              className="origin-center fill-success/25 [transform-box:fill-box] motion-safe:animate-ping"
            />
            <circle cx={x} cy={y} r="4" className="fill-success" />
          </g>
        ) : (
          <circle key={i} cx={x} cy={y} r="3" fill="currentColor" fillOpacity="0.45" />
        );
      })}
    </svg>
  );
}
