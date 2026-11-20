import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const gateCode = codeNodeSource('n8n/workflows/daily.workflow.js', 'Budget gate');
const month = new Date().toISOString().slice(0, 7);
const baseState = { id: 1, paused: false, paused_reason: null, monthly_budget_usd: 15, monthly_search_limit: 60, monthly_firecrawl_limit: 300, updated_at: new Date().toISOString() };

const runGate = (state, ledger = [{}]) =>
  runCodeNode(gateCode, {
    globals: { $execution: { id: '77' }, URL: undefined },
    nodes: { 'Read state': [state], 'Read month ledger': ledger },
  })[0].json;

test('gate runs on a normal day and builds the run id from the execution id', () => {
  const g = runGate(baseState, [{ month, service: 'claude', cost_usd: 1.2 }]);
  assert.equal(g.action, 'run');
  assert.match(g.run_id, /^\d{4}-\d{2}-\d{2}-77$/);
  assert.equal(g.paused, false);
  assert.equal(g.spent_usd, 1.2);
});

test('gate stops silently when paused for credits, auth or by hand', () => {
  for (const reason of ['credits', 'auth', 'manual']) {
    const g = runGate({ ...baseState, paused: true, paused_reason: reason });
    assert.equal(g.action, 'stop');
    assert.equal(g.paused, true);
    assert.equal(g.paused_reason, reason);
  }
});

test('gate pauses with one budget mail when the month is spent, then stays quiet', () => {
  const first = runGate({ ...baseState, monthly_budget_usd: 0.01 });
  assert.equal(first.action, 'budget_mail');
  assert.equal(first.paused, true);
  assert.equal(first.paused_reason, 'budget');
  const next = runGate({ ...baseState, monthly_budget_usd: 0.01, paused: true, paused_reason: 'budget' });
  assert.equal(next.action, 'stop');
});

test('gate unpauses a budget stop from an earlier month', () => {
  const g = runGate({ ...baseState, paused: true, paused_reason: 'budget', updated_at: '2020-01-15T05:30:00.000Z' });
  assert.equal(g.action, 'run');
  assert.equal(g.paused, false);
  assert.equal(g.paused_reason, null);
});

const payloadCode = codeNodeSource('n8n/workflows/daily.workflow.js', 'Build relay payload');
const payloadNodes = (feedbackRows) => ({
  'Budget gate': [{ date: '2026-11-20', run_id: '2026-11-20-1', flags: { weekly: false, monthly: false } }],
  'Run numbers': [{ date: '2026-11-20' }],
  'Run news': [{ candidates: [], history_titles: [] }],
  'Read feedback': feedbackRows,
});

test('relay payload carries the reader feedback digest, empty when the table is empty', () => {
  const rows = [{ id: 1, date: '2026-11-19', n: 1, title: 'Genie 4', category: 'modele', rating: 'less', note: '', createdAt: '2026-11-19T07:00:00Z' }];
  const [{ json }] = runCodeNode(payloadCode, { nodes: payloadNodes(rows) });
  assert.match(json.feedback, /less like this: "Genie 4" \(modele\)/);
  assert.equal(json.run_id, '2026-11-20-1');
  const [{ json: empty }] = runCodeNode(payloadCode, { nodes: payloadNodes([{}]) });
  assert.equal(empty.feedback, '');
});
