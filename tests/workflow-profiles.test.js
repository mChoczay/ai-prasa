import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

  const wikiBody = { query: { pages: { 1: { title: 'Apple Inc.', extract: 'Apple Inc. is a company.', fullurl: 'https://en.wikipedia.org/wiki/Apple_Inc.', pageimage: 'Apple Park.jpg', thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Apple_Park.jpg' } } } } };
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
    nodes: { 'Profiles request': [payload], 'Profile prompts': prompts, 'Commons credit': [{ statusCode: 200, body: { query: { pages: { '-1': { title: 'File:Apple Park.jpg', imageinfo: [{ extmetadata: { Artist: { value: 'Jan' }, LicenseShortName: { value: 'CC0' } } }] } } } } }, { statusCode: 200, body: {} }] },
    input: [{ ok: true, data: card }, { error: { message: 'failed' } }],
  }).map((i) => i.json);
  assert.deepEqual(rows.map((r) => [r.entity_id, r.aliases, r.source_urls]), [['aapl', 'AAPL', 'https://en.wikipedia.org/wiki/Apple_Inc.']]);
  assert.match(prompts[0].credit_url, /titles=File:Apple%20Park.jpg$/);
  assert.deepEqual([rows[0].image_url, rows[0].image_credit, rows[0].image_page], ['https://upload.wikimedia.org/wikipedia/commons/a/ab/Apple_Park.jpg', 'Jan / CC0, Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Apple_Park.jpg']);
});

test('profile rows stop the stage on a credits error so the pause mail goes out', () => {
  assert.throws(
    () =>
      runCodeNode(codeNodeSource(WF, 'Profile rows'), {
        nodes: { 'Profiles request': [payload], 'Profile prompts': [{ target: { id: 'aapl' } }], 'Commons credit': [{}] },
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

const PG = 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg';
const topicEdition = { ...edition, stories: [{ title: 'PG', category: 'narzedzia', image_topic: 'PostgreSQL', may_affect: [], may_affect_pending: [], image: null, sources: [] }] };
const topicNodes = { ...nodes, 'Profiles request': [{ ...payload, edition: topicEdition }] };

test('topic picture nodes search Wikipedia for stories without a picture and keep credited Commons files', () => {
  const asked = runCodeNode(codeNodeSource(WF, 'Topic queries'), { nodes: topicNodes }).map((i) => i.json);
  assert.deepEqual(asked.map((a) => a.idx), [1]);
  assert.match(asked[0].url, /gsrsearch=PostgreSQL$/);
  assert.deepEqual(runCodeNode(codeNodeSource(WF, 'Topic queries'), { nodes }).map((i) => i.json), [{ none: true }]);

  const files = runCodeNode(codeNodeSource(WF, 'Topic files'), {
    nodes: { 'Topic queries': asked },
    input: [{ statusCode: 200, body: { query: { pages: { 1: { title: 'PostgreSQL', extract: 'x', pageimage: 'Postgresql_elephant.svg', thumbnail: { source: PG } } } } } }],
  }).map((i) => i.json);
  assert.deepEqual(files.map((f) => [f.idx, f.image_url]), [[1, PG]]);
  assert.deepEqual(runCodeNode(codeNodeSource(WF, 'Topic files'), { nodes: { 'Topic queries': asked }, input: [{ statusCode: 500, body: {} }] }).map((i) => i.json), [{ none: true }]);

  const pics = runCodeNode(codeNodeSource(WF, 'Topic images'), {
    nodes: { 'Topic files': files },
    input: [{ statusCode: 200, body: { query: { pages: { '-1': { title: 'File:Postgresql elephant.svg', imageinfo: [{ extmetadata: { Artist: { value: 'Jeff MacDonald' }, LicenseShortName: { value: 'BSD' } } }] } } } } }],
  }).map((i) => i.json);
  assert.deepEqual(pics, [{ idx: 1, image: { url: PG, credit: 'Jeff MacDonald / BSD, Wikimedia Commons', link: 'https://commons.wikimedia.org/wiki/File:Postgresql_elephant.svg' } }]);

  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Finish edition'), {
    nodes: { 'Profiles request': [{ ...payload, edition: topicEdition }], 'Read all profiles': [{}], 'Topic images': pics },
  });
  assert.deepEqual(json.edition.stories[0].image_fallback, pics[0].image);
});

const finishJson = () => runCodeNode(codeNodeSource(WF, 'Finish edition'), {
  nodes: { 'Profiles request': [payload], 'Read all profiles': [{ entity_id: 'aapl', type: 'company', name: 'Apple', aliases: 'AAPL' }] },
})[0].json;

test('the glossary prompt lists the stories, known terms and the reader feedback', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Glossary prompt'), {
    nodes: { 'Profiles request': [{ ...payload, feedback: 'nie wiem co to H200' }], 'Finish edition': [finishJson()], 'Read glossary': [{ term_id: 'lsn', term: 'LSN', explain: 'Numer.' }] },
  });
  assert.match(json.user, /\[0\] Lead/);
  assert.match(json.user, /- LSN/);
  assert.match(json.user, /nie wiem co to H200/);
});

test('glossary done adds term ids, the glossary file and new rows', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Glossary done'), {
    nodes: {
      'Profiles request': [payload],
      'Finish edition': [finishJson()],
      'Read glossary': [{ term_id: 'lsn', term: 'LSN', explain: 'Numer.' }],
      'Glossary with Haiku': [{ ok: true, data: { stories: [{ idx: 0, terms: [{ term: 'H200', explain: 'Układ.' }] }] } }],
    },
  });
  assert.deepEqual(json.edition.lead_story.terms, ['h200']);
  assert.deepEqual(json.glossary_json.terms.map((t) => t.id), ['h200', 'lsn']);
  assert.deepEqual(json.glossary_rows.map((r) => r.term_id), ['h200']);
  assert.equal(json.relay, true);
  assert.ok(json.profiles_json && json.history);
});

test('a failed glossary call passes the edition on unchanged with the known glossary', () => {
  const finish = finishJson();
  for (const extra of [{ 'Glossary with Haiku': [{ ok: false, error: 'x' }] }, {}]) {
    const [{ json }] = runCodeNode(codeNodeSource(WF, 'Glossary done'), {
      nodes: { 'Profiles request': [payload], 'Finish edition': [finish], 'Read glossary': [{ term_id: 'lsn', term: 'LSN', explain: 'Numer.' }], ...extra },
    });
    assert.deepEqual(json.edition, finish.edition);
    assert.deepEqual(json.glossary_rows, []);
    assert.deepEqual(json.glossary_json.terms.map((t) => t.id), ['lsn']);
  }
});

test('a failed glossary read leaves glossary.json alone and saves nothing', () => {
  const finish = finishJson();
  for (const read of [[{ error: 'table unavailable' }], [{ json: 'x', statusCode: 500 }]]) {
    const [{ json }] = runCodeNode(codeNodeSource(WF, 'Glossary done'), {
      nodes: {
        'Profiles request': [payload],
        'Finish edition': [finish],
        'Read glossary': read,
        'Glossary with Haiku': [{ ok: true, data: { stories: [{ idx: 0, terms: [{ term: 'H200', explain: 'Układ.' }] }] } }],
      },
    });
    assert.deepEqual(json.edition, finish.edition);
    assert.equal(json.glossary_json, null);
    assert.deepEqual(json.glossary_rows, []);
  }
  const [{ json: empty }] = runCodeNode(codeNodeSource(WF, 'Glossary done'), {
    nodes: { 'Profiles request': [payload], 'Finish edition': [finish], 'Read glossary': [{}], 'Glossary with Haiku': [{ ok: true, data: { stories: [{ idx: 0, terms: [{ term: 'H200', explain: 'Układ.' }] }] } }] },
  });
  assert.deepEqual(empty.glossary_rows.map((r) => r.term_id), ['h200'], 'an empty table is not a failed read');
});

test('saving glossary terms updates an existing term instead of adding a duplicate', () => {
  const src = readFileSync(new URL('../n8n/workflows/profiles.workflow.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf("name: 'Save glossary'"), src.indexOf('const relayCheck'));
  assert.match(block, /operation: 'upsert'/);
  assert.match(block, /keyName: 'term_id'/);
});
