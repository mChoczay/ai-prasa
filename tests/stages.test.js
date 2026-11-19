import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPrompt, applySelection, relatedCandidates, fetchList, buildArticles } from '../n8n/lib/select.js';
import { capBigMoves, pickSchema, entityList, storiesPrompt, frontPrompt, assembleEdition, finalizeEdition } from '../n8n/lib/write.js';

const cand = (idx, title, extra = {}) => ({
  idx,
  title,
  url: `https://news.example/${idx}`,
  source: 'news.example',
  published_at: '2026-11-19T03:00:00.000Z',
  snippet: `snippet ${idx}`,
  category: 'modele',
  importance: 3,
  ...extra,
});

const candidates = [
  cand(1, 'Anthropic IPO raises $81 billion', { category: 'inwestycje', importance: 5 }),
  cand(2, 'Gemini 4 Neon launches'),
  cand(3, 'Leak: GPT-7 training run', { category: 'przecieki' }),
  cand(4, 'Anthropic IPO opens on Nasdaq at record price'),
  cand(5, 'Intel signs 18A customer', { category: 'inwestycje' }),
];

test('selectPrompt lists candidates with category and importance, and covered titles', () => {
  const text = selectPrompt(candidates, ['Old story']);
  assert.match(text, /\[1\] Anthropic IPO raises \$81 billion — news\.example — inwestycje, importance 5/);
  assert.match(text, /- Old story/);
});

test('applySelection drops unknown and repeated idx, keeps rumors out of stories and caps counts', () => {
  const sel = applySelection(candidates, { lead_idx: 1, story_idx: [2, 1, 9, 5, 3, 2], rumor_idx: [3, 1], extra_queries: [] }, { maxStories: 2 });
  assert.equal(sel.lead.idx, 1);
  assert.deepEqual(sel.stories.map((c) => c.idx), [2, 5]);
  assert.deepEqual(sel.rumors.map((c) => c.idx), [3]);
});

test('applySelection falls back to the most important candidate when lead_idx is invalid', () => {
  const sel = applySelection(candidates, { lead_idx: 42, story_idx: [2], rumor_idx: [], extra_queries: [] });
  assert.equal(sel.lead.idx, 1);
  assert.deepEqual(sel.stories.map((c) => c.idx), [2]);
  assert.equal(applySelection([], null).lead, null);
});

test('relatedCandidates finds other coverage of the same event by title words', () => {
  const rel = relatedCandidates(candidates[0], candidates, 2);
  assert.deepEqual(rel.map((c) => c.idx), [4]);
});

test('fetchList returns each chosen url once, with up to 2 related urls per item', () => {
  const sel = applySelection(candidates, { lead_idx: 1, story_idx: [2, 4], rumor_idx: [], extra_queries: [] });
  const list = fetchList(sel, candidates);
  assert.deepEqual(list.map((f) => f.url), ['https://news.example/1', 'https://news.example/4', 'https://news.example/2']);
});

test('buildArticles uses fetched text when long enough and falls back to the snippet', () => {
  const sel = applySelection(candidates, { lead_idx: 1, story_idx: [2], rumor_idx: [3], extra_queries: [] });
  const long = `<html><body><nav>menu</nav><p>${'Anthropic sold shares. '.repeat(40)}</p></body></html>`;
  const fetched = [
    { url: 'https://news.example/1', statusCode: 200, body: long },
    { url: 'https://news.example/4', statusCode: 403, body: 'denied' },
    { url: 'https://news.example/2', statusCode: 200, body: '<p>short</p>' },
  ];
  const arts = buildArticles(sel, candidates, fetched);
  assert.deepEqual(arts.map((a) => [a.role, a.idx]), [['lead', 1], ['story', 2], ['rumor', 3]]);
  assert.equal(arts[0].text_ok, true);
  assert.match(arts[0].text, /Anthropic sold shares/);
  assert.doesNotMatch(arts[0].text, /menu/);
  assert.equal(arts[0].related.length, 1);
  assert.equal(arts[0].related[0].text, 'snippet 4');
  assert.equal(arts[1].text_ok, false);
  assert.equal(arts[1].text, 'snippet 2');
});

test('capBigMoves keeps the largest absolute changes, one entry per entity and kind', () => {
  const moves = [
    { entity_id: 'a', kind: 'd1', change: 3.1 },
    { entity_id: 'b', kind: 'd7', change: -21.3 },
    { entity_id: 'c', kind: 'd7', change: 9 },
    { entity_id: 'b', kind: 'd1', change: -4.1 },
  ];
  assert.deepEqual(capBigMoves(moves, 2).map((m) => m.entity_id + m.kind), ['bd7', 'cd7']);
  assert.deepEqual(capBigMoves(null, 6), []);
});

test('pickSchema builds a strict object schema from chosen top-level properties', () => {
  const full = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'array', items: { type: 'string' } }, c: { type: 'string' } }, required: ['a', 'b', 'c'], additionalProperties: false };
  const part = pickSchema(full, ['b', 'a']);
  assert.deepEqual(Object.keys(part.properties), ['b', 'a']);
  assert.deepEqual(part.required, ['b', 'a']);
  assert.equal(part.additionalProperties, false);
  assert.throws(() => pickSchema(full, ['x']), /unknown property: x/);
});

test('entityList merges profiles and active watchlist entries without duplicates', () => {
  const list = entityList(
    [{ entity_id: 'nvda', name: 'NVIDIA', aliases: 'Nvidia,NVDA', type: 'company' }],
    [{ ticker: 'NVDA', name: 'NVIDIA', active: true }, { ticker: 'AMD', name: 'AMD', active: true }, { ticker: 'X', name: 'Gone', active: false }],
  );
  assert.deepEqual(list.map((e) => [e.id, e.name]), [['nvda', 'NVIDIA'], ['amd', 'AMD']]);
  assert.equal(list[1].aliases, 'AMD');
});

const articles = [
  { role: 'lead', idx: 1, title: 'Lead title', url: 'https://news.example/1', source: 'news.example', published_at: '2026-11-19T03:00:00.000Z', category: 'inwestycje', text: 'Lead text', text_ok: true, related: [{ title: 'Other', url: 'https://news.example/4', source: 'news.example', text: 'rel text' }] },
  { role: 'story', idx: 2, title: 'Story title', url: 'https://news.example/2', source: 'news.example', published_at: '2026-11-19T03:00:00.000Z', category: 'modele', text: 'Story text', text_ok: true, related: [] },
  { role: 'rumor', idx: 3, title: 'Rumor title', url: 'https://news.example/3', source: 'news.example', published_at: '2026-11-19T03:00:00.000Z', category: 'przecieki', text: 'Rumor text', text_ok: false, related: [] },
];

test('storiesPrompt carries story and rumor articles but not the lead', () => {
  const text = storiesPrompt({ date: '2026-11-19', articles, leakers: [{ name: 'Leaker', platform: 'X', note: 'n' }], entities: [{ id: 'nvda', name: 'NVIDIA', aliases: 'NVDA' }], historyTitles: ['Old'] });
  assert.match(text, /Story title/);
  assert.match(text, /Rumor title/);
  assert.match(text, /only the snippet/);
  assert.doesNotMatch(text, /Lead title/);
  assert.match(text, /Leaker \(X\)/);
  assert.match(text, /NVIDIA/);
});

test('frontPrompt carries the lead, the written stories, numbers and capped moves', () => {
  const numbers = {
    market: { as_of: '2026-11-18', rows: [{ ticker: 'NVDA', name: 'NVIDIA', close: 150.96, change_1d: -2.89, change_7d: -13.11, change_30d: -30.46, last_trade_date: '2026-11-18' }] },
    rankings: { lmarena: [{ rank: 1, model: 'Gemini 4 Carbon', org: 'google', score: 1538.2, delta: 'new' }], aa: null, hf_trending: [] },
    big_moves: [{ entity_id: 'nvda', board: 'market', kind: 'd7', change: -13.11 }],
    ranking_moves: [],
    follow_ups: [{ entity_id: 'nvda', move: '-13.11', related_story: 'Earlier', story_date: '2026-11-17' }],
  };
  const text = frontPrompt({ date: '2026-11-19', articles, written: { stories: [{ title: 'Story title', lede: 'Story lede' }], rumors: [] }, numbers, candidates, leakers: [], entities: [], historyTitles: [] });
  assert.match(text, /Lead title/);
  assert.match(text, /Story lede/);
  assert.match(text, /NVIDIA \(NVDA\): close 150\.96, 1d -2\.89%, 7d -13\.11%, 30d -30\.46%/);
  assert.match(text, /nvda — market — 7d -13\.11%/);
  assert.match(text, /#1 Gemini 4 Carbon \(google\) new/);
  assert.match(text, /Artificial Analysis: dane niedostępne/);
  assert.match(text, /Earlier/);
});

const storyOut = (title, url, extra = {}) => ({ title, category: 'modele', status: 'potwierdzone', is_update: false, lede: 'l', body: 'b', for_you: 'f', may_affect_names: [], sources: [{ name: 's', url, primary: true }], ...extra });

test('assembleEdition merges both parts and drops sources whose url was not in the input', () => {
  const ed = assembleEdition({
    storiesPart: {
      stories: [storyOut('S1', 'https://news.example/2?utm_source=x'), storyOut('S2', 'https://invented.example/a')],
      rumors: [{ title: 'R', body: 'b', sources: [{ name: 's', url: 'https://news.example/3', primary: false }] }],
    },
    frontPart: { greeting: 'g', lead_story: storyOut('L', 'https://news.example/1'), market: { commentary: 'm' }, rankings: { commentary: 'r' }, big_moves: [], follow_ups: [], closing: 'c' },
    knownUrls: ['https://news.example/1', 'https://news.example/2', 'https://news.example/3'],
  });
  assert.equal(ed.lead_story.title, 'L');
  assert.equal(ed.stories.length, 2);
  assert.equal(ed.stories[0].sources.length, 1);
  assert.equal(ed.stories[1].sources.length, 0);
  assert.equal(ed.rumors[0].sources.length, 1);
  assert.equal(ed.greeting, 'g');
});

test('finalizeEdition adds dates, tables, minutes and keeps only supplied moves', () => {
  const checked = {
    greeting: 'g',
    lead_story: storyOut('L', 'https://news.example/1'),
    stories: [],
    market: { commentary: 'm', disclaimer: 'To nie jest porada inwestycyjna.' },
    rankings: { commentary: 'r' },
    rumors: [],
    big_moves: [
      { entity_id: 'nvda', board: 'market', change: '-13.11%', why: 'w', why_type: 'brak', sources: [] },
      { entity_id: 'made-up', board: 'market', change: '+1%', why: 'w', why_type: 'brak', sources: [] },
    ],
    follow_ups: [{ entity_id: 'zzz', move: 'x', related_story: 'y', story_date: '2026-11-17' }],
    closing: 'c',
    quiet_day: true,
  };
  const numbers = { market: { rows: [{ ticker: 'NVDA' }], as_of: '2026-11-18' }, rankings: { lmarena: [{ rank: 1 }], aa: null, hf_trending: [] }, big_moves: [{ entity_id: 'nvda' }], ranking_moves: [], follow_ups: [] };
  const e = finalizeEdition(checked, { date: '2026-11-19', generatedAt: '2026-11-19T05:40:00.000Z', numbers, allowedMoveIds: ['nvda'] });
  assert.equal(e.date, '2026-11-19');
  assert.equal(e.edition, 'daily');
  assert.equal(e.generated_at, '2026-11-19T05:40:00.000Z');
  assert.deepEqual(e.market.rows, [{ ticker: 'NVDA' }]);
  assert.equal(e.market.as_of, '2026-11-18');
  assert.equal(e.market.disclaimer, 'To nie jest porada inwestycyjna.');
  assert.deepEqual(e.rankings.lmarena, [{ rank: 1 }]);
  assert.equal(e.rankings.aa, null);
  assert.equal(e.rankings.commentary, 'r');
  assert.deepEqual(e.big_moves.map((m) => m.entity_id), ['nvda']);
  assert.deepEqual(e.follow_ups, []);
  assert.equal(e.weekly, null);
  assert.equal(e.monthly, null);
  assert.equal(e.spotlight, null);
  assert.equal(e.quiet_day, true);
  assert.ok(e.minutes >= 1);
});

test('finalizeEdition keeps the market commentary but no rows when market data is missing', () => {
  const e = finalizeEdition(
    { greeting: 'g', lead_story: null, stories: [], market: { commentary: 'm', disclaimer: 'd' }, rankings: { commentary: 'r' }, rumors: [], big_moves: [], follow_ups: [], closing: 'c', quiet_day: true },
    { date: '2026-11-19', generatedAt: 'x', numbers: { market: null, rankings: null }, allowedMoveIds: [] },
  );
  assert.equal(e.market.rows, null);
  assert.deepEqual([e.rankings.lmarena, e.rankings.aa, e.rankings.hf_trending], [null, null, null]);
});
