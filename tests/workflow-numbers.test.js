import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/sources/${name}`, import.meta.url), 'utf8'));
const code = codeNodeSource('n8n/workflows/numbers.workflow.js', 'Compute numbers');
const refDaysCode = codeNodeSource('n8n/workflows/numbers.workflow.js', 'Market reference days');
const closesCode = codeNodeSource('n8n/workflows/numbers.workflow.js', 'Watchlist closes');
const grouped = fixture('massive-grouped-2026-11-18.json');
const shift = (day, factor) => ({ results: grouped.results.map((b) => ({ T: b.T, t: Date.parse(day + 'T05:00:00Z'), c: Math.round(b.c * factor * 100) / 100 })) });
const days = [grouped, shift('2026-11-17', 0.97), shift('2026-11-11', 0.9), shift('2026-10-19', 1.2)];
const ok = (body) => ({ statusCode: 200, body });

function baseNodes(overrides = {}) {
  return {
    'Numbers request': [{ date: '2026-11-19' }],
    'US tickers': [{ ticker: 'NVDA', name: 'NVIDIA' }, { ticker: 'AMD', name: 'AMD' }],
    'Watchlist closes': [{ days: [days[0], days[1], days[2], days[3]].map((d) => ({ results: d.results.filter((b) => b.T === 'NVDA') })) }],
    'LMArena leaderboard': [ok(fixture('lmarena-text-overall.json'))],
    'Hugging Face trending': [ok(fixture('hf-trending.json'))],
    'Artificial Analysis models': [ok(fixture('aa-models-free.json')), { statusCode: 500, body: {} }],
    'Recent leaderboard snapshots': [{}],
    'Recent move log': [{}],
    'Recent impact tags': [{}],
    ...overrides,
  };
}

test('compute numbers builds market rows only for tickers with data', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes() });
  assert.equal(json.market.rows.length, 1);
  assert.equal(json.market.rows[0].ticker, 'NVDA');
  assert.match(json.market.as_of, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(json.writes.market.length, 1);
});

test('compute numbers ranks all three boards and caps them at 20', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes() });
  for (const board of ['lmarena', 'aa', 'hf_trending']) {
    assert.ok(Array.isArray(json.rankings[board]), board);
    assert.ok(json.rankings[board].length > 0 && json.rankings[board].length <= 20, board);
  }
  assert.equal(json.ranking_moves.length, 0, 'first day has no previous snapshot');
  assert.ok(json.leaderboard_top.length > 0);
  assert.equal(json.writes.boards.length, 60 - (20 - Math.min(20, json.rankings.hf_trending.length)));
});

test('a failed source becomes null and the rest still works', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes({ 'LMArena leaderboard': [{ statusCode: 503, body: 'down' }] }) });
  assert.equal(json.rankings.lmarena, null);
  assert.ok(json.rankings.aa.length > 0);
});

test('no market data at all writes a sentinel row and market is null', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes({ 'Watchlist closes': [{ days: [] }] }) });
  assert.equal(json.market, null);
  assert.deepEqual(json.writes.market.map((r) => r.ticker), ['']);
});

test('a previous snapshot produces ranking moves with deltas and new entries', () => {
  const lm = runCodeNode(code, { nodes: baseNodes() })[0].json.rankings.lmarena;
  const prev = lm.map((r) => ({ date: '2026-11-18', board: 'lmarena', rank: r.rank, model: r.model, org: r.org, score: r.score }));
  [prev[0].model, prev[2].model] = [prev[2].model, prev[0].model];
  prev[19].model = 'Gone Model';
  const [{ json }] = runCodeNode(code, { nodes: baseNodes({ 'Recent leaderboard snapshots': prev }) });
  const kinds = json.ranking_moves.filter((m) => m.board === 'lmarena').map((m) => m.kind).sort();
  assert.deepEqual(kinds, ['down', 'new', 'out', 'up']);
  assert.ok(json.rankings.lmarena.some((r) => r.delta === 'new'));
  assert.ok(json.rankings.lmarena.some((r) => typeof r.delta === 'number' && r.delta > 0));
});

test('the move log always gets a run row plus one row per move', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes() });
  assert.equal(json.writes.moves[0].kind, 'run');
  assert.equal(json.writes.moves.length, 1 + json.big_moves.length + json.ranking_moves.length);
});

test('market reference days produce four grouped-daily requests', () => {
  const out = runCodeNode(refDaysCode, { nodes: { 'Numbers request': [{ date: '2026-11-19' }] } });
  assert.deepEqual(out.map((i) => i.json.day), ['2026-11-18', '2026-11-17', '2026-11-11', '2026-10-19']);
});

test('watchlist closes keep only watchlist tickers and skip failed days', () => {
  const out = runCodeNode(closesCode, {
    nodes: { 'US tickers': [{ ticker: 'NVDA' }, { ticker: 'AMD' }] },
    input: [{ statusCode: 200, body: grouped }, { statusCode: 429, body: { status: 'ERROR' } }],
  });
  assert.equal(out[0].json.days.length, 1);
  assert.deepEqual(out[0].json.days[0].results.map((b) => b.T).sort(), ['AMD', 'NVDA']);
});

test('compute numbers derives 1d, 7d and 30d changes from the four grouped days', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes() });
  const nvda = json.market.rows[0];
  assert.equal(nvda.last_trade_date, '2026-11-18');
  assert.equal(nvda.change_1d, 3.09);
  assert.equal(nvda.change_7d, 11.11);
  assert.equal(nvda.change_30d, -16.67);
  assert.ok(json.big_moves.some((m) => m.entity_id === 'nvda' && m.kind === 'd1'));
});

test('compute numbers drops the 1d change when the previous trading day is missing', () => {
  const noD1 = [{ days: [days[0], days[2], days[3]].map((d) => ({ results: d.results.filter((b) => b.T === 'NVDA') })) }];
  const [{ json }] = runCodeNode(code, { nodes: baseNodes({ 'Watchlist closes': noD1 }) });
  assert.equal(json.market.rows[0].change_1d, null);
  assert.equal(json.market.rows[0].change_7d, 11.11);
});

test('lmarena and aa rankings collapse model variants to one row per base model', () => {
  const [{ json }] = runCodeNode(code, { nodes: baseNodes() });
  for (const board of ['lmarena', 'aa']) {
    const names = json.rankings[board].map((r) => r.model);
    assert.equal(new Set(names).size, names.length, board);
    assert.ok(names.every((n) => !/\(/.test(n)), board);
  }
});
