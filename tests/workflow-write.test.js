import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const sandbox = { URL: undefined, URLSearchParams: undefined };
const art = (role, idx, title) => ({ role, idx, title, url: `https://news.example/${idx}`, source: 'news.example', published_at: '2026-11-19T03:00:00.000Z', category: 'modele', text: `${title} text`, text_ok: true, related: [] });
const payload = {
  date: '2026-11-19',
  run_id: 'r',
  relay: true,
  flags: { weekly: false, monthly: false },
  articles: [art('lead', 0, 'Lead'), art('story', 1, 'Story one'), art('rumor', 2, 'Rumor one')],
  candidates: [0, 1, 2, 3].map((idx) => ({ idx, title: `C${idx}`, url: `https://news.example/${idx}`, source: 'news.example', snippet: '' })),
  history_titles: [],
  numbers: {
    market: { as_of: '2026-11-18', rows: [{ ticker: 'NVDA', name: 'NVIDIA', close: 150.96, change_1d: -2.89, change_7d: -13.11, change_30d: -30.46, last_trade_date: '2026-11-18' }] },
    rankings: { lmarena: [{ rank: 1, model: 'Gemini 4 Carbon', org: 'google', score: 1538, delta: null }], aa: null, hf_trending: [] },
    big_moves: [{ entity_id: 'nvda', board: 'market', kind: 'd7', change: -13.11 }],
    ranking_moves: [],
    follow_ups: [],
    leaderboard_top: ['Gemini 4 Carbon'],
  },
};

test('stories prompt node reads tables, skips empty placeholder rows and builds the part schema', () => {
  const [{ json }] = runCodeNode(codeNodeSource('n8n/workflows/write.workflow.js', 'Build stories prompt'), {
    globals: sandbox,
    nodes: {
      'Write request': [payload],
      'Read profiles': [{}],
      'Read watchlist': [{ ticker: 'NVDA', name: 'NVIDIA', active: true }],
      'Read leakers': [{ name: 'Leaker', platform: 'X', note: 'n', active: true }],
    },
  });
  assert.deepEqual(Object.keys(json.schema.properties), ['stories', 'rumors']);
  assert.equal(json.schema.properties.stories.type, 'array');
  assert.match(json.user, /Story one/);
  assert.doesNotMatch(json.user, /### \[\d\] Lead/);
  assert.deepEqual(json.entities.map((e) => e.id), ['nvda']);
  assert.equal(json.leakers[0].name, 'Leaker');
});

const story = (title, url, extra = {}) => ({ title, category: 'modele', status: 'potwierdzone', is_update: false, lede: 'Lede.', body: 'Body text. '.repeat(30), for_you: 'For you.', may_affect_names: ['NVIDIA'], sources: [{ name: 'News', url, primary: true }], ...extra });

test('front prompt node and assemble node produce a checked daily edition and pick the next stage', () => {
  const p = {
    ...payload,
    stories_part: { stories: [story('Story one', 'https://news.example/1'), story('Invented', 'https://elsewhere.example/x')], rumors: [{ title: 'Rumor one', body: 'b', sources: [{ name: 'N', url: 'https://news.example/2', primary: false }] }] },
    entities: [{ id: 'nvda', name: 'NVIDIA', aliases: 'NVDA', type: 'company' }],
    leakers: [],
  };
  const [{ json: prompt }] = runCodeNode(codeNodeSource('n8n/workflows/front.workflow.js', 'Build front prompt'), { globals: sandbox, nodes: { 'Front request': [p] } });
  assert.deepEqual(Object.keys(prompt.schema.properties), ['greeting', 'lead_story', 'market', 'rankings', 'big_moves', 'follow_ups', 'closing']);
  assert.match(prompt.user, /nvda — market — 7d -13\.11%/);

  const front = {
    greeting: 'Dzień dobry.',
    lead_story: story('Lead', 'https://news.example/0', { category: 'gielda', may_affect_names: ['NVIDIA', 'Nowa Firma'] }),
    market: { commentary: 'Rynek spadał.' },
    rankings: { commentary: 'Bez zmian.' },
    big_moves: [{ entity_id: 'nvda', board: 'market', change: '-13.11%', why: 'Brak jednoznacznej przyczyny.', why_type: 'brak', sources: [] }],
    follow_ups: [],
    closing: 'Do jutra.',
  };
  const [{ json }] = runCodeNode(codeNodeSource('n8n/workflows/front.workflow.js', 'Assemble edition'), {
    globals: sandbox,
    nodes: { 'Front request': [p] },
    input: [{ ok: true, data: front }],
  });
  const e = json.edition;
  assert.equal(json.next, 'profiles');
  assert.equal(e.date, '2026-11-19');
  assert.equal(e.lead_story.title, 'Lead');
  assert.equal(e.lead_story.disclaimer, 'To nie jest porada inwestycyjna.');
  assert.deepEqual(e.lead_story.may_affect, ['nvda']);
  assert.deepEqual(e.lead_story.may_affect_pending, ['Nowa Firma']);
  assert.deepEqual(e.stories.map((s) => s.title), ['Story one']);
  assert.equal(e.quiet_day, true);
  assert.equal(e.market.rows.length, 1);
  assert.equal(e.big_moves.length, 1);
  assert.deepEqual(json.new_entity_names, ['Nowa Firma']);
  assert.deepEqual(json.rule_errors, ['story without sources: Invented']);
  assert.ok(!('articles' in json));
});

test('assemble node routes Sundays and the 1st to the period stage and stops when relay is off', () => {
  const code = codeNodeSource('n8n/workflows/front.workflow.js', 'Assemble edition');
  const base = { ...payload, stories_part: { stories: [], rumors: [] }, entities: [], leakers: [] };
  const run = (p) => runCodeNode(code, { globals: sandbox, nodes: { 'Front request': [p] }, input: [{ ok: true, data: {} }] })[0].json.next;
  assert.equal(run({ ...base, flags: { weekly: true, monthly: false } }), 'period');
  assert.equal(run({ ...base, relay: false }), 'stop');
});
