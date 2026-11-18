import { workflow, node, trigger } from '@n8n/workflow-sdk';

const runManually = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Run manually',
    parameters: { rule: { interval: [{ field: 'months', monthsInterval: 12, triggerAtDayOfMonth: 1, triggerAtHour: 3, triggerAtMinute: 0 }] } },
  },
  output: [{}],
});

const dropFakeRows = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Drop pinned-test cost rows',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: '3Mcihd1eN3iLZAdY', cachedResultName: 'cost_ledger' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'run_id', condition: 'like', keyValue: 'test-%' }] },
    },
  },
  output: [{ id: 1 }],
});

const askClaude = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Ask Claude',
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: 'live-check',
          step: 'connectivity check',
          model: 'claude-haiku-5-5',
          system: 'You answer with JSON only.',
          user: 'Return ok=true.',
          schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
          effort: 'low',
          max_tokens: 1000,
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
  output: [{ ok: true, data: { ok: true }, usage: { input_tokens: 20, output_tokens: 5 }, cost_usd: 0.000005 }],
});

export default workflow('ppai-test-claude', 'PPAI · test claude')
  .add(runManually)
  .to(dropFakeRows)
  .to(askClaude);
