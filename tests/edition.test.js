import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  resolveEntity,
  checkEditionRules,
  collectNewEntities,
  pickSpotlight,
  readingMinutes,
  upsertIndex,
  resolvePending,
} from '../n8n/lib/edition.js';

const sample = () => JSON.parse(readFileSync(new URL('./fixtures/edition.sample.json', import.meta.url), 'utf8'));
const profiles = [
  { id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'Nvidia,NVDA' },
  { id: 'model-x', type: 'model', name: 'Model X', aliases: '' },
];
const DISCLAIMER = 'To nie jest porada inwestycyjna.';

test('resolveEntity matches id, name and aliases case-insensitively', () => {
  assert.equal(resolveEntity('nvidia', profiles), 'nvda');
  assert.equal(resolveEntity('NVDA', profiles), 'nvda');
  assert.equal(resolveEntity('model x', profiles), 'model-x');
  assert.equal(resolveEntity('Unknown', profiles), null);
});

test('checkEditionRules keeps a valid sample without errors', () => {
  const { edition, errors } = checkEditionRules(sample(), profiles);
  assert.deepEqual(errors, []);
  assert.equal(edition.stories.length, 4);
  assert.equal(edition.quiet_day, false);
});

test('a story without sources is dropped and reported', () => {
  const e = sample();
  e.stories[2].sources = [];
  const { edition, errors } = checkEditionRules(e, profiles);
  assert.equal(edition.stories.length, 3);
  assert.deepEqual(errors, ['story without sources: Frameworki agentowe uzgadniają wspólny standard']);
});

test('a story with a status outside the enum is dropped', () => {
  const e = sample();
  e.stories[3].status = 'pewne';
  const { edition, errors } = checkEditionRules(e, profiles);
  assert.equal(edition.stories.length, 3);
  assert.equal(errors.length, 1);
});

test('a rumor without sources is dropped', () => {
  const e = sample();
  e.rumors[0].sources = [];
  const { edition, errors } = checkEditionRules(e, profiles);
  assert.equal(edition.rumors.length, 0);
  assert.equal(errors[0], 'story without sources: Firma Q ma szykować premierę przed świętami');
});

test('an invalid lead is replaced by the first valid story', () => {
  const e = sample();
  e.lead_story.sources = [];
  const { edition } = checkEditionRules(e, profiles);
  assert.equal(edition.lead_story.title, 'Producent chipów raportuje rekordowy kwartał');
  assert.equal(edition.stories.length, 3);
});

test('gielda and inwestycje stories and market get the exact disclaimer', () => {
  const { edition } = checkEditionRules(sample(), profiles);
  assert.equal(edition.stories[0].disclaimer, DISCLAIMER);
  assert.equal(edition.stories[1].disclaimer, DISCLAIMER);
  assert.equal(edition.stories[2].disclaimer, null);
  assert.equal(edition.market.disclaimer, DISCLAIMER);
});

test('may_affect_names map to ids and unknown names are collected once', () => {
  const e = sample();
  e.lead_story.may_affect_names = ['Nvidia', 'Nowa Firma'];
  const { edition, newEntityNames } = checkEditionRules(e, profiles);
  assert.deepEqual(edition.lead_story.may_affect, ['nvda']);
  assert.equal('may_affect_names' in edition.lead_story, false);
  assert.deepEqual(newEntityNames, ['Nowa Firma']);
  assert.deepEqual(edition.lead_story.may_affect_pending, ['Nowa Firma']);
});

test('resolvePending turns names known after the profile step into ids and drops the rest', () => {
  const e = sample();
  e.lead_story.may_affect_names = ['Nvidia', 'Nowa Firma', 'Nieznana'];
  const { edition } = checkEditionRules(e, profiles);
  const later = [...profiles, { id: 'nowa-firma', type: 'company', name: 'Nowa Firma', aliases: '' }];
  const done = resolvePending(edition, later);
  assert.deepEqual(done.lead_story.may_affect, ['nvda', 'nowa-firma']);
  assert.equal('may_affect_pending' in done.lead_story, false);
  assert.ok(done.stories.every((s) => !('may_affect_pending' in s)));
});

test('quiet day: lead plus two stories sets quiet_day without errors', () => {
  const e = sample();
  e.stories = e.stories.slice(0, 2);
  const { edition, errors } = checkEditionRules(e, profiles);
  assert.equal(edition.quiet_day, true);
  assert.deepEqual(errors, []);
});

test('checkEditionRules does not mutate its input', () => {
  const e = sample();
  const before = JSON.stringify(e);
  checkEditionRules(e, profiles);
  assert.equal(JSON.stringify(e), before);
});

test('collectNewEntities orders by watchlist, names, leaderboard, stale and caps', () => {
  const result = collectNewEntities({
    newEntityNames: ['Nowa Firma', 'NVIDIA'],
    watchlist: [
      { ticker: 'NVDA', name: 'NVIDIA', active: true },
      { ticker: 'AMD', name: 'AMD', active: true },
      { ticker: 'INTC', name: 'Intel', active: false },
    ],
    leaderboardTop: ['Model X', 'Model Z'],
    profiles: [
      ...profiles.map((p) => ({ ...p, updated_at: '2026-11-01' })),
      { id: 'old-co', type: 'company', name: 'Old Co', aliases: '', updated_at: '2026-07-01' },
    ],
    today: '2026-11-18',
    maxPerDay: 10,
  });
  assert.deepEqual(
    result.map((r) => [r.id, r.reason]),
    [
      ['amd', 'new'],
      ['nowa-firma', 'new'],
      ['model-z', 'new'],
      ['old-co', 'stale'],
    ],
  );
  assert.equal(result[0].type, 'company');
  assert.equal(result[2].type, 'model');
});

test('collectNewEntities respects maxPerDay', () => {
  const result = collectNewEntities({
    newEntityNames: ['A', 'B', 'C'],
    watchlist: [],
    leaderboardTop: [],
    profiles: [],
    today: '2026-11-18',
    maxPerDay: 2,
  });
  assert.deepEqual(result.map((r) => r.id), ['a', 'b']);
});

test('collectNewEntities does not add a story name that matches a watchlist entry added the same day', () => {
  const result = collectNewEntities({
    newEntityNames: ['nvidia', 'NVDA'],
    watchlist: [{ ticker: 'NVDA', name: 'NVIDIA', active: true }],
    leaderboardTop: [],
    profiles: [],
    today: '2026-11-18',
  });
  assert.deepEqual(result.map((r) => r.id), ['nvda']);
});

test('pickSpotlight prefers today entities not spotlighted within 60 days', () => {
  const ps = [
    { id: 'recent', type: 'company', last_spotlight_at: '2026-11-08' },
    { id: 'fresh', type: 'company', last_spotlight_at: null },
    { id: 'm1', type: 'model', last_spotlight_at: '2026-08-01' },
  ];
  const r = pickSpotlight({ profiles: ps, todaysEntityIds: ['recent', 'fresh', 'm1'], today: '2026-11-18' });
  assert.deepEqual(r, { company_id: 'fresh', model_id: 'm1' });
});

test('pickSpotlight falls back to the oldest spotlight, null first', () => {
  const ps = [
    { id: 'c-old', type: 'company', last_spotlight_at: '2026-05-01' },
    { id: 'c-never', type: 'company', last_spotlight_at: null },
    { id: 'c-recent', type: 'company', last_spotlight_at: '2026-11-10' },
  ];
  const r = pickSpotlight({ profiles: ps, todaysEntityIds: ['c-recent'], today: '2026-11-18' });
  assert.equal(r.company_id, 'c-never');
  assert.equal(r.model_id, null);
});

test('pickSpotlight never repeats within 60 days', () => {
  const ps = [{ id: 'only', type: 'company', last_spotlight_at: '2026-10-01' }];
  const r = pickSpotlight({ profiles: ps, todaysEntityIds: [], today: '2026-11-18' });
  assert.equal(r.company_id, null);
});

test('readingMinutes of 3000 words is 15', () => {
  const words = Array.from({ length: 3000 }, () => 'słowo').join(' ');
  assert.equal(readingMinutes({ greeting: '', lead_story: { body: words }, stories: [] }), 15);
});

test('readingMinutes rounds up', () => {
  assert.equal(readingMinutes({ greeting: 'a b c', stories: [] }), 1);
});

test('upsertIndex re-run on the same date keeps one entry with the newest title', () => {
  let index = { editions: [{ date: '2026-11-17', kind: 'daily', lead_title: 'Wczoraj', minutes: 14, categories: [] }] };
  index = upsertIndex(index, { date: '2026-11-18', kind: 'daily', lead_title: 'Pierwszy', minutes: 15, categories: ['modele'] });
  index = upsertIndex(index, { date: '2026-11-18', kind: 'daily', lead_title: 'Drugi', minutes: 15, categories: ['modele'] });
  assert.deepEqual(index.editions.map((e) => [e.date, e.lead_title]), [
    ['2026-11-18', 'Drugi'],
    ['2026-11-17', 'Wczoraj'],
  ]);
});
