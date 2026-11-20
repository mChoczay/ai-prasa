import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  firstSentence,
  tabTitle,
  dateParts,
  marketMood,
  whyShort,
  marketTiles,
  rankingChanges,
  rankingNotes,
  readerPages,
  minutesLabel,
} from '../site/js/shape.js';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const real = load('./fixtures/edition-2026-11-19.json');
const sample = load('./fixtures/edition-2026-11-18.json');

test('firstSentence keeps the text up to the first sentence end', () => {
  assert.equal(firstSentence('Rynek spadał. Potem rósł.'), 'Rynek spadał.');
  assert.equal(firstSentence('Czy to koniec? Nie.'), 'Czy to koniec?');
  assert.equal(firstSentence('Bez kropki'), 'Bez kropki');
  assert.equal(firstSentence('Wzrost o 2.5 proc. dziś. Jutro?'), 'Wzrost o 2.5 proc. dziś.');
  assert.equal(firstSentence(''), '');
  assert.equal(firstSentence(null), '');
});

test('marketMood prefers mood and falls back to the first sentence of the commentary', () => {
  assert.equal(marketMood({ mood: 'Trudny tydzień.', commentary: 'Długi tekst. Dalej.' }), 'Trudny tydzień.');
  assert.equal(marketMood(real.market), firstSentence(real.market.commentary));
  assert.equal(marketMood(null), '');
});

test('whyShort prefers why_short and falls back to the first sentence of why', () => {
  assert.equal(whyShort({ why_short: 'po wynikach', why: 'Długo. Bardzo.' }), 'po wynikach');
  assert.equal(whyShort({ why: 'Brak jednoznacznej przyczyny. Reszta.' }), 'Brak jednoznacznej przyczyny.');
});

test('marketTiles takes the four largest market moves with company names', () => {
  const tiles = marketTiles(real);
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles.map((t) => [t.ticker, t.change, t.period]), [
    ['CRWV', -21.29, '7d'],
    ['SMCI', -19.91, '7d'],
    ['NVDA', -13.11, '7d'],
    ['MU', -13.07, '7d'],
  ]);
  assert.equal(tiles[0].name, 'CoreWeave');
  assert.equal(tiles[0].why_type, real.big_moves.find((m) => m.entity_id === 'crwv').why_type);
  assert.ok(tiles.every((t) => t.why_short));
});

test('marketTiles uses the one-day change when it is the bigger signal and skips unknown tickers', () => {
  const edition = {
    market: { rows: [{ ticker: 'AMD', name: 'AMD', change_1d: 5.31, change_7d: -4.12 }] },
    big_moves: [
      { entity_id: 'amd', board: 'market', why: 'x.', why_type: 'brak' },
      { entity_id: 'zzz', board: 'market', why: 'y.', why_type: 'brak' },
      { entity_id: 'gemini-4-neon', board: 'lmarena', why: 'z.', why_type: 'brak' },
    ],
  };
  assert.deepEqual(marketTiles(edition).map((t) => [t.ticker, t.change, t.period]), [['AMD', 5.31, '1d']]);
  assert.deepEqual(marketTiles({}), []);
});

test('rankingChanges lists new entries and moves of two or more places with their why', () => {
  const edition = {
    rankings: {
      lmarena: [
        { rank: 1, model: 'Gemini 4 Carbon', org: 'google', delta: null },
        { rank: 2, model: 'Gemini 4 Neon', org: 'google', delta: 'new' },
        { rank: 3, model: 'Claude Opus 5.5', org: 'anthropic', delta: 1 },
        { rank: 4, model: 'Muse Wonder', org: 'meta', delta: -3 },
      ],
      aa: null,
    },
    big_moves: [{ entity_id: 'gemini-4-neon', board: 'lmarena', why: 'Premiera. Szczegóły.', why_short: 'nowy model Google', why_type: 'fakt' }],
  };
  assert.deepEqual(rankingChanges(edition).map((c) => [c.board, c.model, c.rank, c.delta, c.why_short]), [
    ['lmarena', 'Gemini 4 Neon', 2, 'new', 'nowy model Google'],
    ['lmarena', 'Muse Wonder', 4, -3, ''],
  ]);
  assert.deepEqual(rankingChanges(real), []);
});

test('rankingNotes prefers notes and falls back to the commentary', () => {
  assert.deepEqual(rankingNotes({ rankings: { notes: [{ board: 'aa', text: 'Prowadzi Fable.' }] } }), [{ board: 'aa', text: 'Prowadzi Fable.' }]);
  assert.deepEqual(rankingNotes(real), [{ board: null, text: real.rankings.commentary.trim() }]);
  assert.deepEqual(rankingNotes({ rankings: { commentary: '' } }), []);
});

test('readerPages puts the lead first, then stories, then supplements, numbered from 1', () => {
  const pages = readerPages({ lead_story: { title: 'L' }, stories: [{ title: 'A' }, { title: 'B' }], weekly: { title: 'W' }, monthly: null });
  assert.deepEqual(pages.map((p) => [p.kind, p.n]), [['story', 1], ['story', 2], ['story', 3], ['weekly', 4]]);
  assert.equal(pages[0].story.title, 'L');
  assert.equal(readerPages(sample).length, 5);
});

test('minutesLabel shows the supplement time separately', () => {
  assert.equal(minutesLabel({ minutes: 15, supplement_minutes: 6 }), 'ok. 15 min + dodatek 6 min');
  assert.equal(minutesLabel({ minutes: 19 }), 'ok. 19 min');
  assert.equal(minutesLabel({ minutes: 12, supplement_minutes: 0 }), 'ok. 12 min');
});

test('tabTitle gives name and short Polish date, reader page and archive', () => {
  const e = { date: '2026-11-19', lead_story: { title: 'Genie 4' }, stories: [{ title: 'PostgreSQL 19' }] };
  assert.equal(tabTitle('front', e), 'Prasa AI · czw 19 lis');
  assert.equal(tabTitle('reader', e, 2), '2/2 · PostgreSQL 19');
  assert.equal(tabTitle('archive'), 'Archiwum · Prasa AI');
  assert.equal(tabTitle('error'), 'Poranna prasa AI');
  assert.equal(tabTitle('front', { date: '2026-03-01' }), 'Prasa AI · ndz 1 mar');
  assert.equal(tabTitle('reader', { date: '2026-11-19', lead_story: { title: 'A' }, weekly: { title: 'Tydzień' } }, 2), '2/2 · Tydzień');
});

test('tabTitle never shows "undefined" for a story without a title', () => {
  assert.equal(tabTitle('reader', { date: '2026-11-19', lead_story: {} }, 1), '1/1 · Prasa AI');
});

test('dateParts gives the Polish day, short and full month names', () => {
  assert.deepEqual(dateParts('2026-11-20'), { day: 20, month: 11, year: 2026, weekday: 'pt', monthShort: 'lis', monthName: 'listopad' });
  assert.deepEqual(dateParts('2026-10-04').monthName, 'październik');
  assert.equal(dateParts('x'), null);
});
