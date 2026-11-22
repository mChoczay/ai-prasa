import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage between front and the editor, only on Sundays (weekly) and the 1st (monthly): Sonnet writes
// "Tydzień w AI" / "Miesiąc w AI" from the published topics, stock changes and leaderboard snapshots.
// A failed supplement is skipped (the daily edition still goes out), except a credits or auth stop.

const periodRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Period request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-22', run_id: 'r', relay: false, flags: { weekly: true, monthly: false }, edition: {}, numbers: { market: null, rankings: null } }],
});

const readTopics = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read recent topics',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'FkEQeOlZyvmwYNXB', cachedResultName: 'topics_history' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(32, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-21', title: 't', summary: 's', category: 'modele', status: 'potwierdzone' }],
});

const readSnapshots = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read leaderboard snapshots',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: '9PHj89xswPDRzjlo', cachedResultName: 'leaderboard_snapshots' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(32, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-16', board: 'lmarena', rank: 1, model: 'm', org: 'o', score: 1 }],
});

const buildPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build period prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/period.js') +
        'const SINGLE = ' + JSONTEXT('schemas/period.schema.json') + ';\n' +
        "const p = $('Period request').first().json;\n" +
        "const kinds = periodKinds(p.flags);\n" +
        "const today = [p.edition.lead_story, ...(p.edition.stories || [])].filter(Boolean).map((s) => ({ date: p.date, title: s.title, summary: s.lede, category: s.category, status: s.status }));\n" +
        "const topics = $('Read recent topics').all().map((i) => i.json).filter((t) => t.title && t.date !== p.date).concat(today);\n" +
        "const snapshots = $('Read leaderboard snapshots').all().map((i) => i.json).filter((r) => r.board);\n" +
        "const user = periodUserText({ kinds, date: p.date, topics, snapshots, numbers: p.numbers, feedback: p.feedback || '' });\n" +
        "return [{ json: { kinds, user, schema: periodSchema(SINGLE, kinds) } }];\n",
    },
  },
  output: [{ kinds: ['weekly'], user: '...', schema: { type: 'object' } }],
});

const writePeriod = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Write period with Sonnet',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Period request').first().json.run_id }}"),
          step: 'period',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/period.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'medium',
          max_tokens: 14000,
        },
        schema: [
          { id: 'run_id', displayName: 'run_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'step', displayName: 'step', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'model', displayName: 'model', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'system', displayName: 'system', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'user', displayName: 'user', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'schema', displayName: 'schema', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: true },
          { id: 'effort', displayName: 'effort', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'max_tokens', displayName: 'max_tokens', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ ok: true, data: { weekly: { title: 't', body: 'b', takeaways: [], race_map: [] } } }],
});

const addPeriodsNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Add supplements',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/period.js') +
        "const results = $input.all().map((i) => i.json);\n" +
        "const stop = pauseErrorOf(results);\n" +
        "if (stop) throw new Error(stop);\n" +
        "const p = $('Period request').first().json;\n" +
        "const r = results[0] || {};\n" +
        "const edition = addPeriods(p.edition, r.ok ? r.data : null, periodKinds(p.flags));\n" +
        "return [{ json: { ...p, edition } }];\n",
    },
  },
  output: [{ date: '2026-11-22', run_id: 'r', relay: false, edition: {} }],
});

// The managing editor goes over the supplements right here (the edit stage handles the daily stories), so
// each Sonnet call stays well inside the 180 s limit of an execution.
const supplementEditPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Supplement edit prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/edit.js') +
        'const SCHEMA = ' + JSONTEXT('schemas/edit.schema.json') + ';\n' +
        "const p = $('Add supplements').first().json;\n" +
        "return [{ json: { user: editPrompt(p.edition, p.feedback || '', { stories: false }), schema: SCHEMA } }];\n",
    },
  },
  output: [{ user: '...', schema: { type: 'object' } }],
});

const editSupplements = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Edit supplements with Sonnet',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Period request').first().json.run_id }}"),
          step: 'edit supplements',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/edit.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'low',
          max_tokens: 8000,
        },
        schema: [
          { id: 'run_id', displayName: 'run_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'step', displayName: 'step', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'model', displayName: 'model', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'system', displayName: 'system', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'user', displayName: 'user', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'schema', displayName: 'schema', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: true },
          { id: 'effort', displayName: 'effort', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'max_tokens', displayName: 'max_tokens', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ ok: true, data: { stories: [], supplements: [] }, cost_usd: 0.04 }],
});

const applySupplementEdits = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Apply supplement edits',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/edit.js') +
        "const results = $input.all().map((i) => i.json);\n" +
        "const stop = pauseErrorOf(results);\n" +
        "if (stop) throw new Error(stop);\n" +
        "const p = $('Add supplements').first().json;\n" +
        "const r = results[0] || {};\n" +
        "if (!r.ok) return [{ json: { ...p, supplements_edited: false, supplement_edit_kept: [] } }];\n" +
        "const done = applyEdits(p.edition, { stories: [], supplements: (r.data && r.data.supplements) || [] });\n" +
        "return [{ json: { ...p, edition: done.edition, supplements_edited: true, supplement_edit_kept: done.report.kept } }];\n",
    },
  },
  output: [{ date: '2026-11-22', run_id: 'r', relay: false, edition: {} }],
});

const relayCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Relay?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr("{{ $json.relay && $json.stop_after !== 'period' }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const handToEditor = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to editor',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'PSOZYxd2bShSJf3H', cachedResultName: 'PPAI · redakcja' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const returnPayload = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Return payload' }, output: [{}] });

export default workflow('ppai-period', 'PPAI · period')
  .add(periodRequest)
  .to(readTopics)
  .to(readSnapshots)
  .to(buildPrompt)
  .to(writePeriod)
  .to(addPeriodsNode)
  .to(supplementEditPrompt)
  .to(editSupplements)
  .to(applySupplementEdits)
  .to(relayCheck.onTrue(handToEditor).onFalse(returnPayload));
