import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/backfill-images.workflow.js';
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Apple_Park.jpg';

test('backfill queries cover only profiles without an image, by type', () => {
  const out = runCodeNode(codeNodeSource(WF, 'Backfill queries'), {
    input: [
      { entity_id: 'aapl', type: 'company', name: 'Apple', ticker: 'AAPL', image_url: '' },
      { entity_id: 'gemini-4-neon', type: 'model', name: 'Gemini 4 Neon', ticker: '' },
      { entity_id: 'done', type: 'company', name: 'Done', ticker: 'D', image_url: COMMONS, image_page: 'https://commons.wikimedia.org/wiki/File:D.jpg' },
      { entity_id: 'amzn', type: 'company', name: 'Amazon', ticker: 'AMZN', image_url: COMMONS, image_page: '' },
      {},
    ],
  }).map((i) => i.json);
  assert.deepEqual(out.map((o) => o.entity_id), ['aapl', 'gemini-4-neon', 'amzn']);
  assert.match(out[0].url, /gsrsearch=Apple%20company%20AAPL$/);
  assert.match(out[1].url, /gsrsearch=Gemini%204%20Neon%20AI%20model$/);
  assert.deepEqual(runCodeNode(codeNodeSource(WF, 'Backfill queries'), { input: [{}] }).map((i) => i.json), [{ none: true }]);
});

test('commons files keep the found Commons images and image rows pair them with their credits', () => {
  const queries = [{ entity_id: 'aapl' }, { entity_id: 'gemini-4-neon' }];
  const files = runCodeNode(codeNodeSource(WF, 'Commons files'), {
    nodes: { 'Backfill queries': queries },
    input: [
      { statusCode: 200, body: { query: { pages: { 1: { title: 'Apple Inc.', extract: 'x', pageimage: 'Apple Park.jpg', thumbnail: { source: COMMONS } } } } } },
      { statusCode: 200, body: { query: { pages: { 2: { title: 'Gemini', extract: 'y', pageimage: 'Logo.svg', thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/en/l/Logo.svg' } } } } } },
    ],
  }).map((i) => i.json);
  assert.deepEqual(files.map((f) => [f.entity_id, f.image_url]), [['aapl', COMMONS]]);
  assert.match(files[0].credit_url, /titles=File:Apple%20Park\.jpg$/);

  const rows = runCodeNode(codeNodeSource(WF, 'Image rows'), {
    nodes: { 'Commons files': files },
    input: [{ statusCode: 200, body: { query: { pages: { '-1': { title: 'File:Apple Park.jpg', imageinfo: [{ extmetadata: { Artist: { value: 'Jan' }, LicenseShortName: { value: 'CC BY 4.0' } } }] } } } } }],
  }).map((i) => i.json);
  assert.deepEqual(rows, [{ entity_id: 'aapl', image_url: COMMONS, image_credit: 'Jan / CC BY 4.0, Wikimedia Commons', image_page: 'https://commons.wikimedia.org/wiki/File:Apple_Park.jpg' }]);
});
