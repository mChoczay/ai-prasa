import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/period.workflow.js';
const payload = {
  date: '2026-11-22',
  run_id: 'r',
  relay: true,
  flags: { weekly: true, monthly: false },
  edition: { date: '2026-11-22', greeting: 'g', lead_story: { title: 'Today lead', lede: 'l', category: 'modele', status: 'potwierdzone' }, stories: [], weekly: null, monthly: null },
  numbers: { market: null, rankings: null },
};

test('period prompt includes the stored topics and today\'s stories, with a schema for the flagged kinds', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Build period prompt'), {
    nodes: {
      'Period request': [payload],
      'Read recent topics': [{ date: '2026-11-20', title: 'Stored story', summary: 's', category: 'gielda', status: 'potwierdzone' }, {}],
      'Read leaderboard snapshots': [{}],
    },
  });
  assert.deepEqual(json.kinds, ['weekly']);
  assert.deepEqual(json.schema.required, ['weekly']);
  assert.equal(json.schema.properties.weekly.required.includes('race_map'), true);
  assert.match(json.user, /Stored story/);
  assert.match(json.user, /2026-11-22 \[modele, potwierdzone\] Today lead/);
  assert.match(json.user, /requested key: weekly\./);
  assert.doesNotMatch(json.user, /Reader feedback/);
});

test('period prompt passes the reader feedback on', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Build period prompt'), {
    nodes: {
      'Period request': [{ ...payload, feedback: 'Notes from the reader: ściana tekstu' }],
      'Read recent topics': [{}],
      'Read leaderboard snapshots': [{}],
    },
  });
  assert.match(json.user, /## Reader feedback\nNotes from the reader: ściana tekstu/);
});

test('add supplements keeps the edition when the supplement failed, but stops on credits', () => {
  const code = codeNodeSource(WF, 'Add supplements');
  const [{ json }] = runCodeNode(code, { nodes: { 'Period request': [payload] }, input: [{ error: 'TRUNCATED: period' }] });
  assert.equal(json.edition.weekly, null);
  assert.equal(json.edition.lead_story.title, 'Today lead');
  const [{ json: ok }] = runCodeNode(code, { nodes: { 'Period request': [payload] }, input: [{ ok: true, data: { weekly: { title: 'Tydzień', body: 'b', takeaways: [], race_map: [] } } }] });
  assert.equal(ok.edition.weekly.title, 'Tydzień');
  assert.throws(() => runCodeNode(code, { nodes: { 'Period request': [payload] }, input: [{ error: { message: 'AUTH: period HTTP 401' } }] }), /AUTH:/);
});

test('the period stage has the supplements edited, keeping the written version when the editor fails', () => {
  const PERIOD = 'n8n/workflows/period.workflow.js';
  const added = { ...payload, feedback: 'Notes: krócej', edition: { ...payload.edition, weekly: { title: 'Tydzień', body: `## Rynek\n\nSpadek o 5%. ${'słowo '.repeat(100)}`, takeaways: ['a', 'b', 'c'], race_map: [] } } };
  const [{ json: prompt }] = runCodeNode(codeNodeSource(PERIOD, 'Supplement edit prompt'), { nodes: { 'Add supplements': [added] } });
  assert.match(prompt.user, /### Supplement weekly/);
  assert.doesNotMatch(prompt.user, /### Story/);
  assert.match(prompt.user, /## Reader feedback\nNotes: krócej/);
  const apply = codeNodeSource(PERIOD, 'Apply supplement edits');
  const good = { ok: true, data: { stories: [], supplements: [{ kind: 'weekly', title: 'Nowy', body: `## Rynek\n\nSpadek o 5%. ${'słowo '.repeat(80)}`, takeaways: ['x', 'y', 'z'] }] } };
  const [{ json: edited }] = runCodeNode(apply, { nodes: { 'Add supplements': [added] }, input: [good] });
  assert.equal(edited.edition.weekly.title, 'Nowy');
  assert.equal(edited.relay, true);
  const [{ json: failed }] = runCodeNode(apply, { nodes: { 'Add supplements': [added] }, input: [{ error: 'TRUNCATED: edit supplements' }] });
  assert.equal(failed.edition.weekly.title, 'Tydzień');
  assert.throws(() => runCodeNode(apply, { nodes: { 'Add supplements': [added] }, input: [{ error: { message: 'CREDITS: x' } }] }), /CREDITS:/);
  const wf = readFileSync(new URL('../n8n/workflows/period.workflow.js', import.meta.url), 'utf8');
  assert.match(wf, /\.to\(addPeriodsNode\)\s*\.to\(supplementEditPrompt\)\s*\.to\(editSupplements\)\s*\.to\(applySupplementEdits\)/);
  assert.match(wf, /system: TEXT\('prompts\/edit\.md'\)/);
});
