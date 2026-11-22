import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editPrompt, applyEdits, numbersIn } from '../n8n/lib/edit.js';

const words = (n, w = 'słowo') => Array.from({ length: n }, () => w).join(' ');
const story = (title, body, extra = {}) => ({ title, lede: 'Lead tekstu.', body, for_you: 'Sprawdź wersję 2.3.1.', category: 'narzedzia', status: 'potwierdzone', sources: [], ...extra });
const edition = () => ({
  date: '2026-11-22',
  lead_story: story('OpenRouter: incydenty', `Badacze wysłali 2 mln promptów. ${words(98)}`),
  stories: [story('GPGME 2.3.1', `Luka w wersji 2.3.1. ${words(60)}`)],
  weekly: { title: 'Tydzień', body: `Spadek o 22,92%. ${words(200)}`, takeaways: ['a', 'b', 'c'], race_map: [{ area: 'Chipy', leader: 'Nvidia', note: '115,84 mld USD' }] },
  monthly: null,
  minutes: 9,
  supplement_minutes: 2,
});

test('numbersIn finds whole numbers with their decimal parts', () => {
  assert.deepEqual(numbersIn('Wersja 2.3.1, spadek 22,92% i 17 mln.'), ['2.3.1', '22,92', '17']);
  assert.deepEqual(numbersIn('bez liczb'), []);
});

test('editPrompt lists every story by idx and the supplement, and adds the reader feedback', () => {
  const text = editPrompt(edition(), 'Notes from the reader: masło maślane');
  assert.match(text, /### Story idx 0\nTitle: OpenRouter: incydenty\nLede: Lead tekstu\.\nBody:\nBadacze wysłali 2 mln promptów/);
  assert.match(text, /### Story idx 1\nTitle: GPGME 2\.3\.1/);
  assert.match(text, /### Supplement weekly\nTitle: Tydzień/);
  assert.match(text, /Takeaways:\n- a\n- b\n- c/);
  assert.match(text, /## Reader feedback\nNotes from the reader: masło maślane/);
  assert.doesNotMatch(editPrompt(edition(), ''), /Reader feedback/);
});

test('good edits replace the text and the reading time follows', () => {
  const answer = {
    stories: [
      { idx: 0, lede: 'Nowy lead.', body: `Badacze wysłali 2 mln promptów.\n\n${words(48)}`, for_you: 'Sprawdź dostawców.' },
      { idx: 1, lede: 'Krótko.', body: `Luka w wersji 2.3.1. ${words(40)}`, for_you: 'Zaktualizuj do 2.3.1.' },
    ],
    supplements: [{ kind: 'weekly', title: 'Tydzień spadków', body: `## Rynek\n\nSpadek o 22,92%. ${words(120)}`, takeaways: ['x', 'y', 'z'] }],
  };
  const { edition: e, report } = applyEdits(edition(), answer);
  assert.equal(e.lead_story.lede, 'Nowy lead.');
  assert.equal(e.lead_story.title, 'OpenRouter: incydenty');
  assert.equal(e.stories[0].for_you, 'Zaktualizuj do 2.3.1.');
  assert.equal(e.weekly.title, 'Tydzień spadków');
  assert.deepEqual(e.weekly.takeaways, ['x', 'y', 'z']);
  assert.deepEqual(e.weekly.race_map, edition().weekly.race_map);
  assert.ok(e.minutes < 9);
  assert.equal(e.supplement_minutes, 1);
  assert.deepEqual(report.kept, []);
});

test('an edit that adds a number keeps the original text', () => {
  const answer = { stories: [{ idx: 1, lede: 'Krótko.', body: `Luka dotyczy 40 tys. serwerów. ${words(55)}`, for_you: 'x' }], supplements: [] };
  const { edition: e, report } = applyEdits(edition(), answer);
  assert.equal(e.stories[0].body, edition().stories[0].body);
  assert.deepEqual(report.kept, ['story 1: new number 40']);
});

test('numbers may come from the title, and supplements may use numbers from their table', () => {
  const answer = {
    stories: [{ idx: 1, lede: 'GPGME 2.3.1 łata lukę.', body: words(50), for_you: 'x' }],
    supplements: [{ kind: 'weekly', title: 'T', body: `Nvidia: 115,84 mld USD. ${words(150)}`, takeaways: ['1', '2', '3'].map((n) => `punkt ${n === '1' ? 'pierwszy' : 'kolejny'}`) }],
  };
  const { report } = applyEdits(edition(), answer);
  assert.deepEqual(report.kept, []);
});

test('an edit that cuts too much, grows too much or drops a field keeps the original', () => {
  const tooShort = applyEdits(edition(), { stories: [{ idx: 0, lede: 'l', body: words(20), for_you: 'f' }], supplements: [] });
  assert.deepEqual(tooShort.report.kept, ['story 0: length 20 of 103 words']);
  const tooLong = applyEdits(edition(), { stories: [{ idx: 1, lede: 'l', body: words(90), for_you: 'f' }], supplements: [] });
  assert.deepEqual(tooLong.report.kept, ['story 1: length 90 of 64 words']);
  const empty = applyEdits(edition(), { stories: [{ idx: 1, lede: '', body: words(60), for_you: 'f' }], supplements: [] });
  assert.deepEqual(empty.report.kept, ['story 1: empty field']);
});

test('a supplement with another kind or another number of takeaways keeps the original', () => {
  const wrongKind = applyEdits(edition(), { stories: [], supplements: [{ kind: 'monthly', title: 'T', body: words(150), takeaways: ['a', 'b', 'c'] }] });
  assert.equal(wrongKind.edition.monthly, null);
  assert.deepEqual(wrongKind.report.kept, []);
  const twoTakeaways = applyEdits(edition(), { stories: [], supplements: [{ kind: 'weekly', title: 'T', body: words(150), takeaways: ['a', 'b'] }] });
  assert.equal(twoTakeaways.edition.weekly.title, 'Tydzień');
  assert.deepEqual(twoTakeaways.report.kept, ['weekly: 2 takeaways instead of 3']);
});

test('no answer, a broken answer or an unknown idx leave the edition as it was', () => {
  for (const answer of [null, {}, { stories: 'x', supplements: null }, { stories: [{ idx: 7, lede: 'l', body: 'b', for_you: 'f' }, null], supplements: [null] }]) {
    const { edition: e } = applyEdits(edition(), answer);
    assert.deepEqual(e, edition());
  }
});

test('applyEdits does not change its input', () => {
  const input = edition();
  applyEdits(input, { stories: [{ idx: 0, lede: 'Nowy lead.', body: `Badacze wysłali 2 mln promptów. ${words(60)}`, for_you: 'f' }], supplements: [] });
  assert.deepEqual(input, edition());
});

test('the edit schema asks for stories by idx and supplements by kind', () => {
  const schema = JSON.parse(readFileSync(new URL('../schemas/edit.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.required, ['stories', 'supplements']);
  assert.deepEqual(schema.properties.stories.items.required, ['idx', 'lede', 'body', 'for_you']);
  assert.deepEqual(schema.properties.supplements.items.properties.kind.enum, ['weekly', 'monthly']);
});
