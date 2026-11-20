import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChanges, findBigMoves, diffLeaderboard, findFollowUps } from '../n8n/lib/moves.js';

// 40 trading days (weekends skipped) ending Tue 2026-11-17, close = 100 + index.
function tradingRows() {
  const rows = [];
  const d = new Date(Date.UTC(2026, 10, 17));
  while (rows.length < 40) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) rows.unshift({ date: d.toISOString().slice(0, 10), close: 0 });
    d.setUTCDate(d.getUTCDate() - 1);
  }
  rows.forEach((r, i) => (r.close = 100 + i));
  return rows;
}

test('computeChanges uses the last trading day on or before asOf', () => {
  const rows = tradingRows();
  const r = computeChanges(rows, '2026-11-18');
  assert.equal(r.last_trade_date, '2026-11-17');
  assert.equal(r.close, 139);
  assert.equal(r.change_1d, 0.72); // 139 / 138
  assert.equal(r.change_7d, 3.73); // vs 2026-11-10 (close 134)
  assert.equal(r.change_30d, 18.8); // vs 2026-10-16 (close 117)
});

test('computeChanges on a weekend reports Friday and keeps Friday changes', () => {
  const rows = tradingRows().filter((r) => r.date <= '2026-11-13');
  const r = computeChanges(rows, '2026-11-15');
  assert.equal(r.last_trade_date, '2026-11-13');
});

test('computeChanges returns null without data and null fields without enough history', () => {
  assert.equal(computeChanges([], '2026-11-18'), null);
  const r = computeChanges([{ date: '2026-11-17', close: 10 }], '2026-11-18');
  assert.deepEqual([r.change_1d, r.change_7d, r.change_30d], [null, null, null]);
});

const snap = (ticker, change_1d, change_7d, last_trade_date = '2026-11-17') => ({ ticker, change_1d, change_7d, last_trade_date });

test('findBigMoves flags d1 and d7 moves at the thresholds', () => {
  const moves = findBigMoves({
    snapshots: [snap('NVDA', 3, 1), snap('AMD', -2.99, -8), snap('INTC', 1, 2)],
    moveLog: [],
    today: '2026-11-18',
  });
  assert.deepEqual(
    moves.map((m) => [m.entity_id, m.kind, m.change]),
    [
      ['nvda', 'd1', 3],
      ['amd', 'd7', -8],
    ],
  );
  assert.equal(moves[0].board, 'market');
  assert.equal(moves[0].log_date, '2026-11-17');
  assert.equal(moves[1].log_date, '2026-11-18');
});

test('findBigMoves does not repeat a d1 move for the same trading day (weekend/stale data)', () => {
  const moves = findBigMoves({
    snapshots: [snap('NVDA', 4.5, 1, '2026-11-13')],
    moveLog: [{ date: '2026-11-13', entity_id: 'nvda', kind: 'd1' }],
    today: '2026-11-15',
  });
  assert.deepEqual(moves, []);
});

test('findBigMoves repeats d7 only after 7 days', () => {
  const recent = findBigMoves({
    snapshots: [snap('NVDA', 0, 9)],
    moveLog: [{ date: '2026-11-15', entity_id: 'nvda', kind: 'd7' }],
    today: '2026-11-18',
  });
  assert.deepEqual(recent, []);
  const old = findBigMoves({
    snapshots: [snap('NVDA', 0, 9)],
    moveLog: [{ date: '2026-11-10', entity_id: 'nvda', kind: 'd7' }],
    today: '2026-11-18',
  });
  assert.equal(old.length, 1);
});

const board = (...models) => models.map((m, i) => ({ rank: i + 1, model: m, org: 'o', score: 100 - i }));

test('diffLeaderboard reports up, down, new and out, ignoring 1-place shifts', () => {
  const prev = board('A', 'B', 'C', 'D', 'E');
  const curr = board('C', 'A', 'B', 'X', 'D');
  const moves = diffLeaderboard(prev, curr, { board: 'lmarena', minShift: 2, topN: 5 });
  const byId = Object.fromEntries(moves.map((m) => [m.entity_id, m]));
  assert.deepEqual([byId.c.kind, byId.c.from, byId.c.to], ['up', 3, 1]);
  assert.deepEqual([byId.x.kind, byId.x.from, byId.x.to], ['new', null, 4]);
  assert.deepEqual([byId.e.kind, byId.e.from, byId.e.to], ['out', 5, null]);
  assert.equal(byId.a, undefined);
  assert.equal(byId.b, undefined);
  assert.equal(byId.d, undefined);
  assert.equal(moves[0].board, 'lmarena');
});

test('diffLeaderboard reports a drop of 2 or more as down', () => {
  const moves = diffLeaderboard(board('A', 'B', 'C'), board('B', 'C', 'A'), { board: 'aa', topN: 3 });
  assert.deepEqual(moves.map((m) => [m.entity_id, m.kind]), [['a', 'down']]);
});

test('diffLeaderboard with no previous snapshot returns no moves', () => {
  assert.deepEqual(diffLeaderboard([], board('A'), { board: 'aa' }), []);
  assert.deepEqual(diffLeaderboard(null, board('A'), { board: 'aa' }), []);
});

test('findFollowUps links moves to tags within 1..5 days, latest tag first', () => {
  const moves = [
    { entity_id: 'nvda', kind: 'd1', change: 4.1, board: 'market' },
    { entity_id: 'amd', kind: 'd1', change: -3.5, board: 'market' },
    { entity_id: 'intc', kind: 'd1', change: 5, board: 'market' },
  ];
  const impactTags = [
    { date: '2026-11-13', story_title: 'Stary news NVIDIA', entity_id: 'nvda' },
    { date: '2026-11-16', story_title: 'Nowszy news NVIDIA', entity_id: 'nvda' },
    { date: '2026-11-12', story_title: 'News AMD 6 dni', entity_id: 'amd' },
    { date: '2026-11-18', story_title: 'Dzisiejszy news Intel', entity_id: 'intc' },
  ];
  const f = findFollowUps({ impactTags, moves, today: '2026-11-18' });
  assert.deepEqual(f, [{ entity_id: 'nvda', move: '4.1', related_story: 'Nowszy news NVIDIA', story_date: '2026-11-16' }]);
});

test('findFollowUps includes the 5-day boundary', () => {
  const f = findFollowUps({
    impactTags: [{ date: '2026-11-13', story_title: 'Granica', entity_id: 'nvda' }],
    moves: [{ entity_id: 'nvda', kind: 'd1', change: 4, board: 'market' }],
    today: '2026-11-18',
  });
  assert.equal(f.length, 1);
});

test('findFollowUps keeps one entry per company, the biggest moves first, at most three', () => {
  const tag = (entity_id, date, story_title) => ({ entity_id, date, story_title });
  const impactTags = [tag('googl', '2026-11-19', 'Genie 4'), tag('nvda', '2026-11-19', 'Intel 18A'), tag('amzn', '2026-11-19', 'Intel 18A'), tag('meta', '2026-11-19', 'Muse'), tag('crwv', '2026-11-19', 'Nvidia wyniki')];
  const moves = [
    { entity_id: 'googl', change: -3.46 },
    { entity_id: 'googl', change: -8.72 },
    { entity_id: 'nvda', change: -3.3 },
    { entity_id: 'amzn', change: -3.87 },
    { entity_id: 'meta', change: -3.27 },
    { entity_id: 'crwv', change: -6.1 },
    { entity_id: 'x', change: '+2 (lmarena)' },
  ];
  const f = findFollowUps({ impactTags, moves, today: '2026-11-20' });
  assert.deepEqual(f.map((x) => [x.entity_id, x.move]), [['googl', '-8.72'], ['crwv', '-6.1'], ['amzn', '-3.87']]);
});
