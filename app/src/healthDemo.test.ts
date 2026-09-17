import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoRunHealth, HEALTH_SOURCES, MIN_HEALTH_MS, trendText, WATCH_RUNS, WELLNESS, ZONE_NAMES, zoneFor, type RunHealth } from './healthDemo.ts';

const run = { id: 'run-abc123', elapsedMs: 31 * 60_000 + 17_000, distanceRun: 5240 };

function healthOf(r: typeof run): RunHealth {
  const h = demoRunHealth(r);
  assert.ok(h, `expected health figures for ${r.id}`);
  return h;
}

describe('zoneFor', () => {
  it('puts each boundary in the zone above it', () => {
    assert.equal(zoneFor(113), 1);
    assert.equal(zoneFor(114), 2);
    assert.equal(zoneFor(151), 3);
    assert.equal(zoneFor(152), 4);
    assert.equal(zoneFor(171), 5);
  });
});

describe('demoRunHealth', () => {
  it('returns the same figures for the same run', () => {
    assert.deepEqual(healthOf(run), healthOf({ ...run }));
  });

  it('returns different figures for a different run', () => {
    assert.notDeepEqual(healthOf(run).hrSeries, healthOf({ ...run, id: 'run-other' }).hrSeries);
  });

  it('splits exactly the elapsed time across the zones', () => {
    for (const id of ['a', 'run-1', 'run-xyz', 'demo-42']) {
      const h = healthOf({ ...run, id });
      assert.equal(h.zoneMs.reduce((s, ms) => s + ms, 0), run.elapsedMs, id);
      assert.ok(h.zoneMs.every((ms) => ms >= 0), id);
    }
  });

  it('keeps average and max consistent with the series', () => {
    const h = healthOf(run);
    assert.equal(h.maxHr, Math.max(...h.hrSeries));
    assert.ok(h.avgHr <= h.maxHr && h.avgHr >= Math.min(...h.hrSeries));
    assert.ok(h.hrSeries.every((b) => b > 60 && b < 200));
  });

  it('has no figures for a run that never started', () => {
    assert.equal(demoRunHealth({ id: 'empty', elapsedMs: 0, distanceRun: 0 }), null);
  });

  it('has no figures for a run under a minute, and figures from a minute on', () => {
    assert.equal(demoRunHealth({ ...run, elapsedMs: MIN_HEALTH_MS - 1 }), null);
    assert.ok(demoRunHealth({ ...run, elapsedMs: MIN_HEALTH_MS }));
  });

  it('has no figures when elapsed time is missing or negative', () => {
    assert.equal(demoRunHealth({ ...run, elapsedMs: Number.NaN }), null);
    assert.equal(demoRunHealth({ ...run, elapsedMs: -5000 }), null);
  });
});

describe('trendText', () => {
  it('calls a falling resting heart rate good', () => {
    const t = trendText({ id: 'r', label: 'Resting HR', unit: 'bpm', week: [51, 48], lowerIsBetter: true });
    assert.deepEqual(t, { text: 'Down 3 bpm this week', good: true });
  });

  it('calls a falling HRV not good', () => {
    const t = trendText({ id: 'h', label: 'HRV', unit: 'ms', week: [60, 55.5], lowerIsBetter: false });
    assert.deepEqual(t, { text: 'Down 4.5 ms this week', good: false });
  });

  it('reports no change as steady', () => {
    assert.equal(trendText({ id: 's', label: 'Steps', unit: '', week: [9000, 9000], lowerIsBetter: false }).text, 'Steady this week');
  });
});

describe('demo content', () => {
  it('uses the website zone names', () => {
    assert.deepEqual([...ZONE_NAMES], ['Warm-up', 'Easy', 'Aerobic', 'Threshold', 'Maximum']);
  });

  it('has seven days for every wellness metric', () => {
    for (const m of WELLNESS) assert.equal(m.week.length, 7, m.id);
  });

  it('has unique ids', () => {
    for (const list of [HEALTH_SOURCES, WATCH_RUNS, WELLNESS]) {
      const ids = list.map((x) => x.id);
      assert.equal(new Set(ids).size, ids.length);
    }
  });
});
