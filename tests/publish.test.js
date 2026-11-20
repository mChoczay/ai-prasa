import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexEntry, publishTree } from '../n8n/lib/publish.js';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const edition = {
  date: '2026-11-19',
  edition: 'daily',
  minutes: 15,
  lead_story: { title: 'Lead', category: 'modele' },
  stories: [{ title: 'S1', category: 'gielda' }, { title: 'S2', category: 'modele' }],
};

test('indexEntry lists the lead title, minutes and categories once', () => {
  assert.deepEqual(indexEntry(edition), { date: '2026-11-19', kind: 'daily', lead_title: 'Lead', minutes: 15, categories: ['modele', 'gielda'] });
});

test('publishTree writes the edition, profiles and an index without a duplicate date', () => {
  const indexRaw = JSON.stringify({ editions: [{ date: '2026-11-19', kind: 'daily', lead_title: 'Old' }, { date: '2026-11-18', kind: 'daily', lead_title: 'Prev' }] });
  const { tree, index, message } = publishTree({ edition, indexRaw, profilesJson: { profiles: [] } });
  assert.deepEqual(tree.map((t) => t.path), ['site/data/2026-11-19.json', 'site/data/profiles.json', 'site/data/index.json']);
  assert.deepEqual(index.editions.map((e) => [e.date, e.lead_title]), [['2026-11-19', 'Lead'], ['2026-11-18', 'Prev']]);
  assert.deepEqual(JSON.parse(tree[0].content).date, '2026-11-19');
  assert.equal(message, 'Publish the edition for 2026-11-19.');
});

test('publishTree survives a missing or broken index', () => {
  assert.equal(publishTree({ edition, indexRaw: '404: Not Found' }).index.editions.length, 1);
  assert.equal(publishTree({ edition, indexRaw: null }).tree.length, 2);
});

test('publishTree with removeDate deletes the file and the index entry', () => {
  const indexRaw = JSON.stringify({ editions: [{ date: '2099-01-01' }, { date: '2026-11-19' }] });
  const { tree, index, message } = publishTree({ indexRaw, removeDate: '2099-01-01' });
  assert.deepEqual(tree[0], { path: 'site/data/2099-01-01.json', mode: '100644', type: 'blob', sha: null });
  assert.deepEqual(index.editions.map((e) => e.date), ['2026-11-19']);
  assert.match(message, /Remove the test edition/);
  assert.throws(() => publishTree({ indexRaw, removeDate: '../x' }), /bad date/);
  assert.throws(() => publishTree({ edition: { date: 'x' }, indexRaw }), /valid date/);
});


test('publish workflow: build tree pairs the commit shas with the files', () => {
  const [{ json }] = runCodeNode(codeNodeSource('n8n/workflows/publish.workflow.js', 'Build tree'), {
    nodes: {
      'Publish request': [{ date: '2026-11-19', edition, profiles_json: { profiles: [] }, remove_date: '' }],
      'GitHub: current index': [{ statusCode: 404, data: 'Not Found' }],
      'GitHub: main ref': [{ object: { sha: 'head1' } }],
      'GitHub: base commit': [{ tree: { sha: 'tree0' } }],
    },
  });
  assert.equal(json.head, 'head1');
  assert.equal(json.base_tree, 'tree0');
  assert.equal(json.tree.length, 3);
  assert.equal(json.message, 'Publish the edition for 2026-11-19.');
});

test('publish workflow: morning mail goes to the address from the settings table', () => {
  const [{ json }] = runCodeNode(codeNodeSource('n8n/workflows/publish.workflow.js', 'Build morning mail'), {
    nodes: { 'Publish request': [{ edition }], 'Read settings': [{ notify_email: 'owner@example.com', site_url: 'https://example.github.io/site/' }] },
  });
  assert.equal(json.to, 'owner@example.com');
  assert.equal(json.subject, 'Poranna prasa AI: Lead');
  assert.match(json.html, /https:\/\/example\.github\.io\/site\/#\/2026-11-19/);
});

test('publish workflow: morning mail carries the ratings link from the feedback settings table', () => {
  const run = (settings) => runCodeNode(codeNodeSource('n8n/workflows/publish.workflow.js', 'Build morning mail'), {
    nodes: { 'Publish request': [{ edition }], 'Read settings': [{ notify_email: 'owner@example.com', site_url: 'https://example.github.io/site/' }], 'Read feedback settings': settings },
  })[0].json;
  assert.match(run([{ url: 'https://h.example/w', key: 'k' }]).html, /#\/oceny\?u=https%3A%2F%2Fh\.example%2Fw&amp;k=k/);
  assert.doesNotMatch(run([{}]).html, /oceny/);
});

const mailNodes = (date, extra = {}) => ({
  'Publish request': [{ edition: { ...edition, date } }],
  'Read settings': [{ notify_email: 'owner@example.com', site_url: 'https://example.github.io/site/' }],
  ...extra,
});
const rangesCode = codeNodeSource('n8n/workflows/publish.workflow.js', 'Visit ranges');
const mailCode = codeNodeSource('n8n/workflows/publish.workflow.js', 'Build morning mail');

test('publish workflow: visit ranges ask GoatCounter only on Mondays and the 1st', () => {
  const monday = runCodeNode(rangesCode, { nodes: mailNodes('2026-11-23') }).map((i) => i.json);
  assert.equal(monday.length, 1);
  assert.ok(monday[0].url.startsWith('https://api-prasa.goatcounter.com/api/v0/stats/total?'));
  assert.deepEqual(runCodeNode(rangesCode, { nodes: mailNodes('2026-11-24') }).map((i) => i.json), [{ none: true }]);
});

test('publish workflow: the Monday mail shows who read the paper', () => {
  const ranges = runCodeNode(rangesCode, { nodes: mailNodes('2026-11-23') }).map((i) => i.json);
  const [{ json }] = runCodeNode(mailCode, { nodes: mailNodes('2026-11-23', { 'Visit ranges': ranges, 'GoatCounter stats': [{ statusCode: 200, body: { total: 6, stats: [] } }] }) });
  assert.match(json.html, /Kto czytał/);
  assert.match(json.html, /6 odwiedzających/);
});

test('publish workflow: a failed or skipped GoatCounter call still sends the mail without the section', () => {
  const ranges = runCodeNode(rangesCode, { nodes: mailNodes('2026-11-23') }).map((i) => i.json);
  const failed = (r) => ({ 'Visit ranges': ranges, 'GoatCounter stats': [r] });
  for (const extra of [failed({ statusCode: 401, body: {} }), failed({ statusCode: 403, body: { error: 'forbidden' } }), failed({ statusCode: 500, body: 'oops' }), failed({ statusCode: 200, body: { stats: [] } }), failed({ kind: 'week', url: 'x' }), { 'Visit ranges': [{ none: true }] }, {}]) {
    const [{ json }] = runCodeNode(mailCode, { nodes: mailNodes('2026-11-23', extra) });
    assert.doesNotMatch(json.html, /Kto czytał/);
    assert.equal(json.to, 'owner@example.com');
    assert.equal(json.subject, 'Poranna prasa AI: Lead');
  }
});

test('publish workflow: the GoatCounter call sends the JSON content type its API expects', () => {
  const src = readFileSync(new URL('../n8n/workflows/publish.workflow.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf("name: 'GoatCounter stats'"), src.indexOf('const buildMail'));
  assert.match(block, /sendHeaders:\s*true/);
  assert.match(block, /name:\s*'Content-Type',\s*value:\s*'application\/json'/);
});

test('publishTree writes glossary.json only when there is a glossary', () => {
  const withGlossary = publishTree({ edition, indexRaw: null, profilesJson: null, glossaryJson: { terms: [{ id: 'h200', term: 'H200', explain: 'U.' }] } });
  assert.ok(withGlossary.tree.some((f) => f.path === 'site/data/glossary.json'));
  const without = publishTree({ edition, indexRaw: null, profilesJson: null });
  assert.ok(!without.tree.some((f) => f.path === 'site/data/glossary.json'));
});

test('publish workflow: GitHub calls and the morning mail retry a transient failure', () => {
  const src = readFileSync(new URL('../n8n/workflows/publish.workflow.js', import.meta.url), 'utf8');
  for (const name of ['GitHub: main ref', 'GitHub: base commit', 'GitHub: current index', 'GitHub: new tree', 'GitHub: new commit', 'GitHub: move main', 'Send morning mail']) {
    const at = src.indexOf(`name: '${name}'`);
    assert.ok(at > 0, name);
    const block = src.slice(at, src.indexOf('parameters:', at));
    assert.match(block, /retryOnFail: true/, name);
    assert.match(block, /maxTries: 3/, name);
    assert.match(block, /waitBetweenTries: 5000/, name);
  }
});
