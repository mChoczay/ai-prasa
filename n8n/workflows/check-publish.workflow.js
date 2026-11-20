import { workflow, node, trigger } from '@n8n/workflow-sdk';

// Manual check of PPAI · publish with the sample edition dated 2099-01-01. Set MODE in "Test payload"
// to 'publish' (commit + mail) or 'remove' (delete the test edition again, no mail).

const runManually = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: {
    name: 'Run manually',
    parameters: { rule: { interval: [{ field: 'months', monthsInterval: 12, triggerAtDayOfMonth: 1, triggerAtHour: 3, triggerAtMinute: 0 }] } },
  },
  output: [{}],
});

const testPayload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Test payload',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        "const MODE = 'publish';\n" +
        "const DATE = '2099-01-01';\n" +
        'const sample = ' + JSONTEXT('site/data/2026-11-18.json') + ';\n' +
        "if (MODE === 'remove') return [{ json: { date: DATE, run_id: 'test-publish', remove_date: DATE, no_mail: true } }];\n" +
        "return [{ json: { date: DATE, run_id: 'test-publish', edition: { ...sample, date: DATE }, history: { topics: [], tags: [] }, no_mail: false } }];\n",
    },
  },
  output: [{ date: '2099-01-01', run_id: 'test-publish' }],
});

const runPublish = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Run publish',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'CcAkdIqGWlJrqHGQ', cachedResultName: 'PPAI · publish' },
      mode: 'once',
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{}],
});

export default workflow('ppai-check-publish', 'PPAI · check publish').add(runManually).to(testPayload).to(runPublish);
