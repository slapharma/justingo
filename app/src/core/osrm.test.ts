import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchElevation, fetchFootRoute, parseOsrm } from './osrm.ts';
import type { LngLat } from './types.ts';

const ORIGIN: LngLat = [-0.1, 51.5];
const M_PER_DEG_LAT = 111_195;
const m = (x: number, y: number): LngLat => [
  ORIGIN[0] + x / (M_PER_DEG_LAT * Math.cos((ORIGIN[1] * Math.PI) / 180)),
  ORIGIN[1] + y / M_PER_DEG_LAT,
];

describe('parseOsrm error handling', () => {
  it('throws the service message when the routing code is not Ok', () => {
    assert.throws(
      () => parseOsrm({ code: 'NoRoute', message: 'Could not find route', routes: [] } as any),
      /Could not find route/,
    );
  });

  it('falls back to a generic message with the code when none is given', () => {
    assert.throws(() => parseOsrm({ code: 'NoRoute', routes: [] } as any), /Routing failed \(NoRoute\)/);
  });

  it('throws when the code is Ok but there are no routes', () => {
    assert.throws(() => parseOsrm({ code: 'Ok', routes: [] } as any), /Routing failed \(Ok\)/);
  });
});

describe('parseOsrm success path', () => {
  it('dedupes consecutive duplicate coordinates and projects step names onto the path', () => {
    const coords = [m(0, 0), m(0, 0), m(100, 0), m(200, 0), m(300, 0)]; // duplicate at the start
    const json = {
      code: 'Ok',
      routes: [
        {
          geometry: { coordinates: coords },
          legs: [
            {
              steps: [
                { name: 'Cavendish Ave', maneuver: { location: m(100, 0), type: 'turn' } },
                { name: '', maneuver: { location: m(150, 0), type: 'turn' } }, // unnamed, skipped
                { name: 'Exhibition Rd', maneuver: { location: m(300, 0), type: 'arrive' } },
              ],
            },
          ],
        },
      ],
    };
    const result = parseOsrm(json as any);
    assert.equal(result.path.length, 4, 'the duplicate leading point must be dropped');
    assert.equal(result.names.length, 2, 'the unnamed step must be skipped');
    assert.equal(result.names[0].name, 'Cavendish Ave');
    assert.ok(Math.abs(result.names[0].at - 100) < 1, `at ${result.names[0].at}`);
    assert.equal(result.names[1].name, 'Exhibition Rd');
    assert.ok(Math.abs(result.names[1].at - 300) < 1, `at ${result.names[1].at}`);
  });
});

describe('fetchElevation', () => {
  it('chunks requests at 100 points and concatenates the results in order', async () => {
    const points: LngLat[] = Array.from({ length: 250 }, (_, i) => [i * 0.001, i * 0.001]);
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      const n = new URL(url).searchParams.get('latitude')!.split(',').length;
      const callIndex = calls.length;
      const elevation = Array.from({ length: n }, (_, i) => callIndex * 1000 + i);
      return { ok: true, json: async () => ({ elevation }) } as Response;
    }) as typeof fetch;

    const result = await fetchElevation(points, fetchImpl);
    assert.equal(calls.length, 3, 'expected 3 chunks for 250 points');
    const chunkSizes = calls.map((u) => new URL(u).searchParams.get('latitude')!.split(',').length);
    assert.deepEqual(chunkSizes, [100, 100, 50]);
    assert.equal(result.length, 250);
    // First point of chunk 2 should be the first element returned for that call (index 0 -> 2000).
    assert.equal(result[100], 2000);
  });

  it('throws when the elevation service responds with a non-ok status', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch;
    await assert.rejects(fetchElevation([[0, 0]], fetchImpl), /Elevation service returned 503/);
  });
});

describe('fetchFootRoute', () => {
  it('builds the OSRM URL from the waypoints', async () => {
    let capturedUrl = '';
    const fetchImpl = (async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => ({ code: 'Ok', routes: [{ geometry: { coordinates: [[-0.1, 51.5], [-0.09, 51.51]] }, legs: [{ steps: [] }] }] }),
      } as Response;
    }) as typeof fetch;

    await fetchFootRoute([[-0.1, 51.5], [-0.09, 51.51]], fetchImpl);
    assert.ok(capturedUrl.startsWith('https://routing.openstreetmap.de/routed-foot/route/v1/foot/'));
    assert.ok(capturedUrl.includes('-0.100000,51.500000;-0.090000,51.510000'), capturedUrl);
  });

  it('throws when the routing service responds with a non-ok status', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
    await assert.rejects(
      fetchFootRoute([[-0.1, 51.5], [-0.09, 51.51]], fetchImpl),
      /Routing service returned 500/,
    );
  });
});
