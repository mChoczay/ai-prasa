import { workflow, node, trigger, switchCase, expr } from '@n8n/workflow-sdk';

// The morning run: budget gate, numbers and news (both awaited, about 80 s), then the relay starts with
// PPAI · select (not awaited). Every later stage runs as its own execution under the 180 s limit.

const schedule = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: {
    name: 'Every day 05:30',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 5, triggerAtMinute: 30 }] } },
  },
  output: [{}],
});

const readState = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read state',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      returnAll: false,
      limit: 1,
    },
  },
  output: [{ id: 1, paused: false, paused_reason: null, monthly_budget_usd: 15, monthly_search_limit: 60, monthly_firecrawl_limit: 300, updated_at: '2026-11-19T05:30:00.000Z' }],
});

const readLedger = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read month ledger',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: '3Mcihd1eN3iLZAdY', cachedResultName: 'cost_ledger' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'month', condition: 'eq', keyValue: expr("{{ $now.setZone('Europe/Warsaw').toFormat('yyyy-MM') }}") }] },
      returnAll: true,
    },
  },
  output: [{ month: '2026-11', service: 'claude', cost_usd: 0.01, calls: 1 }],
});

const gate = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Budget gate',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/dates.js') +
        "const state = $('Read state').first().json;\n" +
        "const ledger = $('Read month ledger').all().map((i) => i.json).filter((r) => r.month);\n" +
        "const now = new Date();\n" +
        "const date = editionDate(now);\n" +
        "const g = checkGate({ state, ledger, currentMonth: monthKey(now) });\n" +
        "const patch = g.statePatch || {};\n" +
        "const action = g.run ? 'run' : g.reason === 'budget' && g.statePatch ? 'budget_mail' : 'stop';\n" +
        "return [{ json: {\n" +
        "  action, reason: g.reason, date, run_id: date + '-' + $execution.id, flags: editionFlags(date),\n" +
        "  spent_usd: g.claudeSpentUsd, budget_usd: state.monthly_budget_usd,\n" +
        "  paused: 'paused' in patch ? patch.paused : state.paused,\n" +
        "  paused_reason: 'paused_reason' in patch ? patch.paused_reason : state.paused_reason,\n" +
        "  updated_at: g.statePatch ? now.toISOString() : state.updated_at,\n" +
        "} }];\n",
    },
  },
  output: [{ action: 'run', reason: null, date: '2026-11-19', run_id: '2026-11-19-1', flags: { weekly: false, monthly: false }, spent_usd: 0, budget_usd: 15, paused: false, paused_reason: null, updated_at: '2026-11-19T05:30:00.000Z' }],
});

const saveState = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save gate state',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          paused: expr("{{ $('Budget gate').first().json.paused }}"),
          paused_reason: expr("{{ $('Budget gate').first().json.paused_reason }}"),
          updated_at: expr("{{ $('Budget gate').first().json.updated_at }}"),
        },
        schema: [
          { id: 'paused', displayName: 'paused', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true },
          { id: 'paused_reason', displayName: 'paused_reason', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'updated_at', displayName: 'updated_at', required: false, defaultMatch: false, display: true, type: 'dateTime', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1 }],
});

const routeGate = switchCase({
  version: 3.2,
  config: {
    name: 'Route gate',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Budget gate').first().json.action }}"), rightValue: 'run', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'run' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Budget gate').first().json.action }}"), rightValue: 'budget_mail', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'budget' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Budget gate').first().json.action }}"), rightValue: 'stop', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'paused' },
        ],
      },
      options: {},
    },
  },
});

const runNumbers = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Run numbers',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'mDc1VY9ib5Z06d1K', cachedResultName: 'PPAI · numbers' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: { date: expr("{{ $('Budget gate').first().json.date }}") },
        schema: [{ id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }],
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ date: '2026-11-19', market: null, rankings: {}, big_moves: [], ranking_moves: [], follow_ups: [], leaderboard_top: [] }],
});

const runNews = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Run news',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: '1Bg3LFCHqDztd7PF', cachedResultName: 'PPAI · news' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: { date: expr("{{ $('Budget gate').first().json.date }}"), run_id: expr("{{ $('Budget gate').first().json.run_id }}") },
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'run_id', displayName: 'run_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ date: '2026-11-19', candidates: [], history_titles: [] }],
});

const buildPayload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build relay payload',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        "const g = $('Budget gate').first().json;\n" +
        "const numbers = $('Run numbers').first().json;\n" +
        "const news = $('Run news').first().json;\n" +
        "// relay: false stops after PPAI · select (used while testing a single stage).\n" +
        "return [{ json: { date: g.date, run_id: g.run_id, relay: true, flags: g.flags, numbers, candidates: news.candidates || [], history_titles: news.history_titles || [] } }];\n",
    },
  },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', relay: true, flags: { weekly: false, monthly: false }, numbers: {}, candidates: [], history_titles: [] }],
});

const handToSelect = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to select',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 't6THUwgbtof6fhSS', cachedResultName: 'PPAI · select' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const stopBudget = node({
  type: 'n8n-nodes-base.stopAndError',
  version: 1,
  config: {
    name: 'Stop: budget',
    parameters: {
      errorType: 'errorMessage',
      errorMessage: expr("BUDGET: wydano {{ $('Budget gate').first().json.spent_usd }} USD z {{ $('Budget gate').first().json.budget_usd }} USD w tym miesiącu"),
    },
  },
  output: [{}],
});

const pausedNoop = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: { name: 'Paused: skip' },
  output: [{}],
});

export default workflow('ppai-daily', 'PPAI · daily')
  .add(schedule)
  .to(readState)
  .to(readLedger)
  .to(gate)
  .to(saveState)
  .to(
    routeGate
      .onCase(0, runNumbers.to(runNews).to(buildPayload).to(handToSelect))
      .onCase(1, stopBudget)
      .onCase(2, pausedNoop),
  );
