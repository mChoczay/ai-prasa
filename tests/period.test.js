import test from 'node:test';
import assert from 'node:assert/strict';
import { periodKinds, periodPrompt, periodUserText, periodSchema, addPeriods } from '../n8n/lib/period.js';

const numbers = {
  market: { rows: [{ name: 'NVIDIA', ticker: 'NVDA', change_7d: -13.11, change_30d: -30.46 }] },
  rankings: { lmarena: [{ rank: 1, model: 'Gemini 4 Carbon' }], aa: null, hf_trending: [] },
};
const topics = [
  { date: '2026-11-21', title: 'This week', summary: 's1', category: 'modele', status: 'potwierdzone' },
  { date: '2026-11-10', title: 'Earlier this month', summary: 's2', category: 'gielda', status: 'potwierdzone' },
  {},
];
const snapshots = [
  { date: '2026-11-16', board: 'lmarena', rank: 2, model: 'Old Two' },
  { date: '2026-11-16', board: 'lmarena', rank: 1, model: 'Old One' },
  { date: '2026-11-20', board: 'lmarena', rank: 1, model: 'Newer' },
];

test('periodKinds follows the edition flags', () => {
  assert.deepEqual(periodKinds({ weekly: true, monthly: true }), ['weekly', 'monthly']);
  assert.deepEqual(periodKinds({ weekly: false, monthly: false }), []);
});

test('periodPrompt keeps the window, the market change of the period and the first snapshot', () => {
  const weekly = periodPrompt({ kind: 'weekly', date: '2026-11-22', topics, snapshots, numbers });
  assert.match(weekly, /Tydzień w AI/);
  assert.match(weekly, /2026-11-21 \[modele, potwierdzone\] This week: s1/);
  assert.doesNotMatch(weekly, /Earlier this month/);
  assert.match(weekly, /NVIDIA \(NVDA\): 7d -13\.11%/);
  assert.match(weekly, /lmarena: now #1 Gemini 4 Carbon\n  at 2026-11-16: #1 Old One, #2 Old Two/);
  assert.match(weekly, /aa: now dane niedostępne/);
  const monthly = periodPrompt({ kind: 'monthly', date: '2026-12-01', topics, snapshots: [], numbers });
  assert.match(monthly, /Earlier this month/);
  assert.match(monthly, /30d -30\.46%/);
  assert.match(monthly, /no snapshot/);
});

test('periodSchema and addPeriods handle one or both supplements', () => {
  const single = { type: 'object', properties: { title: { type: 'string' } } };
  assert.deepEqual(periodSchema(single, ['weekly']).required, ['weekly']);
  const e = addPeriods({ date: '2026-11-22', minutes: 15, greeting: 'g', lead_story: null, stories: [], weekly: null, monthly: null }, { weekly: { title: 'T', body: 'word '.repeat(1000), takeaways: [], race_map: [] } }, ['weekly']);
  assert.equal(e.weekly.title, 'T');
  assert.equal(e.monthly, null);
  assert.equal(e.minutes, 15);
  assert.equal(e.supplement_minutes, 5);
  assert.equal(addPeriods({ date: 'x' }, {}, ['monthly']).monthly, null);
});

test('periodUserText joins the requested supplements and adds the reader feedback once', () => {
  const both = periodUserText({ kinds: ['weekly', 'monthly'], date: '2026-12-01', topics, snapshots, numbers, feedback: 'Notes from the reader: krócej' });
  assert.equal(both.split('Supplement: ').length - 1, 2);
  assert.equal(both.split('## Reader feedback').length - 1, 1);
  assert.match(both, /## Reader feedback\nNotes from the reader: krócej/);
  assert.match(both, /Write one supplement per requested key: weekly, monthly\.$/);
  const plain = periodUserText({ kinds: ['weekly'], date: '2026-11-22', topics, snapshots, numbers, feedback: '  ' });
  assert.doesNotMatch(plain, /Reader feedback/);
});
