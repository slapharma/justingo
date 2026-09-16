import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ascent, bearing, cumulativeDistances, haversine, offsetSideways, pointAlong, project } from './geo.ts';
import type { LngLat } from './types.ts';

// Build paths in metres on a local grid in central London, so expectations read as distances.
const ORIGIN: LngLat = [-0.1, 51.5];
const M_PER_DEG_LAT = 111_195;
const m = (x: number, y: number): LngLat => [
  ORIGIN[0] + x / (M_PER_DEG_LAT * Math.cos((ORIGIN[1] * Math.PI) / 180)),
  ORIGIN[1] + y / M_PER_DEG_LAT,
];

describe('pointAlong', () => {
  const path = [m(0, 0), m(0, 100), m(0, 200)];
  const cumulative = cumulativeDistances(path);

  it('clamps to the first point for a negative distance', () => {
    assert.deepEqual(pointAlong(path, cumulative, -5), path[0]);
  });

  it('clamps to the last point for a distance past the end', () => {
    assert.deepEqual(pointAlong(path, cumulative, 1e9), path[2]);
  });

  it('lands exactly on a vertex when the distance matches it', () => {
    const p = pointAlong(path, cumulative, cumulative[1]);
    assert.ok(Math.abs(p[0] - path[1][0]) < 1e-9);
    assert.ok(Math.abs(p[1] - path[1][1]) < 1e-9);
  });

  it('interpolates halfway along a segment', () => {
    const p = pointAlong(path, cumulative, cumulative[1] / 2);
    assert.ok(Math.abs(haversine(p, path[0]) - cumulative[1] / 2) < 0.5);
  });
});

describe('project', () => {
  it('is restricted to the given along-window even when a closer point lies outside it', () => {
    const path = [m(0, 0), m(0, 100), m(0, 200), m(0, 300)];
    const cumulative = cumulativeDistances(path);
    // The true closest point to (5, 5) is right at the start, but the window only allows the
    // last segment, so the search must settle for the closest point it's allowed to consider.
    const windowed = project(path, cumulative, m(5, 5), cumulative[2] + 1, cumulative[3]);
    assert.ok(windowed.along >= cumulative[2] - 1, `along ${windowed.along}`);
    assert.ok(windowed.offset > 150, `offset ${windowed.offset} should be forced large by the window`);
  });

  it('does not crash or return NaN on a path with a duplicated (zero-length) segment', () => {
    const path = [m(0, 0), m(0, 0), m(0, 100)];
    const cumulative = cumulativeDistances(path);
    const p = project(path, cumulative, m(1, 50));
    assert.ok(Number.isFinite(p.along), `along ${p.along}`);
    assert.ok(Number.isFinite(p.offset), `offset ${p.offset}`);
  });
});

describe('bearing', () => {
  it('reads 0 for due north', () => {
    assert.ok(Math.abs(bearing([0, 0], [0, 1])) < 1e-6);
  });
  it('reads 90 for due east', () => {
    assert.ok(Math.abs(bearing([0, 0], [1, 0]) - 90) < 1e-6);
  });
  it('reads 180 for due south', () => {
    assert.ok(Math.abs(bearing([0, 0], [0, -1]) - 180) < 1e-6);
  });
  it('reads 270 for due west', () => {
    assert.ok(Math.abs(bearing([0, 0], [-1, 0]) - 270) < 1e-6);
  });
});

describe('offsetSideways', () => {
  it('moves a point to the east when heading north and offsetting right', () => {
    const origin = m(0, 0);
    const p = offsetSideways(origin, 0, 100);
    assert.ok(Math.abs(haversine(origin, p) - 100) < 0.1, `distance ${haversine(origin, p)}`);
    assert.ok(Math.abs(bearing(origin, p) - 90) < 0.1, `bearing ${bearing(origin, p)}`);
  });

  it('moves a point to the west when heading north and offsetting left', () => {
    const origin = m(0, 0);
    const p = offsetSideways(origin, 0, -100);
    assert.ok(Math.abs(bearing(origin, p) - 270) < 0.1, `bearing ${bearing(origin, p)}`);
  });
});

describe('ascent', () => {
  it('reports zero climb for flat, noisy elevation data', () => {
    // Each sample wobbles by a couple of metres either side of 10 m -- the kind of noise a
    // 90 m-resolution surface model produces on a flat riverside path.
    assert.equal(ascent([10, 11, 9, 10, 12, 10, 9, 11, 10, 12]), 0);
  });

  it('sums a steady climb', () => {
    const climb = Array.from({ length: 11 }, (_, i) => 10 + i * 5); // 10 m up to 60 m
    assert.equal(ascent(climb), 40);
  });

  it('returns zero for an empty elevation profile', () => {
    assert.equal(ascent([]), 0);
  });

  it('returns zero for a single elevation sample', () => {
    assert.equal(ascent([42]), 0);
  });
});
