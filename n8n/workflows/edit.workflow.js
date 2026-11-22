import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage between front (or period) and profiles: Sonnet as the managing editor rewrites today's
// ledes, bodies and "Dla Ciebie" for readability (the supplements are edited in the period stage, so
// that neither call comes near the 180 s limit). Every text that fails a check (new
// numbers, too short or too long, missing fields) keeps the reporter's version; a failed call passes the
// edition on unchanged, except a credits or auth stop.

const editRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Edit request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-22', run_id: '2026-11-22-1', relay: false, stop_after: '', flags: { weekly: false, monthly: false }, feedback: '', edition: {} }],
});

const buildPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build edit prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/edit.js') +
        'const SCHEMA = ' + JSONTEXT('schemas/edit.schema.json') + ';\n' +
        "const p = $('Edit request').first().json;\n" +
        "return [{ json: { user: editPrompt(p.edition, p.feedback || '', { supplements: false }), schema: SCHEMA } }];\n",
    },
  },
  output: [{ user: '...', schema: { type: 'object' } }],
});

const editWithSonnet = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Edit with Sonnet',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Edit request').first().json.run_id }}"),
          step: 'edit',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/edit.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'low',
          max_tokens: 10000,
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
  output: [{ ok: true, data: { stories: [], supplements: [] }, cost_usd: 0.08 }],
});

const applyEditsNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Apply edits',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/edit.js') +
        "const results = $input.all().map((i) => i.json);\n" +
        "const stop = pauseErrorOf(results);\n" +
        "if (stop) throw new Error(stop);\n" +
        "const p = $('Edit request').first().json;\n" +
        "const r = results[0] || {};\n" +
        "if (!r.ok) return [{ json: { ...p, edited: false, edit_kept: [] } }];\n" +
        "const done = applyEdits(p.edition, r.data);\n" +
        "return [{ json: { ...p, edition: done.edition, edited: true, edit_kept: done.report.kept } }];\n",
    },
  },
  output: [{ date: '2026-11-22', run_id: 'r', relay: false, edition: {}, edited: true, edit_kept: [] }],
});

const relayCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Relay?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr("{{ $json.relay && $json.stop_after !== 'edit' }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const handToProfiles = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to profiles',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'JlzjHDGeEemYMhQr', cachedResultName: 'PPAI · profiles' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const returnPayload = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Return payload' }, output: [{}] });

export default workflow('ppai-edit', 'PPAI · redakcja')
  .add(editRequest)
  .to(buildPrompt)
  .to(editWithSonnet)
  .to(applyEditsNode)
  .to(relayCheck.onTrue(handToProfiles).onFalse(returnPayload));
