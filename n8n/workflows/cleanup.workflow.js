import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// Monthly housekeeping: rows older than 60 days leave the tables that grow every day. The pipeline reads
// at most 35 days back (reader feedback; 32 for the monthly supplement), so 60 days is a safe margin.
// topics_history, cost_ledger, reader_feedback, entity_profiles and glossary_terms are kept.

const monthly = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Monthly on the 2nd',
    parameters: { rule: { interval: [{ field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 2, triggerAtHour: 4, triggerAtMinute: 0 }] } },
  },
  output: [{}],
});

const clearBoards = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Old leaderboard snapshots',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: { resource: 'row', operation: 'deleteRows', dataTableId: { __rl: true, mode: 'id', value: '9PHj89xswPDRzjlo', cachedResultName: 'leaderboard_snapshots' }, matchType: 'allConditions', filters: { conditions: [{ keyName: 'createdAt', condition: 'lt', keyValue: expr("{{ $today.minus(60, 'days').toISO() }}") }] } },
  },
  output: [{}],
});

const clearMarket = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Old market snapshots',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: { resource: 'row', operation: 'deleteRows', dataTableId: { __rl: true, mode: 'id', value: 'vgsxC2Az6D9WXUDC', cachedResultName: 'market_snapshots' }, matchType: 'allConditions', filters: { conditions: [{ keyName: 'createdAt', condition: 'lt', keyValue: expr("{{ $today.minus(60, 'days').toISO() }}") }] } },
  },
  output: [{}],
});

const clearMoves = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Old move log',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: { resource: 'row', operation: 'deleteRows', dataTableId: { __rl: true, mode: 'id', value: 'VNLgCQrBHwhYOm3e', cachedResultName: 'move_log' }, matchType: 'allConditions', filters: { conditions: [{ keyName: 'createdAt', condition: 'lt', keyValue: expr("{{ $today.minus(60, 'days').toISO() }}") }] } },
  },
  output: [{}],
});

const clearTags = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Old impact tags',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: { resource: 'row', operation: 'deleteRows', dataTableId: { __rl: true, mode: 'id', value: '4IfcvfENP0VE7sak', cachedResultName: 'impact_tags' }, matchType: 'allConditions', filters: { conditions: [{ keyName: 'createdAt', condition: 'lt', keyValue: expr("{{ $today.minus(60, 'days').toISO() }}") }] } },
  },
  output: [{}],
});

export default workflow('ppai-cleanup', 'PPAI · sprzątanie').add(monthly).to(clearBoards).to(clearMarket).to(clearMoves).to(clearTags);
