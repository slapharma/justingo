import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assembleRoute, samplePath } from './build.ts';
import { haversine } from './geo.ts';
import type { LngLat } from './types.ts';

describe('samplePath', () => {
  it('includes both endpoints and spaces the rest evenly', () => {
    const path: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51]];
    const samples = samplePath(path, 5);
    assert.equal(samples.length, 5);
    assert.deepEqual(samples[0], path[0]);
    assert.deepEqual(samples[4], path[1]);
    const gap1 = haversine(samples[0], samples[1]);
    const gap2 = haversine(samples[1], samples[2]);
    assert.ok(Math.abs(gap1 - gap2) < 0.01, `uneven spacing: ${gap1} vs ${gap2}`);
  });

  it('returns just the two endpoints for a count of 2', () => {
    const path: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51]];
    assert.deepEqual(samplePath(path, 2), path);
  });

  it('returns just the start point for a count of 1', () => {
    const path: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51]];
    assert.deepEqual(samplePath(path, 1), [path[0]]);
  });

  it('rejects a count below 1', () => {
    const path: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51]];
    assert.throws(() => samplePath(path, 0), RangeError);
  });
});

describe('assembleRoute', () => {
  const path: LngLat[] = [[-0.1, 51.5], [-0.1, 51.501], [-0.1, 51.502]];

  it('rounds distance to the nearest metre and wires ascent through from elevation', () => {
    const r = assembleRoute({
      id: 'x',
      name: 'N',
      area: 'A',
      description: '',
      path,
      elevation: [10, 12, 11],
      verified: false,
    });
    assert.equal(r.distance, Math.round(r.distance));
    assert.equal(r.ascent, 0); // a 2 m wobble is under the 3 m noise threshold
  });

  it('filters out messages placed before the start or after the finish', () => {
    const r = assembleRoute({
      id: 'x',
      name: 'N',
      area: 'A',
      description: '',
      path,
      elevation: [10, 12, 11],
      messages: [
        { at: -5, text: 'before start' },
        { at: 50, text: 'ok' },
        { at: 99_999, text: 'past finish' },
      ],
      verified: false,
    });
    assert.deepEqual(r.messages, [{ at: 50, text: 'ok' }]);
  });

  it('marks a route as a loop only when start and finish are close together', () => {
    const loopPath: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51], [-0.1001, 51.5001]];
    const outAndBack: LngLat[] = [[-0.1, 51.5], [-0.1, 51.51]];
    const loop = assembleRoute({ id: 'a', name: 'Loop', area: 'A', description: '', path: loopPath, elevation: [1, 1, 1], verified: true });
    const notLoop = assembleRoute({ id: 'b', name: 'Not loop', area: 'A', description: '', path: outAndBack, elevation: [1, 1], verified: true });
    assert.equal(loop.loop, true);
    assert.equal(notLoop.loop, false);
  });
});
