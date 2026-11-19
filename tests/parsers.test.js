import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLmarena, parseHfTrending, parseAaModels, parseMassiveAggs } from '../n8n/lib/parsers.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/sources/${name}`, import.meta.url), 'utf8');
const MALFORMED = ['', '{}', '<html></html>', 'null', '[]'];

function assertRows(rows, min) {
  assert.ok(Array.isArray(rows), 'rows is an array');
  assert.ok(rows.length >= min, `at least ${min} rows, got ${rows.length}`);
  rows.forEach((r, i) => {
    assert.equal(typeof r.rank, 'number');
    assert.equal(typeof r.score, 'number');
    assert.equal(typeof r.model, 'string');
    assert.equal(typeof r.org, 'string');
    assert.equal(r.rank, i + 1, 'ranks are 1..n in order');
  });
}

test('parseLmarena reads the official dataset rows (category overall), ranked by rank', () => {
  const rows = parseLmarena(fixture('lmarena-text-overall.json'));
  assertRows(rows, 10);
  assert.ok(rows[0].score >= rows[1].score);
});

test('parseLmarena ignores rows from other categories', () => {
  const input = JSON.stringify({
    rows: [
      { row: { model_name: 'A', organization: 'x', rating: 1500, rank: 1, category: 'coding' } },
      { row: { model_name: 'B', organization: 'y', rating: 1400, rank: 1, category: 'overall' } },
    ],
  });
  assert.deepEqual(parseLmarena(input), [{ rank: 1, model: 'B', org: 'y', score: 1400 }]);
});

test('parseHfTrending reads the models API sorted by trending score', () => {
  const rows = parseHfTrending(fixture('hf-trending.json'));
  assertRows(rows, 10);
  assert.ok(rows[0].model.includes('/'));
  assert.equal(rows[0].org, rows[0].model.split('/')[0]);
});

test('parseAaModels reads the real free API response, ranked by intelligence index, skipping unscored models', () => {
  const rows = parseAaModels(fixture('aa-models-free.json'));
  assertRows(rows, 20);
  assert.ok(rows[0].score >= rows[1].score);
  assert.equal(rows.length, 30);
  assert.ok(rows.every((r) => r.org.length > 0));
});

test('parseAaModels merges several pages passed as an array', () => {
  const page = JSON.parse(fixture('aa-models-free.json'));
  const half = Math.floor(page.data.length / 2);
  const rows = parseAaModels([{ ...page, data: page.data.slice(0, half) }, { ...page, data: page.data.slice(half) }]);
  assert.equal(rows.length, parseAaModels(page).length);
});

test('parseMassiveAggs reads daily bars into ascending date/close rows', () => {
  const rows = parseMassiveAggs(fixture('massive-nvda-daily.json'));
  assert.ok(rows.length >= 20);
  assert.match(rows[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(rows.every((r, i) => i === 0 || r.date > rows[i - 1].date));
  assert.ok(rows.every((r) => Number.isFinite(r.close)));
});

test('parseMassiveAggs maps bar timestamps to the trading date', () => {
  const rows = parseMassiveAggs({ status: 'OK', results: [{ t: Date.UTC(2026, 10, 17, 5), c: 101.5 }, { t: Date.UTC(2026, 10, 14, 5), c: 100 }] });
  assert.deepEqual(rows, [{ date: '2026-11-14', close: 100 }, { date: '2026-11-17', close: 101.5 }]);
});

test('parsers accept already-parsed objects too', () => {
  const obj = JSON.parse(fixture('hf-trending.json'));
  assert.equal(parseHfTrending(obj).length, parseHfTrending(JSON.stringify(obj)).length);
});

for (const [name, fn] of [['parseLmarena', parseLmarena], ['parseHfTrending', parseHfTrending], ['parseAaModels', parseAaModels], ['parseMassiveAggs', parseMassiveAggs]]) {
  test(`${name} returns null on malformed input`, () => {
    for (const input of MALFORMED) assert.equal(fn(input), null, JSON.stringify(input));
  });
}
