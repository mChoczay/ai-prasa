import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/select.workflow.js';
const sandbox = { URL: undefined, URLSearchParams: undefined };
const cand = (idx, title) => ({ idx, title, url: `https://www.news.example/${idx}?utm_source=rss`, source: 'news.example', published_at: '2026-11-19T03:00:00.000Z', snippet: `snippet ${idx}`, category: 'modele', importance: 3 });
const payload = {
  date: '2026-11-19',
  run_id: 'r',
  relay: false,
  candidates: [cand(0, 'Anthropic IPO raises record sum'), cand(1, 'Gemini 4 Neon launches'), cand(2, 'Anthropic IPO opens on Nasdaq')],
  history_titles: ['Old'],
};
const selection = { lead_idx: 0, story_idx: [1], rumor_idx: [], extra_queries: [] };

test('select prompt node stops the relay with a clear error when there are no candidates', () => {
  const code = codeNodeSource(WF, 'Build select prompt');
  assert.throws(() => runCodeNode(code, { globals: sandbox, nodes: { 'Select request': [{ ...payload, candidates: [] }] } }), /NO_NEWS/);
  const [{ json }] = runCodeNode(code, { globals: sandbox, nodes: { 'Select request': [payload] } });
  assert.match(json.user, /\[1\] Gemini 4 Neon launches/);
});

test('fetch list and build articles pair HTTP results with their urls in the n8n sandbox', () => {
  const list = runCodeNode(codeNodeSource(WF, 'Fetch list'), {
    globals: sandbox,
    nodes: { 'Select request': [payload], 'Select with Sonnet': [{ ok: true, data: selection }] },
  }).map((i) => i.json);
  assert.deepEqual(list.map((f) => f.url), [0, 2, 1].map((i) => `https://www.news.example/${i}?utm_source=rss`));

  const page = `<html><body><p>${'Shares opened higher. '.repeat(40)}</p></body></html>`;
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Build articles'), {
    globals: sandbox,
    nodes: { 'Select request': [payload], 'Select with Sonnet': [{ ok: true, data: selection }], 'Fetch list': list },
    input: [{ statusCode: 200, body: page }, { error: { message: 'timeout' } }, { statusCode: 200, data: page }],
  });
  assert.equal(json.articles.length, 2);
  assert.equal(json.articles[0].text_ok, true);
  assert.equal(json.articles[0].related[0].text, 'snippet 2');
  assert.equal(json.articles[1].text_ok, true);
  assert.equal(json.fetch_ok, 2);
  assert.equal(json.run_id, 'r');
  assert.deepEqual(json.selection, selection);
});

test('build articles keeps the preview image of the fetched page in the n8n sandbox', () => {
  const list = runCodeNode(codeNodeSource(WF, 'Fetch list'), {
    globals: sandbox,
    nodes: { 'Select request': [payload], 'Select with Sonnet': [{ ok: true, data: selection }] },
  }).map((i) => i.json);
  const page = `<html><head><meta property="og:image" content="//cdn.news.example/0.jpg"></head><body><p>${'Shares opened higher. '.repeat(40)}</p></body></html>`;
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Build articles'), {
    globals: sandbox,
    nodes: { 'Select request': [payload], 'Select with Sonnet': [{ ok: true, data: selection }], 'Fetch list': list },
    input: [{ statusCode: 200, data: page }, { error: { message: 'timeout' } }, { statusCode: 200, data: page }],
  });
  assert.deepEqual(json.articles[0].image, { url: 'https://cdn.news.example/0.jpg', credit: 'news.example', link: payload.candidates[0].url });
});
