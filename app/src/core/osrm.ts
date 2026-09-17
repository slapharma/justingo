import { cumulativeDistances, project } from './geo.ts';
import type { NamedPoint } from './turns.ts';
import type { LngLat } from './types.ts';

// FOSSGIS public OSRM instance with a foot profile. Keyless and CORS-enabled, fine for the preview;
// production should move to a hosted or self-run router (see README).
export const FOOT_ROUTER = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

interface OsrmStep {
  name: string;
  maneuver: { location: LngLat; type: string };
}
interface OsrmResponse {
  code: string;
  message?: string;
  routes: { geometry: { coordinates: LngLat[] }; legs: { steps: OsrmStep[] }[] }[];
  waypoints?: { distance: number }[];
}

export interface FootRoute {
  path: LngLat[];
  names: NamedPoint[];
  /** Metres each input waypoint moved to reach the nearest path. A big one means a bad waypoint. */
  snaps: number[];
}

/** Drops consecutive duplicate points, which OSRM emits at waypoint joins. */
function dedupe(path: LngLat[]): LngLat[] {
  return path.filter((p, i) => i === 0 || p[0] !== path[i - 1][0] || p[1] !== path[i - 1][1]);
}

export function parseOsrm(json: OsrmResponse): FootRoute {
  if (json.code !== 'Ok' || !json.routes?.length) {
    throw new Error(json.message || `Routing failed (${json.code})`);
  }
  const route = json.routes[0];
  const path = dedupe(route.geometry.coordinates.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)] as LngLat));
  const cumulative = cumulativeDistances(path);
  const names: NamedPoint[] = [];
  let from = 0;
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      if (!step.name) continue;
      const p = project(path, cumulative, step.maneuver.location, from - 5);
      from = p.along;
      names.push({ at: p.along, name: step.name });
    }
  }
  return { path, names, snaps: (json.waypoints ?? []).map((w) => Math.round(w.distance)) };
}

/** Routes on foot through the given waypoints, following paths and parks, not just roads. */
export async function fetchFootRoute(waypoints: LngLat[], fetchImpl: typeof fetch = fetch): Promise<FootRoute> {
  const coords = waypoints.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const url = `${FOOT_ROUTER}/${coords}?overview=full&geometries=geojson&steps=true&continue_straight=true`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Routing service returned ${res.status}`);
  return parseOsrm((await res.json()) as OsrmResponse);
}

/** Elevation at up to 100 points per call from Open-Meteo (Copernicus 90 m DEM). Keyless. */
export async function fetchElevation(points: LngLat[], fetchImpl: typeof fetch = fetch): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100);
    const lat = chunk.map((p) => p[1].toFixed(5)).join(',');
    const lng = chunk.map((p) => p[0].toFixed(5)).join(',');
    const res = await fetchImpl(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    if (!res.ok) throw new Error(`Elevation service returned ${res.status}`);
    const json = (await res.json()) as { elevation: number[] };
    out.push(...json.elevation);
  }
  return out;
}
