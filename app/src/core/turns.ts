import { bearing, cumulativeDistances, pointAlong } from './geo.ts';
import type { LngLat, Turn, TurnDirection } from './types.ts';

export interface NamedPoint {
  /** Metres along the path. */
  at: number;
  name: string;
}

const SAMPLE_STEP = 5;
/** Metres either side of a point used to measure heading in and out. */
const WINDOW = 20;
/** Heading change below this is a bend in the path, not a turn worth speaking. */
const MIN_TURN_DEGREES = 40;
/** Turns closer than this are one manoeuvre (a staggered junction, a kink at a gate). */
const MERGE_METRES = 30;

function signedDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

export function classify(delta: number): TurnDirection {
  const abs = Math.abs(delta);
  const side = delta < 0 ? 'left' : 'right';
  if (abs < MIN_TURN_DEGREES) return 'straight';
  if (abs < 60) return `slight ${side}`;
  if (abs < 135) return side;
  if (abs < 165) return `sharp ${side}`;
  return 'uturn';
}

/**
 * Finds turns from geometry alone. The same detector handles library routes, routes drawn in the
 * creator and imported GPX files, so every route gets identical cue behaviour whatever its source.
 * `names` (from the routing service) supplies street names where they exist.
 */
export function detectTurns(path: LngLat[], names: NamedPoint[] = []): Turn[] {
  const cumulative = cumulativeDistances(path);
  const total = cumulative[cumulative.length - 1];
  const at = (d: number) => pointAlong(path, cumulative, d);
  const headingChange = (from: number, to: number) =>
    signedDelta(bearing(at(from - WINDOW), at(from)), bearing(at(to), at(to + WINDOW)));

  // 1. Runs of high heading change. Each run is one bend; its sharpest point is where we place it.
  interface Bend {
    start: number;
    end: number;
    peak: number;
    max: number;
  }
  const bends: Bend[] = [];
  let bend: Bend | null = null;
  for (let d = WINDOW; d <= total - WINDOW; d += SAMPLE_STEP) {
    const v = Math.abs(headingChange(d, d));
    if (v >= MIN_TURN_DEGREES) {
      if (!bend) bend = { start: d, end: d, peak: d, max: v };
      bend.end = d;
      if (v > bend.max) Object.assign(bend, { peak: d, max: v });
    } else if (bend) {
      bends.push(bend);
      bend = null;
    }
  }
  if (bend) bends.push(bend);

  // 2. Merge bends that are really one manoeuvre, then measure heading before the first begins and
  // after the last ends. Measuring across the whole span is what makes a hairpin read as a U-turn
  // and a left immediately followed by a right net out to straight, which is then dropped.
  const turns: Turn[] = [];
  let i = 0;
  while (i < bends.length) {
    let j = i;
    while (j + 1 < bends.length && bends[j + 1].start - bends[j].end <= MERGE_METRES) j++;
    const delta = headingChange(bends[i].start, bends[j].end);
    const direction = classify(delta);
    if (direction !== 'straight') {
      const point = (bends[i].peak + bends[j].peak) / 2;
      const named = names
        .filter((n) => Math.abs(n.at - point) <= MERGE_METRES + WINDOW && n.name)
        .sort((a, b) => Math.abs(a.at - point) - Math.abs(b.at - point))[0];
      turns.push({ at: Math.round(point), direction, onto: named?.name ?? '' });
    }
    i = j + 1;
  }
  return turns;
}
