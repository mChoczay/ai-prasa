import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLmarena, parseHfTrending, parseAaModels } from '../n8n/lib/parsers.js';

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

test('parseAaModels ranks by intelligence index and drops models without a score', () => {
  const rows = parseAaModels(fixture('aa-models-free.synthetic.json'));
  assert.deepEqual(rows, [
    { rank: 1, model: 'Model A (High)', org: 'Firma A', score: 71.2 },
    { rank: 2, model: 'Model D (Low)', org: 'Firma A', score: 68.9 },
    { rank: 3, model: 'Model B', org: 'Firma B', score: 64 },
  ]);
});

test('parsers accept already-parsed objects too', () => {
  const obj = JSON.parse(fixture('hf-trending.json'));
  assert.equal(parseHfTrending(obj).length, parseHfTrending(JSON.stringify(obj)).length);
});

for (const [name, fn] of [['parseLmarena', parseLmarena], ['parseHfTrending', parseHfTrending], ['parseAaModels', parseAaModels]]) {
  test(`${name} returns null on malformed input`, () => {
    for (const input of MALFORMED) assert.equal(fn(input), null, JSON.stringify(input));
  });
}
