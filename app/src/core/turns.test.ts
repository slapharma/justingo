import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classify, detectTurns } from './turns.ts';
import type { LngLat } from './types.ts';

// Build paths in metres on a local grid in central London, so expectations read as distances.
const ORIGIN: LngLat = [-0.1, 51.5];
const M_PER_DEG_LAT = 111_195;
const m = (x: number, y: number): LngLat => [
  ORIGIN[0] + x / (M_PER_DEG_LAT * Math.cos((ORIGIN[1] * Math.PI) / 180)),
  ORIGIN[1] + y / M_PER_DEG_LAT,
];
/** Densify so paths look like real router output (a vertex every 10 m). */
const line = (...corners: [number, number][]): LngLat[] => {
  const out: LngLat[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
    for (let k = 0; k < n; k++) out.push(m(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n));
  }
  out.push(m(...corners[corners.length - 1]));
  return out;
};

describe('classify', () => {
  it('treats anything under 40 degrees as straight', () => {
    assert.equal(classify(39), 'straight');
    assert.equal(classify(-39), 'straight');
  });
  it('is a slight turn from 40 up to 60 degrees', () => {
    assert.equal(classify(40), 'slight right');
    assert.equal(classify(-40), 'slight left');
    assert.equal(classify(59), 'slight right');
  });
  it('is a plain turn from 60 up to 135 degrees', () => {
    assert.equal(classify(60), 'right');
    assert.equal(classify(134), 'right');
    assert.equal(classify(-60), 'left');
    assert.equal(classify(-134), 'left');
  });
  it('is a sharp turn from 135 up to 165 degrees', () => {
    assert.equal(classify(135), 'sharp right');
    assert.equal(classify(-164), 'sharp left');
  });
  it('is a U-turn from 165 degrees to 180', () => {
    assert.equal(classify(165), 'uturn');
    assert.equal(classify(180), 'uturn');
    assert.equal(classify(-180), 'uturn');
  });
});

describe('detectTurns', () => {
  it('finds no turns on a route with none', () => {
    assert.deepEqual(detectTurns(line([0, 0], [1000, 0])), []);
  });

  it('does not crash on a degenerate single-point path', () => {
    assert.deepEqual(detectTurns([m(0, 0)]), []);
  });

  it('detects a turn 25 m from the route start', () => {
    const turns = detectTurns(line([0, 0], [25, 0], [25, 500]));
    assert.equal(turns.length, 1);
    assert.equal(turns[0].direction, 'left');
    assert.ok(Math.abs(turns[0].at - 25) <= 10, `at ${turns[0].at}`);
  });

  it('merges two bends closer than 30 m into a single manoeuvre', () => {
    // A kink at 500 m followed almost immediately (20 m later) by another kink nets out to a
    // single, sharper turn rather than two separate ones.
    const turns = detectTurns(line([0, 0], [500, 0], [500, 20], [520, 20], [520, 40]));
    assert.equal(turns.length, 1);
  });

  it('keeps three turns 60 m apart as three distinct turns', () => {
    const turns = detectTurns(line([0, 0], [500, 0], [500, 60], [560, 60], [560, 120]));
    assert.deepEqual(
      turns.map((t) => t.direction),
      ['left', 'right', 'left'],
    );
  });
});
