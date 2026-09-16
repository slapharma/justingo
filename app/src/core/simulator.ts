import { bearing, cumulativeDistances, offsetSideways, pointAlong } from './geo.ts';
import type { LngLat, LocationSample } from './types.ts';

/**
 * A virtual runner moving along a path. Stands in for GPS in the desktop preview so a whole run,
 * including going off route, can be demonstrated at a desk.
 *
 * Time is simulated: `advance(seconds)` moves the clock, so running at 20x speed produces the same
 * samples, timestamps and pace as a real run, just sooner.
 */
export class RunSimulator {
  private readonly path: LngLat[];
  private readonly cumulative: number[];
  readonly total: number;
  along = 0;
  /** Seconds per kilometre. */
  pace: number;
  /** Metres to the right of the route (negative = left). Non-zero takes the runner off route. */
  sideways = 0;
  time: number;

  constructor(path: LngLat[], pace = 330, startTime = Date.now()) {
    this.path = path;
    this.cumulative = cumulativeDistances(path);
    this.total = this.cumulative[this.cumulative.length - 1];
    this.pace = pace;
    this.time = startTime;
  }

  get done(): boolean {
    return this.along >= this.total;
  }

  /** Move forward by `seconds` of simulated time and return the new GPS sample. */
  advance(seconds: number): LocationSample {
    this.time += seconds * 1000;
    this.along = Math.min(this.total, this.along + (1000 / this.pace) * seconds);
    return this.sample();
  }

  /** Jump to a distance along the route without running there (scrubbing the demo). */
  seek(along: number): LocationSample {
    this.along = Math.max(0, Math.min(this.total, along));
    return this.sample();
  }

  sample(): LocationSample {
    let p = pointAlong(this.path, this.cumulative, this.along);
    if (this.sideways !== 0) {
      const ahead = pointAlong(this.path, this.cumulative, this.along + 5);
      const behind = pointAlong(this.path, this.cumulative, this.along - 5);
      p = offsetSideways(p, bearing(behind, ahead), this.sideways);
    }
    return { lng: p[0], lat: p[1], time: this.time };
  }
}
