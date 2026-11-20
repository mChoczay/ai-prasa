import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { glossaryPrompt, mergeGlossary } from '../n8n/lib/glossary.js';

const edition = () => ({
  date: '2026-11-21',
  lead_story: { title: 'Sprzedaż chipów H200 do Chin', lede: 'Commerce zatwierdziło eksport.', body: 'Długi tekst o chipach. '.repeat(60) },
  stories: [
    { title: 'Nvidia po wynikach', lede: 'Rekordowy przychód.', body: 'H200 i Blackwell.' },
    { title: 'PostgreSQL 19', lede: 'WAIT FOR LSN.', body: 'Repliki.' },
  ],
});
const known = (id, term, explain = 'Znane.') => ({ term_id: id, term, explain, first_date: '2026-11-20' });

test('the glossary prompt numbers the stories and lists known terms', () => {
  const text = glossaryPrompt(edition(), [known('lsn', 'LSN')]);
  assert.match(text, /\[0\] Sprzedaż chipów H200 do Chin/);
  assert.match(text, /\[2\] PostgreSQL 19/);
  assert.match(text, /LSN/);
  assert.ok(!text.includes('Reader feedback'));
  assert.ok(text.split('Długi tekst').join('').length < text.length, 'body excerpt included');
  assert.ok(text.length < 4000, 'body is cut');
  assert.match(glossaryPrompt(edition(), [], 'nie wiem co to H200'), /## Reader feedback\nnie wiem co to H200/);
});

test('new terms get rows, ids and a place on their stories', () => {
  const answer = { stories: [
    { idx: 0, terms: [{ term: 'H200', explain: 'Układ Nvidii do AI.' }, { term: 'eksport chipów', explain: 'Zasady sprzedaży.' }] },
    { idx: 1, terms: [{ term: 'h200', explain: '' }] },
  ] };
  const { edition: e, newRows, glossaryJson } = mergeGlossary(edition(), answer, [], '2026-11-21');
  assert.deepEqual(newRows.map((r) => r.term_id), ['h200', 'eksport-chipow']);
  assert.ok(newRows.every((r) => r.first_date === '2026-11-21'));
  assert.deepEqual(e.lead_story.terms, ['h200', 'eksport-chipow']);
  assert.deepEqual(e.stories[0].terms, ['h200']);
  assert.equal(e.stories[1].terms, undefined);
  assert.deepEqual(glossaryJson.terms.map((t) => t.id), ['eksport-chipow', 'h200']);
});

test('a known term is reused without a new row', () => {
  const answer = { stories: [{ idx: 0, terms: [{ term: 'H200 ', explain: '' }] }] };
  const { edition: e, newRows, glossaryJson } = mergeGlossary(edition(), answer, [known('h200', 'H200')], '2026-11-21');
  assert.deepEqual(newRows, []);
  assert.deepEqual(e.lead_story.terms, ['h200']);
  assert.deepEqual(glossaryJson.terms, [{ id: 'h200', term: 'H200', explain: 'Znane.' }]);
});

test('invalid or excess entries are dropped and long explanations are cut', () => {
  const t = (term, explain = 'Opis.') => ({ term, explain });
  const answer = { stories: [
    { idx: 0, terms: [t('A1'), t('A2'), t('A3'), t('A4')] },
    { idx: 99, terms: [t('Z')] },
    { idx: 1, terms: [t(''), t('Nowe bez opisu', ''), t('Długie', 'x'.repeat(900))] },
  ] };
  const { edition: e, newRows } = mergeGlossary(edition(), answer, [], '2026-11-21');
  assert.deepEqual(e.lead_story.terms, ['a1', 'a2', 'a3']);
  assert.deepEqual(e.stories[0].terms, ['dlugie']);
  assert.equal(newRows.find((r) => r.term_id === 'dlugie').explain.length, 600);
  assert.ok(!newRows.some((r) => r.term_id === 'z' || r.term_id === 'nowe-bez-opisu'));
});

test('at most twelve terms per edition', () => {
  const many = (base) => [1, 2, 3].map((k) => ({ term: `${base}${k}`, explain: 'Opis.' }));
  const e = edition();
  e.stories.push(...[3, 4, 5].map((n) => ({ title: `S${n}`, lede: '', body: '' })));
  const answer = { stories: [0, 1, 2, 3, 4, 5].map((idx) => ({ idx, terms: many(`T${idx}x`) })) };
  const { newRows } = mergeGlossary(e, answer, [], '2026-11-21');
  assert.equal(newRows.length, 12);
});

test('no usable answer leaves the stories alone and keeps the known glossary', () => {
  for (const answer of [null, {}, { stories: 'x' }]) {
    const { edition: e, newRows, glossaryJson } = mergeGlossary(edition(), answer, [known('lsn', 'LSN')], '2026-11-21');
    assert.equal(e.lead_story.terms, undefined);
    assert.deepEqual(newRows, []);
    assert.deepEqual(glossaryJson.terms.map((x) => x.id), ['lsn']);
  }
});

test('the glossary schema asks for stories with idx and terms', () => {
  const schema = JSON.parse(readFileSync(new URL('../schemas/glossary.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.required, ['stories']);
  assert.deepEqual(schema.properties.stories.items.required, ['idx', 'terms']);
  assert.deepEqual(schema.properties.stories.items.properties.terms.items.required, ['term', 'explain']);
});
