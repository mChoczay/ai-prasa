import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const runManually = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Run manually',
    parameters: { rule: { interval: [{ field: 'months', monthsInterval: 12, triggerAtDayOfMonth: 1, triggerAtHour: 3, triggerAtMinute: 0 }] } },
  },
  output: [{}],
});

const unpause = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Unpause pipeline',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      columns: {
        mappingMode: 'defineBelow',
        value: { paused: false, paused_reason: '', updated_at: expr('{{ $now.toISO() }}') },
        schema: [
          { id: 'paused', displayName: 'paused', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true },
          { id: 'paused_reason', displayName: 'paused_reason', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'updated_at', displayName: 'updated_at', required: false, defaultMatch: false, display: true, type: 'dateTime', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1, paused: false }],
});

export default workflow('ppai-unpause', 'PPAI · odblokuj')
  .add(runManually)
  .to(unpause);
