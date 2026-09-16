import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { duration, estimate, km, pace, shortDistance } from './format.ts';

describe('duration', () => {
  it('formats seconds under a minute as 0:ss', () => {
    assert.equal(duration(0), '0:00');
  });

  it('clamps a negative duration to zero rather than going negative', () => {
    assert.equal(duration(-5000), '0:00');
  });

  it('includes hours once the run passes an hour', () => {
    assert.equal(duration(3_661_000), '1:01:01');
  });

  it('rounds to the nearest second', () => {
    assert.equal(duration(59_999), '1:00');
  });
});

describe('pace', () => {
  it('shows an en dash for null', () => {
    assert.equal(pace(null), '–');
  });

  it('shows an en dash for undefined', () => {
    assert.equal(pace(undefined), '–');
  });

  it('shows an en dash for zero', () => {
    assert.equal(pace(0), '–');
  });

  it('shows an en dash for Infinity', () => {
    assert.equal(pace(Infinity), '–');
  });

  it('shows an en dash for NaN', () => {
    assert.equal(pace(NaN), '–');
  });

  it('shows an en dash just over the one-hour-per-km cutoff', () => {
    assert.equal(pace(3601), '–');
  });

  it('formats a typical running pace as m:ss', () => {
    assert.equal(pace(330), '5:30');
  });

  it('pads seconds under 10', () => {
    assert.equal(pace(301), '5:01');
  });
});

describe('km', () => {
  it('rounds up to 1.0 for anything within 0.5 m of a full kilometre', () => {
    assert.equal(km(999), '1.0');
  });

  it('formats zero', () => {
    assert.equal(km(0), '0.0');
  });
});

describe('shortDistance', () => {
  it('rounds a metre distance to the nearest 10', () => {
    assert.equal(shortDistance(64), '60 m');
  });

  it('clamps a negative distance to 0 m', () => {
    assert.equal(shortDistance(-5), '0 m');
  });

  it('switches to kilometres at exactly 1000 m', () => {
    assert.equal(shortDistance(1000), '1.0 km');
  });
});

describe('estimate', () => {
  it('returns zero minutes for zero distance', () => {
    assert.equal(estimate(0), '0 min');
  });

  it('stays in minutes just under an hour', () => {
    assert.equal(estimate(10_000), '55 min');
  });

  it('switches to hours and minutes once the estimate reaches an hour', () => {
    assert.equal(estimate(20_000), '1 h 50 min');
  });

  it('uses a supplied pace instead of the default', () => {
    assert.equal(estimate(1000, 330), '6 min');
  });
});
