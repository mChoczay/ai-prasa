import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/profiles.workflow.js';
const edition = {
  date: '2026-11-19',
  lead_story: { title: 'Lead', category: 'modele', status: 'potwierdzone', lede: 'Apple ships.', body: 'Nowa Firma bought it.', may_affect: ['aapl'], may_affect_pending: ['Nowa Firma'], sources: [{ url: 'https://a.example/1' }] },
  stories: [],
  big_moves: [],
};
const payload = { date: '2026-11-19', run_id: 'r', relay: true, stop_after: '', edition, new_entity_names: ['Nowa Firma'], leaderboard_top: [], numbers: { market: null, rankings: null } };
const nodes = { 'Profiles request': [payload], 'Read profiles': [{}], 'Read watchlist': [{ ticker: 'AAPL', name: 'Apple', active: true }] };

test('plan, prompts and rows turn targets into table rows and skip items without reference text', () => {
  const planned = runCodeNode(codeNodeSource(WF, 'Plan profiles'), { nodes }).map((i) => i.json);
  assert.deepEqual(planned.map((t) => t.id), ['aapl', 'nowa-firma']);
  assert.match(planned[0].url, /gsrsearch=Apple%20company%20AAPL/);

  const wikiBody = { query: { pages: { 1: { title: 'Apple Inc.', extract: 'Apple Inc. is a company.', fullurl: 'https://en.wikipedia.org/wiki/Apple_Inc.' } } } };
  const prompts = runCodeNode(codeNodeSource(WF, 'Profile prompts'), {
    nodes: { 'Plan profiles': planned },
    input: [{ statusCode: 200, body: wikiBody }, { statusCode: 200, body: { batchcomplete: '' } }],
  }).map((i) => i.json);
  assert.equal(prompts.length, 2);
  assert.equal(prompts[0].wiki.title, 'Apple Inc.');
  assert.equal(prompts[1].wiki, null);
  assert.match(prompts[1].user, /From today's news: Nowa Firma bought it\./);

  const card = { type: 'company', name: 'Apple Inc.', owner: 'o', summary: 'S.', key_products: ['iPhone'], why_it_matters: 'W.', aliases: [] };
  const rows = runCodeNode(codeNodeSource(WF, 'Profile rows'), {
    nodes: { 'Profiles request': [payload], 'Profile prompts': prompts },
    input: [{ ok: true, data: card }, { error: { message: 'failed' } }],
  }).map((i) => i.json);
  assert.deepEqual(rows.map((r) => [r.entity_id, r.aliases, r.source_urls]), [['aapl', 'AAPL', 'https://en.wikipedia.org/wiki/Apple_Inc.']]);
});

test('profile rows stop the stage on a credits error so the pause mail goes out', () => {
  assert.throws(
    () =>
      runCodeNode(codeNodeSource(WF, 'Profile rows'), {
        nodes: { 'Profiles request': [payload], 'Profile prompts': [{ target: { id: 'aapl' } }] },
        input: [{ error: { message: 'CREDITS: profile (claude-haiku-5-5) HTTP 400' } }],
      }),
    /^Error: CREDITS:/,
  );
});

test('plan returns a placeholder when nothing needs a profile', () => {
  const out = runCodeNode(codeNodeSource(WF, 'Plan profiles'), {
    nodes: { ...nodes, 'Profiles request': [{ ...payload, new_entity_names: [] }], 'Read profiles': [{ entity_id: 'aapl', name: 'Apple', updated_at: '2026-11-18' }] },
  });
  assert.deepEqual(out.map((i) => i.json), [{ none: true }]);
});

test('finish resolves pending names, picks the spotlight and prepares the publish payload', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Finish edition'), {
    nodes: {
      'Profiles request': [payload],
      'Read all profiles': [
        { entity_id: 'aapl', type: 'company', name: 'Apple', aliases: 'AAPL', key_products: 'iPhone, Mac' },
        { entity_id: 'nowa-firma', type: 'company', name: 'Nowa Firma', aliases: '' },
      ],
    },
  });
  assert.deepEqual(json.edition.lead_story.may_affect, ['aapl', 'nowa-firma']);
  assert.equal(json.edition.spotlight.company_id, 'aapl');
  assert.deepEqual(json.spotlight_ids, ['aapl']);
  assert.deepEqual(json.profiles_json.profiles[0].key_products, ['iPhone', 'Mac']);
  assert.equal(json.history.topics[0].title, 'Lead');
  assert.equal(json.history.tags.length, 2);
});
