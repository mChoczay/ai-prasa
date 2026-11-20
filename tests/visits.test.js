import test from 'node:test';
import assert from 'node:assert/strict';
import { visitRanges, visitSummary } from '../n8n/lib/visits.js';

const span = (r) => [r.kind, r.start, r.end];

test('a Monday edition asks for the past Warsaw week', () => {
  assert.deepEqual(visitRanges('2026-11-23').map(span), [['week', '2026-11-15T23:00:00Z', '2026-11-22T23:00:00Z']]);
});

test('other days ask for nothing', () => {
  assert.deepEqual(visitRanges('2026-11-24'), []);
  assert.deepEqual(visitRanges('nonsense'), []);
});

test('a week across the autumn clock change starts in summer time and ends in winter time', () => {
  assert.deepEqual(visitRanges('2026-10-26').map(span), [['week', '2026-10-18T22:00:00Z', '2026-10-25T23:00:00Z']]);
});

test('the first of the month asks for the previous Warsaw month', () => {
  assert.deepEqual(visitRanges('2026-12-01').map(span), [['month', '2026-10-31T23:00:00Z', '2026-11-30T23:00:00Z']]);
});

test('a Monday that is also the first asks for both', () => {
  assert.deepEqual(visitRanges('2027-02-01').map((r) => r.kind), ['week', 'month']);
});

test('range URLs call the stats total endpoint with encoded times', () => {
  for (const d of ['2026-11-23', '2026-12-01', '2027-02-01']) {
    for (const r of visitRanges(d)) {
      assert.ok(r.url.startsWith('https://api-prasa.goatcounter.com/api/v0/stats/total?start=20'), r.url);
      assert.ok(r.url.includes(`start=${encodeURIComponent(r.start)}&end=${encodeURIComponent(r.end)}`), r.url);
      assert.ok(!/\s/.test(r.url));
    }
  }
});

test('the week summary orders days Monday to Sunday and fills gaps with zero', () => {
  const body = { total: 6, stats: [{ day: '2026-11-16', daily: 2 }, { day: '2026-11-19', daily: 3 }, { day: '2026-11-30', daily: 9 }] };
  assert.deepEqual(visitSummary(visitRanges('2026-11-23'), [body]), {
    week: { first: '2026-11-16', last: '2026-11-22', total: 6, days: [2, 0, 0, 3, 0, 0, 0] },
  });
});

test('the month summary carries the month and its total', () => {
  assert.deepEqual(visitSummary(visitRanges('2026-12-01'), [{ total: 23, stats: [] }]), { month: { year: 2026, month: 11, total: 23 } });
});

test('a failed answer leaves its part out, and nothing left means null', () => {
  for (const bad of [null, {}, { error: 'x' }, { total: 'six' }]) assert.equal(visitSummary(visitRanges('2026-11-23'), [bad]), null);
  const both = visitSummary(visitRanges('2027-02-01'), [null, { total: 4 }]);
  assert.deepEqual(both, { month: { year: 2027, month: 1, total: 4 } });
  assert.equal(visitSummary([], []), null);
});
