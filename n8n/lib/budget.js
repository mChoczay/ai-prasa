// Budget gate, cost accounting and Claude response checks.
// Dependency-free: inlined into n8n Code nodes by scripts/inline-lib.mjs.

// USD per 1M tokens, verified 2026-11-18 on platform.claude.com/docs/en/about-claude/pricing.
// A tier applies while the prompt (input + cache writes + cache reads) is <= maxPromptTokens.
const PRICES = Object.freeze({
  'claude-haiku-5-5': Object.freeze([
    Object.freeze({ maxPromptTokens: 100_000, input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 }),
    Object.freeze({ maxPromptTokens: Infinity, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 }),
  ]),
  'claude-sonnet-5-5': Object.freeze([
    Object.freeze({ maxPromptTokens: Infinity, input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 }),
  ]),
});

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function costUsd(model, usage) {
  const tiers = PRICES[model];
  if (!tiers) throw new Error(`unknown model: ${model}`);
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const promptTokens = input + cacheWrite + cacheRead;
  const tier = tiers.find((t) => promptTokens <= t.maxPromptTokens);
  const total =
    (input * tier.input + output * tier.output + cacheWrite * tier.cacheWrite + cacheRead * tier.cacheRead) / 1e6;
  return round6(total);
}

// Month of an ISO timestamp in Warsaw time ('YYYY-MM'); private to the gate.
function _gateMonth(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  return `${y}-${m}`;
}

function checkGate({ state, ledger, currentMonth, reserveUsd = 0.5 }) {
  const monthRows = (ledger || []).filter((r) => r.month === currentMonth);
  const claudeSpentUsd = round6(
    monthRows.filter((r) => r.service === 'claude').reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0),
  );
  const callsFor = (service) =>
    monthRows.filter((r) => r.service === service).reduce((sum, r) => sum + (r.calls == null ? 1 : Number(r.calls)), 0);
  const braveAllowed = callsFor('brave') < state.monthly_search_limit;
  const firecrawlAllowed = callsFor('firecrawl') < state.monthly_firecrawl_limit;
  const result = (run, reason, statePatch) => ({ run, reason, statePatch, claudeSpentUsd, braveAllowed, firecrawlAllowed });

  let statePatch = null;
  if (state.paused) {
    if (state.paused_reason === 'budget') {
      if (_gateMonth(state.updated_at) === currentMonth) return result(false, 'budget', null);
      statePatch = { paused: false, paused_reason: null };
    } else if (state.paused_reason === 'credits') {
      return result(false, 'paused_credits', null);
    } else if (state.paused_reason === 'auth') {
      return result(false, 'paused_auth', null);
    } else {
      return result(false, 'paused_manual', null);
    }
  }

  if (claudeSpentUsd + reserveUsd > state.monthly_budget_usd) {
    return result(false, 'budget', { paused: true, paused_reason: 'budget' });
  }
  return result(true, null, statePatch);
}

function classifyApiError(status, bodyText) {
  if (status === 402) return 'credits';
  if (status === 400 && /credit balance is too low/i.test(bodyText || '')) return 'credits';
  if (status === 401 || status === 403) return 'auth';
  if (status === 408 || status === 429 || status >= 500) return 'transient';
  return 'fatal';
}

function extractJsonText(json) {
  return (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function assessResponse(json) {
  if (json.stop_reason === 'refusal') return { ok: false, kind: 'refusal' };
  if (json.stop_reason === 'max_tokens') return { ok: false, kind: 'truncated' };
  try {
    return { ok: true, data: JSON.parse(extractJsonText(json)) };
  } catch {
    return { ok: false, kind: 'bad_json' };
  }
}

// Results of Claude calls made with "continue on error": the first credits or auth stop, if any.
// Such a stop must still end the stage (and send its mail); other failures may be skipped.
function pauseErrorOf(results) {
  for (const r of results || []) {
    const e = r && r.error;
    const message = typeof e === 'string' ? e : (e && e.message) || '';
    if (/^(CREDITS|AUTH):/.test(message)) return message;
  }
  return null;
}

export { PRICES, costUsd, checkGate, classifyApiError, extractJsonText, assessResponse, pauseErrorOf };
