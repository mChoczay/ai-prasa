import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const buildCode = codeNodeSource('n8n/workflows/news.workflow.js', 'Build candidates');
const keepCode = codeNodeSource('n8n/workflows/news.workflow.js', 'Keep top candidates');
const recent = new Date(Date.now() - 3_600_000).toISOString();

test('build candidates turns feed items into a numbered list and a triage prompt', () => {
  const [{ json }] = runCodeNode(buildCode, {
    nodes: {
      'News request': [{ date: '2026-11-19', run_id: 'r' }],
      'Read feeds': [
        { title: 'Model launch', link: 'https://openai.com/news/a', isoDate: recent, contentSnippet: 'Big news' },
        {},
        { title: 'Model launch', link: 'https://openai.com/news/a?utm_source=rss', isoDate: recent },
      ],
      'Recent topics': [{ title: 'Yesterday story' }, {}],
    },
  });
  assert.equal(json.candidates.length, 1);
  assert.match(json.user, /\[0\] Model launch — openai\.com/);
  assert.match(json.user, /Yesterday story/);
  assert.deepEqual(json.history_titles, ['Yesterday story']);
});

test('keep top candidates applies the Haiku triage', () => {
  const candidates = [0, 1].map((idx) => ({ idx, title: `T${idx}`, url: `https://x.com/${idx}`, source: 'x.com', published_at: recent, snippet: '' }));
  const [{ json }] = runCodeNode(keepCode, {
    nodes: { 'Build candidates': [{ date: '2026-11-19', candidates, history_titles: [] }] },
    input: [{ ok: true, data: { items: [{ idx: 1, category: 'modele', importance: 4, keep: true }, { idx: 0, category: 'inne', importance: 2, keep: false }] } }],
  });
  assert.deepEqual(json.candidates.map((c) => c.idx), [1]);
  assert.equal(json.candidates[0].category, 'modele');
});
