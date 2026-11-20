import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREAS, areaRequests, buildAreas } from '../n8n/lib/areas.js';

const polish = JSON.parse(readFileSync(new URL('./fixtures/sources/lmarena-area-polish.json', import.meta.url), 'utf8'));
const KEYS = ['webdev', 'agent', 'writing', 'polish', 'math', 'image'];
const onlyPolish = () => KEYS.map((k) => (k === 'polish' ? polish : null));

test('AREAS lists the six areas in the agreed order with Polish labels', () => {
  assert.deepEqual(AREAS.map((a) => a.key), KEYS);
  assert.deepEqual(AREAS.map((a) => a.label), ['Programowanie', 'Agenci', 'Pisanie', 'Po polsku', 'Matematyka', 'Obrazy']);
});

test('areaRequests builds one datasets-server filter URL per area', () => {
  const reqs = areaRequests();
  assert.deepEqual(reqs.map((r) => r.key), KEYS);
  const pl = reqs.find((r) => r.key === 'polish').url;
  assert.ok(pl.startsWith('https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset&'));
  assert.ok(pl.includes('config=text&'));
  assert.ok(pl.includes(encodeURIComponent(`"category"='polish'`)));
  assert.ok(pl.includes('length=60'));
  assert.ok(reqs.find((r) => r.key === 'webdev').url.includes('config=webdev&'));
  assert.ok(reqs.every((r) => !/\s/.test(r.url)));
});

test('buildAreas keeps answered areas and lists the rest as missing on the first day', () => {
  const { areas, missing, writes } = buildAreas(onlyPolish(), []);
  assert.deepEqual(areas.map((a) => a.key), ['polish']);
  assert.deepEqual(missing, ['webdev', 'agent', 'writing', 'math', 'image']);
  const a = areas[0];
  assert.equal(a.label, 'Po polsku');
  assert.ok(a.rows.length > 0 && a.rows.length <= 10);
  a.rows.forEach((r, i) => assert.equal(r.rank, i + 1));
  assert.ok(a.rows.every((r) => !r.model.includes('(')));
  assert.ok(a.rows.every((r) => r.delta === null));
  assert.equal(a.new_leader, false);
  assert.ok(writes.length > 10 && writes.length <= 20);
  assert.ok(writes.every((w) => w.board === 'area_polish' && !('date' in w)));
});

test('buildAreas marks moves of one place or more, new entries and a new leader', () => {
  const first = buildAreas(onlyPolish(), []);
  const prev = first.writes.map((w) => ({ ...w, date: '2026-11-19' }));
  [prev[0].model, prev[2].model] = [prev[2].model, prev[0].model];
  const replaced = prev[5].model;
  prev[5].model = 'Gone Model';
  const { areas } = buildAreas(onlyPolish(), prev);
  const rows = areas[0].rows;
  assert.equal(rows[0].delta, 2);
  assert.equal(rows[2].delta, -2);
  assert.equal(rows.find((r) => r.model === replaced).delta, 'new');
  assert.equal(areas[0].new_leader, true);
});

test('buildAreas shows no change when the previous list is the same', () => {
  const first = buildAreas(onlyPolish(), []);
  const prev = first.writes.map((w) => ({ ...w, date: '2026-11-19' }));
  const { areas } = buildAreas(onlyPolish(), prev);
  assert.ok(areas[0].rows.every((r) => r.delta === null));
  assert.equal(areas[0].new_leader, false);
});

test('buildAreas compares with the latest earlier snapshot of the same area only', () => {
  const first = buildAreas(onlyPolish(), []);
  const older = first.writes.map((w) => ({ ...w, date: '2026-11-17', model: w.rank === 1 ? 'Old Leader' : w.model }));
  const latest = first.writes.map((w) => ({ ...w, date: '2026-11-19' }));
  const other = first.writes.map((w) => ({ ...w, board: 'area_math', date: '2026-11-19', model: 'Other ' + w.rank }));
  const { areas } = buildAreas(onlyPolish(), [...older, ...other, ...latest]);
  assert.equal(areas[0].new_leader, false);
  assert.ok(areas[0].rows.every((r) => r.delta === null));
});

test('empty or malformed answers count as missing', () => {
  for (const bad of [{ rows: [] }, 'garbage', {}, undefined]) {
    const responses = KEYS.map(() => null);
    responses[0] = bad;
    const { areas, missing } = buildAreas(responses, []);
    assert.deepEqual(areas, []);
    assert.deepEqual(missing, KEYS);
  }
});
