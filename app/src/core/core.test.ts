import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assembleRoute } from './build.ts';
import { buildCues, NavEngine, spokenDistance } from './engine.ts';
import { cumulativeDistances, haversine, pathLength, project } from './geo.ts';
import { parseGpx, toGpx } from './gpx.ts';
import { RunSimulator } from './simulator.ts';
import { detectTurns } from './turns.ts';
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

const route = (path: LngLat[], name = 'Test Route', names = [] as { at: number; name: string }[]) =>
  assembleRoute({
    id: 't',
    name,
    area: 'Test',
    description: '',
    path,
    names,
    elevation: [10, 12, 11, 15],
    verified: true,
  });

/** Runs the simulator along the route and collects everything spoken. */
function run(r: ReturnType<typeof route>, opts: { step?: number; sideways?: (along: number) => number } = {}) {
  const engine = new NavEngine(r);
  const sim = new RunSimulator(r.path, 300, 0);
  const spoken: { along: number; text: string }[] = [];
  let guard = 0;
  do {
    sim.sideways = opts.sideways?.(sim.along) ?? 0;
    const res = engine.update(sim.advance(opts.step ?? 3));
    for (const text of res.spoken) spoken.push({ along: Math.round(sim.along), text });
    assert.ok(guard++ < 10_000, 'simulation did not finish');
  } while (!sim.done);
  // A couple of samples at the finish line.
  for (const text of engine.update(sim.advance(1)).spoken) spoken.push({ along: Math.round(sim.along), text });
  return { engine, spoken };
}

describe('geo', () => {
  it('measures one degree of latitude as ~111 km', () => {
    assert.ok(Math.abs(haversine([0, 51], [0, 52]) - 111_195) < 50);
  });

  it('projects a point beside the path onto it', () => {
    const path = line([0, 0], [1000, 0]);
    const p = project(path, cumulativeDistances(path), m(400, 25));
    assert.ok(Math.abs(p.along - 400) < 1, `along ${p.along}`);
    assert.ok(Math.abs(p.offset - 25) < 1, `offset ${p.offset}`);
  });
});

describe('detectTurns', () => {
  it('finds no turns on a straight line', () => {
    assert.deepEqual(detectTurns(line([0, 0], [1000, 0])), []);
  });

  it('finds a left turn going east then north', () => {
    const turns = detectTurns(line([0, 0], [500, 0], [500, 500]));
    assert.equal(turns.length, 1);
    assert.equal(turns[0].direction, 'left');
    assert.ok(Math.abs(turns[0].at - 500) <= 10, `at ${turns[0].at}`);
  });

  it('finds a right turn going east then south', () => {
    const turns = detectTurns(line([0, 0], [500, 0], [500, -500]));
    assert.deepEqual(turns.map((t) => t.direction), ['right']);
  });

  it('ignores a small jog that nets out to straight', () => {
    assert.deepEqual(detectTurns(line([0, 0], [300, 0], [310, 10], [600, 10])), []);
  });

  it('attaches the nearest street name', () => {
    const turns = detectTurns(line([0, 0], [500, 0], [500, 500]), [
      { at: 0, name: 'Start Road' },
      { at: 505, name: 'Exhibition Road' },
    ]);
    assert.equal(turns[0].onto, 'Exhibition Road');
  });

  it('marks a hairpin as a U-turn', () => {
    const turns = detectTurns(line([0, 0], [500, 0], [500, 8], [0, 8]));
    assert.deepEqual(turns.map((t) => t.direction), ['uturn']);
  });
});

describe('buildCues', () => {
  it('announces a turn at 200 m and again just before it', () => {
    const cues = buildCues(route(line([0, 0], [500, 0], [500, 500])));
    const kinds = cues.map((c) => c.kind);
    assert.deepEqual(kinds, ['start', 'turn-far', 'turn-near', 'finish']);
    assert.equal(cues[1].text, 'In 200 metres, turn left.');
    assert.equal(cues[2].text, 'Turn left.');
  });

  it('chains a second turn that follows within 80 m', () => {
    const cues = buildCues(route(line([0, 0], [500, 0], [500, 60], [1000, 60])));
    const near = cues.filter((c) => c.kind === 'turn-near');
    assert.equal(near.length, 1, JSON.stringify(cues));
    assert.equal(near[0].text, 'Turn left, then turn right.');
  });

  it('adds a halfway cue only on routes of 1.5 km or more', () => {
    assert.ok(!buildCues(route(line([0, 0], [1000, 0]))).some((c) => c.kind === 'halfway'));
    assert.ok(buildCues(route(line([0, 0], [2000, 0]))).some((c) => c.kind === 'halfway'));
  });

  it('speaks distances in runner-friendly units', () => {
    assert.equal(spokenDistance(187), '200 metres');
    assert.equal(spokenDistance(64), '60 metres');
    assert.equal(spokenDistance(1000), '1 kilometre');
    assert.equal(spokenDistance(5432), '5.4 kilometres');
  });
});

describe('NavEngine on a simulated run', () => {
  it('speaks every cue exactly once, in order, at the right place', () => {
    const r = route(line([0, 0], [500, 0], [500, 700]), 'Corner Loop');
    const { spoken, engine } = run(r);
    const texts = spoken.map((s) => s.text);
    assert.deepEqual(texts, [
      'Starting Corner Loop. 1.2 kilometres. Enjoy your run.',
      'In 200 metres, turn left.',
      'Turn left.',
      "1 kilometre. Average pace 5 minutes per kilometre.",
      "You've finished Corner Loop. Great run.",
    ]);
    const far = spoken.find((s) => s.text.startsWith('In 200'))!;
    assert.ok(far.along >= 290 && far.along <= 320, `far cue at ${far.along}`);
    const near = spoken.find((s) => s.text === 'Turn left.')!;
    assert.ok(near.along >= 460 && near.along <= 490, `near cue at ${near.along}`);
    assert.equal(engine.state.finished, true);
  });

  it('warns when the runner is 40 m off route and confirms when back', () => {
    const r = route(line([0, 0], [2000, 0]));
    const { spoken } = run(r, { sideways: (a) => (a > 600 && a < 900 ? 40 : 0) });
    const texts = spoken.map((s) => s.text);
    assert.equal(texts.filter((t) => t.startsWith("You're off route")).length, 1);
    assert.equal(texts.filter((t) => t === 'Back on route.').length, 1);
    const off = texts.indexOf("You're off route. Head back to the route.");
    assert.ok(off < texts.indexOf('Back on route.'));
  });

  it('does not warn for 20 m of drift (GPS noise, other side of the road)', () => {
    const r = route(line([0, 0], [2000, 0]));
    const { spoken } = run(r, { sideways: (a) => (a > 600 && a < 900 ? 20 : 0) });
    assert.ok(!spoken.some((s) => s.text.includes('off route')));
  });

  it('keeps progress on the return leg of an out-and-back', () => {
    // Out 500 m east and back along a parallel path 8 m away: the return leg passes within
    // metres of the outbound leg, so a naive nearest-point match would jump backwards.
    const r = route(line([0, 0], [500, 0], [500, 8], [0, 8]));
    const engine = new NavEngine(r);
    const sim = new RunSimulator(r.path, 300, 0);
    let maxAlong = 0;
    while (!sim.done) {
      const { state } = engine.update(sim.advance(3));
      assert.ok(state.along >= maxAlong, `progress went backwards: ${state.along} < ${maxAlong}`);
      maxAlong = state.along;
    }
    assert.ok(maxAlong > 990, `ended at ${maxAlong}`);
  });

  it('drops a cue the runner jumped past instead of speaking it late', () => {
    const r = route(line([0, 0], [500, 0], [500, 500]));
    const engine = new NavEngine(r);
    const sim = new RunSimulator(r.path, 300, 0);
    engine.update(sim.advance(1));
    engine.update(sim.advance(1));
    // Jump from ~7 m to 600 m in one plausible-looking step (100 s later).
    sim.seek(600);
    sim.time += 100_000;
    const { spoken } = engine.update(sim.sample());
    assert.deepEqual(spoken, []);
  });

  it('ignores an impossible GPS jump', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    const { state } = engine.update({ lng: m(1500, 0)[0], lat: m(1500, 0)[1], time: 1000 });
    assert.ok(state.distanceRun < 1, `counted ${state.distanceRun} m`);
  });

  it('computes pace and ETA from sample timestamps', () => {
    const r = route(line([0, 0], [3000, 0]));
    const engine = new NavEngine(r);
    const sim = new RunSimulator(r.path, 360, 0);
    while (sim.along < 1500) engine.update(sim.advance(3));
    const s = engine.state;
    assert.ok(Math.abs(s.avgPace! - 360) < 5, `pace ${s.avgPace}`);
    assert.ok(Math.abs(s.etaMs! / 1000 - 1.5 * 360) < 15, `eta ${s.etaMs}`);
  });
});

describe('gpx', () => {
  it('round-trips a path', () => {
    const path = line([0, 0], [300, 0], [300, 300]);
    const parsed = parseGpx(toGpx('Round & Trip', path));
    assert.equal(parsed.name, 'Round & Trip');
    assert.equal(parsed.path.length, path.length);
    assert.ok(Math.abs(pathLength(parsed.path) - pathLength(path)) < 1);
  });

  it('reads route points with attributes in either order', () => {
    const xml = '<gpx><rte><rtept lon="-0.1" lat="51.5"/><rtept lat="51.51" lon="-0.1"/></rte></gpx>';
    assert.deepEqual(parseGpx(xml).path, [[-0.1, 51.5], [-0.1, 51.51]]);
  });

  it('rejects a file with no points', () => {
    assert.throws(() => parseGpx('<gpx></gpx>'), /No track or route points/);
  });
});
