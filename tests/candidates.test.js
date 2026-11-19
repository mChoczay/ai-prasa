import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateList, filterPrompt, applyTriage } from '../n8n/lib/candidates.js';

const now = new Date('2026-11-19T04:30:00Z');
const feedItem = (title, link, isoDate, snippet = 'x') => ({ title, link, isoDate, contentSnippet: snippet });

test('buildCandidateList keeps recent items, newest first, with source host and idx', () => {
  const list = buildCandidateList(
    [
      feedItem('Old news', 'https://a.com/old', '2026-11-17T10:00:00Z'),
      feedItem('Newer', 'https://www.b.com/n', '2026-11-19T02:00:00Z'),
      feedItem('Recent', 'https://a.com/r', '2026-11-18T20:00:00Z'),
    ],
    { now, maxAgeHours: 30, max: 150 },
  );
  assert.deepEqual(list.map((c) => [c.idx, c.title, c.source]), [
    [0, 'Newer', 'b.com'],
    [1, 'Recent', 'a.com'],
  ]);
  assert.equal(list[0].url, 'https://www.b.com/n');
  assert.equal(list[0].published_at, '2026-11-19T02:00:00.000Z');
});

test('buildCandidateList uses pubDate when isoDate is missing and skips items without title or link', () => {
  const list = buildCandidateList(
    [{ title: 'Has pubDate', link: 'https://c.com/1', pubDate: 'Wed, 19 Nov 2026 01:00:00 GMT' }, { title: '', link: 'https://c.com/2' }, { title: 'No link' }, {}],
    { now, maxAgeHours: 30, max: 150 },
  );
  assert.deepEqual(list.map((c) => c.title), ['Has pubDate']);
});

test('buildCandidateList drops duplicates, trims snippets and caps the list', () => {
  const many = Array.from({ length: 10 }, (_, i) => feedItem(`Story ${i}`, `https://d.com/${i}`, '2026-11-19T01:00:00Z', 'y'.repeat(1000)));
  many.push(feedItem('Story 0', 'https://other.com/0', '2026-11-19T01:00:00Z'));
  const list = buildCandidateList(many, { now, maxAgeHours: 30, max: 5 });
  assert.equal(list.length, 5);
  assert.ok(list.every((c) => c.snippet.length <= 300));
  assert.deepEqual(list.map((c) => c.idx), [0, 1, 2, 3, 4]);
});

test('buildCandidateList ignores items with an unparseable date', () => {
  assert.deepEqual(buildCandidateList([feedItem('Bad date', 'https://e.com/1', 'not a date')], { now, maxAgeHours: 30, max: 10 }), []);
});

test('filterPrompt lists covered topics and numbered candidates', () => {
  const text = filterPrompt(
    [{ idx: 0, title: 'A', source: 'a.com', published_at: '2026-11-19T02:00:00.000Z', snippet: 's' }],
    [{ title: 'Covered before' }],
  );
  assert.match(text, /Covered before/);
  assert.match(text, /\[0\] A — a\.com — 2026-11-19T02:00/);
});

test('applyTriage keeps kept items by importance, clamps values and ignores unknown idx', () => {
  const candidates = [0, 1, 2, 3].map((idx) => ({ idx, title: `T${idx}`, url: `https://x.com/${idx}`, source: 'x.com', published_at: '2026-11-19T00:00:00.000Z', snippet: '' }));
  const top = applyTriage(candidates, { items: [
    { idx: 0, category: 'modele', importance: 3, keep: true },
    { idx: 1, category: 'gielda', importance: 9, keep: true },
    { idx: 2, category: 'inne', importance: 5, keep: false },
    { idx: 7, category: 'inne', importance: 5, keep: true },
  ] }, { max: 15 });
  assert.deepEqual(top.map((c) => [c.idx, c.category, c.importance]), [[1, 'gielda', 5], [0, 'modele', 3]]);
});

test('applyTriage caps at max and survives a missing triage', () => {
  const candidates = Array.from({ length: 20 }, (_, idx) => ({ idx, title: `T${idx}`, url: `https://x.com/${idx}` }));
  const triage = { items: candidates.map((c) => ({ idx: c.idx, category: 'inne', importance: 3, keep: true })) };
  assert.equal(applyTriage(candidates, triage, { max: 15 }).length, 15);
  assert.deepEqual(applyTriage(candidates, null, { max: 15 }), []);
});
