import test from 'node:test';
import assert from 'node:assert/strict';
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
