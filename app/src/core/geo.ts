import type { LngLat } from './types.ts';

const EARTH_RADIUS = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance from the start of the path to each vertex. */
export function cumulativeDistances(path: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + haversine(path[i - 1], path[i]));
  return out;
}

export function pathLength(path: LngLat[]): number {
  const d = cumulativeDistances(path);
  return d[d.length - 1];
}

// Segment maths is done on a local flat projection around the segment. At running distances the
// error is centimetres, and it keeps projection exact and cheap.
function toLocal(origin: LngLat, p: LngLat): [number, number] {
  const x = toRad(p[0] - origin[0]) * EARTH_RADIUS * Math.cos(toRad(origin[1]));
  const y = toRad(p[1] - origin[1]) * EARTH_RADIUS;
  return [x, y];
}

function fromLocal(origin: LngLat, x: number, y: number): LngLat {
  const lng = origin[0] + (x / (EARTH_RADIUS * Math.cos(toRad(origin[1])))) * (180 / Math.PI);
  const lat = origin[1] + (y / EARTH_RADIUS) * (180 / Math.PI);
  return [lng, lat];
}

export interface Projection {
  /** Metres along the path to the closest point. */
  along: number;
  /** Metres from the query point to the path. */
  offset: number;
  point: LngLat;
}

/**
 * Closest point on the path, searching only vertices whose cumulative distance falls in
 * [minAlong, maxAlong]. The window is what stops a runner on a figure-of-eight or an out-and-back
 * from snapping to the wrong leg of the route where it crosses itself.
 */
export function project(
  path: LngLat[],
  cumulative: number[],
  p: LngLat,
  minAlong = -Infinity,
  maxAlong = Infinity,
): Projection {
  let best: Projection = { along: 0, offset: Infinity, point: path[0] };
  for (let i = 0; i < path.length - 1; i++) {
    if (cumulative[i + 1] < minAlong || cumulative[i] > maxAlong) continue;
    const a = path[i];
    const [bx, by] = toLocal(a, path[i + 1]);
    const [px, py] = toLocal(a, p);
    const len2 = bx * bx + by * by;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
    const cx = bx * t;
    const cy = by * t;
    const offset = Math.hypot(px - cx, py - cy);
    if (offset < best.offset) {
      best = {
        along: cumulative[i] + Math.sqrt(len2) * t,
        offset,
        point: fromLocal(a, cx, cy),
      };
    }
  }
  return best;
}

/** Point at a given distance along the path, clamped to its ends. */
export function pointAlong(path: LngLat[], cumulative: number[], along: number): LngLat {
  if (along <= 0) return path[0];
  const total = cumulative[cumulative.length - 1];
  if (along >= total) return path[path.length - 1];
  let i = 1;
  while (cumulative[i] < along) i++;
  const segLen = cumulative[i] - cumulative[i - 1];
  const t = segLen === 0 ? 0 : (along - cumulative[i - 1]) / segLen;
  return [
    path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
    path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
  ];
}

/** Initial compass bearing from a to b, degrees 0..360. */
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]));
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point offset sideways from `p` by `metres`, perpendicular to `heading` (positive = right). */
export function offsetSideways(p: LngLat, heading: number, metres: number): LngLat {
  const angle = toRad(heading + 90);
  return fromLocal(p, Math.sin(angle) * metres, Math.cos(angle) * metres);
}

/**
 * Total climb in metres. The elevation model (Copernicus GLO-90) is a 90 m surface model that
 * includes buildings and tree canopy, so raw samples along a flat riverside path jump up and down
 * by several metres. Smoothing first, then ignoring rises under `threshold`, keeps that noise from
 * adding up into hills that aren't there.
 */
export function ascent(elevation: number[], threshold = 3): number {
  const smoothed = elevation.map((_, i) => {
    const window = elevation.slice(Math.max(0, i - 2), i + 3);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
  let total = 0;
  let base = smoothed[0] ?? 0;
  for (const e of smoothed) {
    if (e - base >= threshold) {
      total += e - base;
      base = e;
    } else if (e < base) {
      base = e;
    }
  }
  return Math.round(total);
}
