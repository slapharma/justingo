import { ascent, cumulativeDistances, haversine, pointAlong } from './geo.ts';
import { fetchElevation, fetchFootRoute } from './osrm.ts';
import { detectTurns, type NamedPoint } from './turns.ts';
import type { LngLat, Route, VoiceMessage } from './types.ts';

export const ELEVATION_SAMPLES = 60;
/** Start and finish closer than this counts as a loop. */
const LOOP_METRES = 150;

/** `count` points evenly spaced along the path, both ends included. */
export function samplePath(path: LngLat[], count: number): LngLat[] {
  if (count < 1) throw new RangeError(`samplePath needs a count of at least 1, got ${count}`);
  // One point cannot include both ends; the spacing below would divide by zero.
  if (count === 1) return [path[0]];
  const cumulative = cumulativeDistances(path);
  const total = cumulative[cumulative.length - 1];
  return Array.from({ length: count }, (_, i) => pointAlong(path, cumulative, (total * i) / (count - 1)));
}

export interface RouteInput {
  id: string;
  name: string;
  area: string;
  region?: string;
  description: string;
  path: LngLat[];
  names?: NamedPoint[];
  elevation: number[];
  messages?: VoiceMessage[];
  surface?: Route['surface'];
  verified: boolean;
}

export function assembleRoute(input: RouteInput): Route {
  const cumulative = cumulativeDistances(input.path);
  const distance = Math.round(cumulative[cumulative.length - 1]);
  return {
    id: input.id,
    name: input.name,
    area: input.area,
    region: input.region,
    description: input.description,
    path: input.path,
    distance,
    ascent: ascent(input.elevation),
    elevation: input.elevation.map((e) => Math.round(e)),
    loop: haversine(input.path[0], input.path[input.path.length - 1]) <= LOOP_METRES,
    surface: input.surface ?? 'mixed',
    turns: detectTurns(input.path, input.names),
    messages: (input.messages ?? []).filter((m) => m.at >= 0 && m.at <= distance),
    verified: input.verified,
  };
}

/**
 * Waypoints in, finished route out: snaps to foot paths, then adds elevation and turns. `snaps` is
 * how far each waypoint moved onto a path, for spotting waypoints dropped in a field or a lake.
 * With `withElevation` false the route is flat, which saves the elevation service a call when
 * only checking a route's shape.
 */
export async function routeFromWaypoints(
  meta: Omit<RouteInput, 'path' | 'names' | 'elevation'>,
  waypoints: LngLat[],
  fetchImpl: typeof fetch = fetch,
  withElevation = true,
): Promise<{ route: Route; snaps: number[] }> {
  const { path, names, snaps } = await fetchFootRoute(waypoints, fetchImpl);
  const elevation = withElevation
    ? await fetchElevation(samplePath(path, ELEVATION_SAMPLES), fetchImpl)
    : new Array<number>(ELEVATION_SAMPLES).fill(0);
  return { route: assembleRoute({ ...meta, path, names, elevation }), snaps };
}
