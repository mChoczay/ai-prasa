import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const src = "const c = node({ config: { parameters: { jsCode: INLINE('n8n/lib/dates.js') + 'return [editionDate(x)];' } } });";
  const out = buildWorkflow(src);
  assert.doesNotMatch(out, /INLINE\(/);
  const literal = out.match(/jsCode: ("(?:[^"\\]|\\.)*")/)[1];
  const code = JSON.parse(literal);
  assert.match(code, /function editionDate/);
  assert.doesNotMatch(code, /^export/m);
});

test('buildWorkflow replaces TEXT and JSONFILE markers with file contents', () => {
  const out = buildWorkflow("const a = { system: TEXT('prompts/filter.md'), schema: JSONFILE('schemas/filter.schema.json') };");
  const obj = new Function(`return ${out.replace(/^const a = /, '').replace(/;$/, '')};`)();
  assert.match(obj.system, /triage overnight AI news/);
  assert.equal(obj.schema.type, 'object');
  assert.deepEqual(obj.schema.required, ['items']);
});

test('buildWorkflow keeps only the declarations the node code reaches', () => {
  const src = "const c = node({ config: { parameters: { jsCode: INLINE('n8n/lib/news.js', 'n8n/lib/select.js') + 'return fetchList(sel, cands);' } } });";
  const code = JSON.parse(buildWorkflow(src).match(/jsCode: ("(?:[^"\\]|\\.)*")/)[1]);
  assert.match(code, /function fetchList/);
  assert.match(code, /function relatedCandidates/);
  assert.match(code, /function normalizeUrl/);
  assert.doesNotMatch(code, /function selectPrompt|function buildArticles|function entityId|function extractArticleText/);
});

test('buildWorkflow keeps multi-line template literals intact, blank lines and indentation included', () => {
  const src = "const c = node({ config: { parameters: { jsCode: INLINE('n8n/lib/write.js') + 'return storiesPrompt({});' } } });";
  const code = JSON.parse(buildWorkflow(src).match(/jsCode: ("(?:[^"\\]|\\.)*")/)[1]);
  assert.match(code, /\}\n\nWrite only the "stories"/);
  assert.match(code, /\n\n## Articles for stories/);
});

test('buildWorkflow JSONTEXT gives a string literal of minified JSON', () => {
  const out = buildWorkflow("const s = JSONTEXT('schemas/select.schema.json');");
  const text = new Function(`${out} return s;`)();
  assert.equal(typeof text, 'string');
  assert.doesNotMatch(text, /\n/);
  assert.deepEqual(JSON.parse(text).required, ['lead_idx', 'story_idx', 'rumor_idx', 'extra_queries']);
});

test('every Code node of every workflow source parses after building', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../n8n/workflows/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.workflow.js'))) {
    const built = buildWorkflow(readFileSync(new URL(file, dir), 'utf8'));
    for (const m of built.matchAll(/jsCode:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/g)) {
      const code = new Function(`return (${m[1].replace(/\+\s*$/, '')});`)();
      assert.doesNotThrow(() => new Function('$', '$input', '$today', '$runIndex', code), `${file}: Code node does not parse`);
    }
  }
});
