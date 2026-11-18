import test from 'node:test';
import assert from 'node:assert/strict';
import { costUsd, checkGate, classifyApiError, assessResponse, extractJsonText } from '../n8n/lib/budget.js';

const baseState = {
  paused: false,
  paused_reason: '',
  monthly_budget_usd: 15,
  monthly_search_limit: 60,
  monthly_firecrawl_limit: 300,
  updated_at: '2026-11-01T05:30:00Z',
};

test('costUsd sonnet', () => {
  assert.equal(costUsd('claude-sonnet-5-5', { input_tokens: 1_000_000, output_tokens: 100_000 }), 3);
});

test('costUsd haiku long prompt tier', () => {
  assert.equal(costUsd('claude-haiku-5-5', { input_tokens: 200_000, output_tokens: 0 }), 0.1);
});

test('costUsd haiku short prompt tier', () => {
  assert.equal(costUsd('claude-haiku-5-5', { input_tokens: 50_000, output_tokens: 10_000 }), 0.01);
});

test('costUsd cache read and write', () => {
  assert.equal(
    costUsd('claude-sonnet-5-5', {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    }),
    2.6,
  );
});

test('costUsd unknown model throws', () => {
  assert.throws(() => costUsd('claude-opus-5-5', { input_tokens: 1, output_tokens: 1 }), /unknown model/i);
});

test('gate blocks when reserve would exceed budget', () => {
  const r = checkGate({
    state: baseState,
    ledger: [{ month: '2026-11', service: 'claude', cost_usd: 14.6 }],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'budget', { paused: true, paused_reason: 'budget' }]);
  assert.equal(r.claudeSpentUsd, 14.6);
});

test('gate allows a run that fits under budget with reserve', () => {
  const r = checkGate({
    state: baseState,
    ledger: [{ month: '2026-11', service: 'claude', cost_usd: 14.4 }],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [true, null, null]);
});

test('gate auto-unpauses budget pause in a new month', () => {
  const r = checkGate({
    state: { ...baseState, paused: true, paused_reason: 'budget', updated_at: '2026-10-31T05:30:00Z' },
    ledger: [],
    currentMonth: '2026-11',
  });
  assert.equal(r.run, true);
  assert.equal(r.reason, null);
  assert.deepEqual(r.statePatch, { paused: false, paused_reason: null });
});

test('gate keeps budget pause within the same month', () => {
  const r = checkGate({
    state: { ...baseState, paused: true, paused_reason: 'budget', updated_at: '2026-11-20T05:30:00Z' },
    ledger: [],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'budget', null]);
});

test('gate never auto-unpauses credits pause', () => {
  const r = checkGate({
    state: { ...baseState, paused: true, paused_reason: 'credits', updated_at: '2026-10-31T05:30:00Z' },
    ledger: [],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'paused_credits', null]);
});

test('gate never auto-unpauses auth pause', () => {
  const r = checkGate({
    state: { ...baseState, paused: true, paused_reason: 'auth', updated_at: '2026-10-31T05:30:00Z' },
    ledger: [],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'paused_auth', null]);
});

test('gate treats manual pause as blocking', () => {
  const r = checkGate({
    state: { ...baseState, paused: true, paused_reason: 'manual' },
    ledger: [],
    currentMonth: '2026-11',
  });
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'paused_manual', null]);
});

test('gate counts only current month and only claude for budget', () => {
  const r = checkGate({
    state: baseState,
    ledger: [
      { month: '2026-10', service: 'claude', cost_usd: 99 },
      { month: '2026-11', service: 'brave', cost_usd: 0, calls: 5 },
    ],
    currentMonth: '2026-11',
  });
  assert.equal(r.run, true);
  assert.equal(r.claudeSpentUsd, 0);
});

test('gate disables brave at limit but still runs', () => {
  const ledger = Array.from({ length: 60 }, () => ({ month: '2026-11', service: 'brave', cost_usd: 0 }));
  const r = checkGate({ state: baseState, ledger, currentMonth: '2026-11' });
  assert.equal(r.run, true);
  assert.equal(r.braveAllowed, false);
  assert.equal(r.firecrawlAllowed, true);
});

test('gate sums the calls field for firecrawl limit', () => {
  const r = checkGate({
    state: baseState,
    ledger: [{ month: '2026-11', service: 'firecrawl', cost_usd: 0, calls: 300 }],
    currentMonth: '2026-11',
  });
  assert.equal(r.firecrawlAllowed, false);
  assert.equal(r.braveAllowed, true);
});

test('classifyApiError', () => {
  assert.equal(
    classifyApiError(400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API"}}'),
    'credits',
  );
  assert.equal(classifyApiError(402, '{}'), 'credits');
  assert.equal(classifyApiError(401, '{"error":{"type":"authentication_error"}}'), 'auth');
  assert.equal(classifyApiError(403, ''), 'auth');
  for (const s of [429, 500, 503, 529]) assert.equal(classifyApiError(s, ''), 'transient');
  assert.equal(classifyApiError(400, '{"error":{"message":"bad schema"}}'), 'fatal');
});

test('assessResponse ok skips thinking', () => {
  const r = assessResponse({
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: '{"a":1}' },
    ],
  });
  assert.deepEqual(r, { ok: true, data: { a: 1 } });
});

test('assessResponse truncated', () => {
  const r = assessResponse({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"a":' }] });
  assert.deepEqual(r, { ok: false, kind: 'truncated' });
});

test('assessResponse refusal', () => {
  const r = assessResponse({ stop_reason: 'refusal', content: [] });
  assert.deepEqual(r, { ok: false, kind: 'refusal' });
});

test('assessResponse bad_json', () => {
  const r = assessResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'nope' }] });
  assert.deepEqual(r, { ok: false, kind: 'bad_json' });
});

test('extractJsonText joins text blocks only', () => {
  const t = extractJsonText({
    content: [
      { type: 'text', text: '{"a":' },
      { type: 'thinking', thinking: 'x' },
      { type: 'text', text: '1}' },
    ],
  });
  assert.equal(t, '{"a":1}');
});
