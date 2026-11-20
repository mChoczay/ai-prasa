import test from 'node:test';
import assert from 'node:assert/strict';
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
