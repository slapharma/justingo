import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assembleRoute } from './build.ts';
import { buildCues, NavEngine } from './engine.ts';
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

const route = (path: LngLat[], name = 'Test Route') =>
  assembleRoute({ id: 't', name, area: 'Test', description: '', path, names: [], elevation: [10, 10], verified: true });

describe('buildCues on a route with no turns', () => {
  it('produces only a start and a finish cue', () => {
    const cues = buildCues(route(line([0, 0], [500, 0])));
    assert.deepEqual(
      cues.map((c) => c.kind),
      ['start', 'finish'],
    );
  });
});

describe('NavEngine pause and resume', () => {
  it('stops the clock and ignores samples while paused', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    engine.update({ lng: m(50, 0)[0], lat: m(50, 0)[1], time: 5000 });

    engine.pause(6000);
    // A sample far down the route arrives while paused: it must be ignored entirely.
    const during = engine.update({ lng: m(1000, 0)[0], lat: m(1000, 0)[1], time: 7000 });

    assert.equal(during.state, engine.state, 'state object must be unchanged while paused');
    assert.ok(Math.abs(during.state.along - 50) < 1, `along moved to ${during.state.along}`);
    assert.deepEqual(during.spoken, []);
  });

  it('excludes paused time from elapsedMs', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    engine.update({ lng: m(50, 0)[0], lat: m(50, 0)[1], time: 5000 });
    engine.pause(6000);
    engine.update({ lng: m(1000, 0)[0], lat: m(1000, 0)[1], time: 7000 }); // ignored
    engine.resume(15000); // 9000 ms paused

    const after = engine.update({ lng: m(60, 0)[0], lat: m(60, 0)[1], time: 16000 });
    // Active time: 0 -> 6000 (before pause() was called) + 15000 -> 16000 (after resume) = 7000 ms.
    assert.equal(after.state.elapsedMs, 7000);
  });

  it('does not count the gap across a pause as distance run', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    engine.update({ lng: m(50, 0)[0], lat: m(50, 0)[1], time: 5000 });
    engine.pause(6000);
    engine.update({ lng: m(1000, 0)[0], lat: m(1000, 0)[1], time: 7000 }); // ignored
    engine.resume(15000);

    // First sample after resume: the jump from 50 m to 60 m must not be added to distanceRun.
    const first = engine.update({ lng: m(60, 0)[0], lat: m(60, 0)[1], time: 16000 });
    assert.ok(Math.abs(first.state.distanceRun - 50) < 1, `distanceRun ${first.state.distanceRun}`);

    // Normal counting resumes on the next sample.
    const second = engine.update({ lng: m(70, 0)[0], lat: m(70, 0)[1], time: 17000 });
    assert.ok(Math.abs(second.state.distanceRun - 60) < 1, `distanceRun ${second.state.distanceRun}`);
  });

  it('ignores a pause before the first fix (waiting for GPS)', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.pause(0);
    engine.resume(60_000);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 61_000 });
    const { state } = engine.update({ lng: m(30, 0)[0], lat: m(30, 0)[1], time: 71_000 });
    assert.equal(state.elapsedMs, 10_000);
  });

  it('still ignores fixes that arrive while paused before the first fix', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.pause(0);
    const during = engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 30_000 });
    assert.equal(during.state.started, false);
    assert.equal(during.state.trace.length, 0);
    assert.equal(engine.paused, true);
  });
});

describe('NavEngine off-route handling', () => {
  it('needs two off-route samples in a row before warning', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    engine.update({ lng: m(10, 0)[0], lat: m(10, 0)[1], time: 2000 });
    const firstOff = engine.update({ lng: m(20, 40)[0], lat: m(20, 40)[1], time: 7000 });
    assert.deepEqual(firstOff.spoken, [], 'a single off-route sample must not warn yet');
    assert.equal(firstOff.state.offRoute, false);
  });

  it('repeats the reminder only after 45 seconds off route', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    engine.update({ lng: m(10, 0)[0], lat: m(10, 0)[1], time: 2000 });
    engine.update({ lng: m(20, 40)[0], lat: m(20, 40)[1], time: 7000 });
    const trigger = engine.update({ lng: m(30, 40)[0], lat: m(30, 40)[1], time: 12000 });
    assert.deepEqual(trigger.spoken, ["You're off route. Head back to the route."]);

    const early = engine.update({ lng: m(31, 40)[0], lat: m(31, 40)[1], time: 12000 + 40_000 });
    assert.deepEqual(early.spoken, [], 'reminder must not repeat before 45 s');

    const due = engine.update({ lng: m(32, 40)[0], lat: m(32, 40)[1], time: 12000 + 46_000 });
    assert.deepEqual(due.spoken, ['Still off route.']);
  });
});

describe('NavEngine joining a route partway', () => {
  it('starts from the join point instead of the route start, and drops the now-stale start cue', () => {
    const r = route(line([0, 0], [500, 0], [500, 500]));
    const engine = new NavEngine(r);
    // First-ever fix is already 150 m into the route (e.g. the runner walked to the route).
    const first = engine.update({ lng: m(150, 0)[0], lat: m(150, 0)[1], time: 0 });
    assert.equal(first.state.started, true);
    assert.ok(Math.abs(first.state.along - 150) < 1, `along ${first.state.along}`);
    assert.deepEqual(first.spoken, [], 'the start cue must not be spoken 150 m in');

    const second = engine.update({ lng: m(160, 0)[0], lat: m(160, 0)[1], time: 3000 });
    assert.deepEqual(second.spoken, []);
  });
});

describe('NavEngine joining far along the route', () => {
  it('picks up a runner whose first fixes are more than 300 m along the route', () => {
    const r = route(line([0, 0], [2000, 0]));
    const engine = new NavEngine(r);
    let last = engine.update({ lng: m(500, 0)[0], lat: m(500, 0)[1], time: 0 });
    const spoken = [...last.spoken];
    for (let i = 1; i < 10; i++) {
      last = engine.update({ lng: m(500, 0)[0], lat: m(500, 0)[1], time: i * 1000 });
      spoken.push(...last.spoken);
    }
    assert.equal(last.state.started, true);
    assert.ok(Math.abs(last.state.along - 500) < 1, `along ${last.state.along}`);
    assert.deepEqual(spoken, [], 'cues joined past must be dropped as stale, not spoken at once');
  });

  it('on a loop, a first fix near the shared start and finish joins at the start, not the finish', () => {
    const r = route(line([0, 0], [500, 0], [500, 500], [0, 500], [0, 0]));
    assert.equal(r.loop, true);
    const engine = new NavEngine(r);
    // 3 m from the start and 5 m up the closing leg: nearer the finish end of the path than the start.
    const first = engine.update({ lng: m(-3, 5)[0], lat: m(-3, 5)[1], time: 0 });
    assert.equal(first.state.started, true);
    assert.equal(first.state.finished, false);
    assert.ok(first.state.along < 10, `joined at ${first.state.along}`);
  });
});

describe('buildCues chaining', () => {
  it('chains a run of close turns in pairs, never announcing a tail turn twice', () => {
    // Four turns 60 m apart: left, right, left, right.
    const r = route(line([0, 0], [500, 0], [500, 60], [560, 60], [560, 120], [1000, 120]));
    assert.deepEqual(
      r.turns.map((t) => t.direction),
      ['left', 'right', 'left', 'right'],
    );
    const near = buildCues(r).filter((c) => c.kind === 'turn-near');
    assert.deepEqual(
      near.map((c) => c.text),
      ['Turn left, then turn right.', 'Turn left, then turn right.'],
    );
    assert.deepEqual(
      near.map((c) => c.turn),
      [0, 2],
    );
  });
});

describe('NavEngine splits', () => {
  it('records each kilometre split as its own duration, not a running total', () => {
    const r = route(line([0, 0], [3000, 0]));
    const engine = new NavEngine(r);
    let along = 0;
    let time = 0;
    let last = engine.update({ lng: m(0, 0)[0], lat: m(0, 0)[1], time: 0 });
    const step = 5;
    const msPerMetre = 330; // 330 s/km pace
    while (along < 2100) {
      along += step;
      time += step * msPerMetre;
      last = engine.update({ lng: m(along, 0)[0], lat: m(along, 0)[1], time });
    }
    assert.equal(last.state.splits.length, 2);
    assert.ok(Math.abs(last.state.splits[0] - 330_000) < 500, `split 0: ${last.state.splits[0]}`);
    assert.ok(Math.abs(last.state.splits[1] - 330_000) < 500, `split 1: ${last.state.splits[1]}`);
  });
});
