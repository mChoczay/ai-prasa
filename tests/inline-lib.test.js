import test from 'node:test';
import assert from 'node:assert/strict';
import { inlineLib, buildWorkflow } from '../scripts/inline-lib.mjs';

test('inlineLib strips import and export lines and keeps functions callable', () => {
  const code = inlineLib(['n8n/lib/budget.js', 'n8n/lib/dates.js']);
  assert.doesNotMatch(code, /^\s*(import|export)\b/m);
  const lib = new Function(`${code}; return { costUsd, checkGate, monthKey };`)();
  assert.equal(lib.costUsd('claude-sonnet-5-5', { input_tokens: 1_000_000, output_tokens: 0 }), 2);
  assert.equal(lib.monthKey('2026-11-18T12:00:00Z'), '2026-11');
});

test('inlineLib keeps cross-file calls working once imports are removed', () => {
  const code = inlineLib(['n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js']);
  const lib = new Function(`${code}; return { collectNewEntities };`)();
  const r = lib.collectNewEntities({ newEntityNames: ['Nowa Firma'], watchlist: [], leaderboardTop: [], profiles: [], today: '2026-11-18' });
  assert.equal(r[0].id, 'nowa-firma');
});

test('buildWorkflow replaces INLINE markers with a JS string literal of the code', () => {
  const src = "const c = node({ config: { parameters: { jsCode: INLINE('n8n/lib/dates.js') + 'return [];' } } });";
  const out = buildWorkflow(src);
  assert.doesNotMatch(out, /INLINE\(/);
  const literal = out.match(/jsCode: ("(?:[^"\\]|\\.)*")/)[1];
  const code = JSON.parse(literal);
  assert.match(code, /function editionDate/);
  assert.doesNotMatch(code, /^export/m);
});
