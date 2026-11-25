import { workflow, node, trigger, switchCase, expr } from '@n8n/workflow-sdk';

const claudeRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: {
    name: 'Claude request',
    parameters: {
      inputSource: 'workflowInputs',
      workflowInputs: {
        values: [
          { name: 'run_id', type: 'string' },
          { name: 'step', type: 'string' },
          { name: 'model', type: 'string' },
          { name: 'system', type: 'string' },
          { name: 'user', type: 'string' },
          { name: 'schema', type: 'object' },
          { name: 'effort', type: 'string' },
          { name: 'max_tokens', type: 'number' },
        ],
      },
    },
  },
  output: [{ run_id: '2026-11-19-1', step: 'test', model: 'claude-haiku-5-5', system: 'Return JSON.', user: 'Return ok=true.', schema: { type: 'object' }, effort: 'low', max_tokens: 1000 }],
});

const buildRequest = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build request',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        "const i = $input.first().json;\n" +
        "const schema = typeof i.schema === 'string' ? JSON.parse(i.schema) : i.schema;\n" +
        "const body = {\n" +
        "  model: i.model,\n" +
        "  max_tokens: Number(i.max_tokens) || 16000,\n" +
        "  system: i.system,\n" +
        "  messages: [{ role: 'user', content: i.user }],\n" +
        "  output_config: { effort: i.effort || 'low', format: { type: 'json_schema', schema } },\n" +
        "};\n" +
        "return [{ json: { run_id: i.run_id, step: i.step, model: i.model, body } }];\n",
    },
  },
  output: [{ run_id: '2026-11-19-1', step: 'test', model: 'claude-haiku-5-5', body: { model: 'claude-haiku-5-5' } }],
});

const callClaude = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Call Claude',
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'anthropicApi',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2026-10-21' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($("Build request").first().json.body) }}'),
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } },
        timeout: 600000,
      },
    },
    credentials: { anthropicApi: { id: 'Cda0VJtdeKx21Dcj', name: 'ai-prasa-30days' } },
  },
  output: [{ statusCode: 200, headers: {}, body: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }], usage: { input_tokens: 20, output_tokens: 5 } } }],
});

const assessResponse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Assess response',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/dates.js') +
        "const res = $input.first().json;\n" +
        "const req = $('Build request').first().json;\n" +
        "const attempt = $runIndex;\n" +
        "const status = Number(res.statusCode);\n" +
        "const body = res.body || {};\n" +
        "const bodyText = typeof body === 'string' ? body : JSON.stringify(body);\n" +
        "const usage = body && body.usage ? body.usage : null;\n" +
        "const now = new Date();\n" +
        "let cost = 0;\n" +
        "if (usage) { try { cost = costUsd(req.model, usage); } catch (e) { cost = 0; } }\n" +
        "const ledger = usage ? {\n" +
        "  date: editionDate(now), month: monthKey(now), run_id: req.run_id, step: req.step, service: 'claude', model: req.model,\n" +
        "  input_tokens: (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),\n" +
        "  output_tokens: usage.output_tokens || 0, calls: 1, cost_usd: cost,\n" +
        "} : null;\n" +
        "let action = 'fail', message = '', wait_seconds = 0, data = null, pause_reason = '';\n" +
        "const where = req.step + ' (' + req.model + ')';\n" +
        "if (status >= 200 && status < 300) {\n" +
        "  const a = assessResponse(body);\n" +
        "  if (a.ok) { action = 'ok'; data = a.data; }\n" +
        "  else if (attempt < 1) { action = 'retry'; wait_seconds = 5; message = a.kind; }\n" +
        "  else { const prefix = { truncated: 'TRUNCATED', refusal: 'REFUSAL', bad_json: 'FATAL' }[a.kind] || 'FATAL';\n" +
        "    message = prefix + ': ' + where + ' stop_reason=' + body.stop_reason; }\n" +
        "} else {\n" +
        "  const kind = classifyApiError(status, bodyText);\n" +
        "  if (kind === 'credits' || kind === 'auth') { action = 'pause'; pause_reason = kind;\n" +
        "    message = (kind === 'credits' ? 'CREDITS: ' : 'AUTH: ') + where + ' HTTP ' + status; }\n" +
        "  else if (kind === 'transient' && attempt < 2) { action = 'retry'; wait_seconds = attempt === 0 ? 30 : 120; message = 'HTTP ' + status; }\n" +
        "  else { message = 'FATAL: ' + where + ' HTTP ' + status + ' ' + bodyText.slice(0, 300); }\n" +
        "}\n" +
        "return [{ json: { action, message, wait_seconds, data, usage, cost_usd: cost, ledger, has_usage: !!usage, pause_reason, attempt } }];\n",
    },
  },
  output: [{ action: 'ok', message: '', wait_seconds: 0, data: { ok: true }, usage: { input_tokens: 20, output_tokens: 5 }, cost_usd: 0.000005, ledger: { date: '2026-11-19', month: '2026-11', run_id: 'r', step: 'test', service: 'claude', model: 'claude-haiku-5-5', input_tokens: 20, output_tokens: 5, calls: 1, cost_usd: 0.000005 }, has_usage: true, pause_reason: '', attempt: 0 }],
});

const recordCost = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Record cost',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: '3Mcihd1eN3iLZAdY', cachedResultName: 'cost_ledger' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          date: expr("{{ $json.ledger ? $json.ledger.date : $now.setZone('Europe/Warsaw').toFormat('yyyy-MM-dd') }}"),
          month: expr("{{ $json.ledger ? $json.ledger.month : $now.setZone('Europe/Warsaw').toFormat('yyyy-MM') }}"),
          run_id: expr("{{ $('Build request').first().json.run_id }}"),
          step: expr("{{ $('Build request').first().json.step }}"),
          service: 'claude',
          model: expr("{{ $('Build request').first().json.model }}"),
          input_tokens: expr('{{ $json.ledger ? $json.ledger.input_tokens : 0 }}'),
          output_tokens: expr('{{ $json.ledger ? $json.ledger.output_tokens : 0 }}'),
          calls: 1,
          cost_usd: expr('{{ $json.cost_usd || 0 }}'),
        },
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'month', displayName: 'month', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'run_id', displayName: 'run_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'step', displayName: 'step', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'service', displayName: 'service', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'model', displayName: 'model', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'input_tokens', displayName: 'input_tokens', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'output_tokens', displayName: 'output_tokens', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'calls', displayName: 'calls', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'cost_usd', displayName: 'cost_usd', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1, createdAt: '2026-11-19T05:31:00Z', updatedAt: '2026-11-19T05:31:00Z' }],
});

const routeOutcome = switchCase({
  version: 3.2,
  config: {
    name: 'Route outcome',
    parameters: {
      rules: {
        values: [
          { outputKey: 'ok', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr("{{ $('Assess response').item.json.action }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'ok' }], combinator: 'and' } },
          { outputKey: 'retry', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr("{{ $('Assess response').item.json.action }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'retry' }], combinator: 'and' } },
          { outputKey: 'pause', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr("{{ $('Assess response').item.json.action }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'pause' }], combinator: 'and' } },
          { outputKey: 'fail', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr("{{ $('Assess response').item.json.action }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'fail' }], combinator: 'and' } },
        ],
      },
      options: {},
    },
  },
});

const returnResult = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Return result',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'ok', name: 'ok', value: true, type: 'boolean' },
          { id: 'data', name: 'data', value: expr("{{ $('Assess response').item.json.data }}"), type: 'object' },
          { id: 'usage', name: 'usage', value: expr("{{ $('Assess response').item.json.usage }}"), type: 'object' },
          { id: 'cost', name: 'cost_usd', value: expr("{{ $('Assess response').item.json.cost_usd }}"), type: 'number' },
        ],
      },
    },
  },
  output: [{ ok: true, data: { ok: true }, usage: { input_tokens: 20, output_tokens: 5 }, cost_usd: 0.000005 }],
});

const waitBeforeRetry = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait before retry',
    parameters: { resume: 'timeInterval', amount: expr("{{ $('Assess response').item.json.wait_seconds }}"), unit: 'seconds' },
  },
  output: [{ action: 'retry', wait_seconds: 30 }],
});

const pausePipeline = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Pause pipeline',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          paused: true,
          paused_reason: expr("{{ $('Assess response').item.json.pause_reason }}"),
          updated_at: expr('{{ $now.toISO() }}'),
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

const stopPaused = node({
  type: 'n8n-nodes-base.stopAndError',
  version: 1,
  config: {
    name: 'Stop: paused',
    parameters: { errorType: 'errorMessage', errorMessage: expr('{{ $("Assess response").item.json.message }}') },
  },
  output: [{}],
});

const stopFailed = node({
  type: 'n8n-nodes-base.stopAndError',
  version: 1,
  config: {
    name: 'Stop: failed',
    parameters: { errorType: 'errorMessage', errorMessage: expr("{{ $('Assess response').item.json.message }}") },
  },
  output: [{}],
});

export default workflow('ppai-claude', 'PPAI · claude')
  .add(claudeRequest)
  .to(buildRequest)
  .to(callClaude)
  .to(assessResponse)
  .to(recordCost)
  .to(
    routeOutcome
      .onCase(0, returnResult)
      .onCase(1, waitBeforeRetry.to(callClaude))
      .onCase(2, pausePipeline.to(stopPaused))
      .onCase(3, stopFailed),
  );
