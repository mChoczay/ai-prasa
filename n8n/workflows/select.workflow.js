import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage 1: Sonnet picks the lead, stories and rumors; their pages (and related coverage) are
// fetched and cleaned into article texts. Hands the payload to PPAI · write when relay is true.

const selectRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Select request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', relay: false, flags: { weekly: false, monthly: false }, numbers: {}, candidates: [], history_titles: [] }],
});

const buildPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build select prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/select.js') +
        "const p = $('Select request').first().json;\n" +
        "if (!Array.isArray(p.candidates) || !p.candidates.length) throw new Error('NO_NEWS: brak kandydatów na tematy (kanały RSS nic nie zwróciły)');\n" +
        "return [{ json: { user: selectPrompt(p.candidates, p.history_titles) } }];\n",
    },
  },
  output: [{ user: '...' }],
});

const CLAUDE_INPUTS = [
  { id: 'run_id', displayName: 'run_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'step', displayName: 'step', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'model', displayName: 'model', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'system', displayName: 'system', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'user', displayName: 'user', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'schema', displayName: 'schema', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: true },
  { id: 'effort', displayName: 'effort', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'max_tokens', displayName: 'max_tokens', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
];

const selectWithSonnet = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Select with Sonnet',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Select request').first().json.run_id }}"),
          step: 'select',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/select.md'),
          user: expr('{{ $json.user }}'),
          schema: JSONFILE('schemas/select.schema.json'),
          effort: 'low',
          max_tokens: 4000,
        },
        schema: CLAUDE_INPUTS,
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ ok: true, data: { lead_idx: 0, story_idx: [], rumor_idx: [], extra_queries: [] }, cost_usd: 0.01 }],
});

const fetchListNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Fetch list',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/select.js') +
        "const p = $('Select request').first().json;\n" +
        "const sel = applySelection(p.candidates, $('Select with Sonnet').first().json.data);\n" +
        "const list = fetchList(sel, p.candidates);\n" +
        "return list.map((f) => ({ json: f }));\n",
    },
  },
  output: [{ url: 'https://example.com/a', for_idx: 0, role: 'main' }],
});

const fetchArticles = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch articles',
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (compatible; PorannaPrasaAI/1.0; personal news digest)' },
          { name: 'Accept', value: 'text/html,application/xhtml+xml' },
        ],
      },
      options: {
        timeout: 15000,
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } },
      },
    },
  },
  output: [{ body: '<html>...</html>', statusCode: 200, headers: {} }],
});

const buildArticlesNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build articles',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/select.js') +
        "const p = $('Select request').first().json;\n" +
        "const selection = $('Select with Sonnet').first().json.data;\n" +
        "const sel = applySelection(p.candidates, selection);\n" +
        "const list = $('Fetch list').all().map((i) => i.json);\n" +
        "const fetched = $input.all().map((it, i) => {\n" +
        "  const j = it.json || {};\n" +
        "  const body = typeof j.body === 'string' ? j.body : typeof j.data === 'string' ? j.data : '';\n" +
        "  return { url: list[i] ? list[i].url : '', statusCode: j.statusCode, body };\n" +
        "});\n" +
        "const articles = buildArticles(sel, p.candidates, fetched);\n" +
        "return [{ json: { ...p, selection, articles, fetch_ok: articles.filter((a) => a.text_ok).length } }];\n",
    },
  },
  output: [{ date: '2026-11-19', run_id: 'r', relay: false, articles: [], fetch_ok: 0 }],
});

const relayCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Relay?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.relay }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const handToWrite = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to write',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'WRITE_WORKFLOW_ID', cachedResultName: 'PPAI · write' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const returnPayload = node({
  type: 'n8n-nodes-base.noOp',
  version: 1,
  config: { name: 'Return payload' },
  output: [{}],
});

export default workflow('ppai-select', 'PPAI · select')
  .add(selectRequest)
  .to(buildPrompt)
  .to(selectWithSonnet)
  .to(fetchListNode)
  .to(fetchArticles)
  .to(buildArticlesNode)
  .to(relayCheck.onTrue(handToWrite).onFalse(returnPayload));
