import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Ratings and notes from the reader's devices (site → private webhook). No Claude calls.
// The site sends text/plain JSON (no CORS preflight) with the key from feedback_settings; rows are only appended.
// The path is not a secret (the instance host and the key are, and neither is in this repo).

const STR = (id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true });

const feedbackIn = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Feedback in',
    parameters: {
      httpMethod: 'POST',
      path: '003730eda2f67a6ade3c9945',
      responseMode: 'responseNode',
      options: { allowedOrigins: 'https://mchoczay.github.io', ignoreBots: true },
    },
  },
  output: [{ body: { k: 'k', date: '2026-11-19', n: 1, title: 'T', category: 'modele', rating: 'ok' } }],
});

const readSettings = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read feedback settings',
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'FEEDBACK_SETTINGS_TABLE_ID', cachedResultName: 'feedback_settings' },
      returnAll: false,
      limit: 1,
    },
  },
  output: [{ id: 1, url: 'https://n8n.example/webhook/x', key: 'k' }],
});

const checkFeedback = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check feedback',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/dates.js', 'n8n/lib/feedback.js') +
        "const incoming = $('Feedback in').first().json || {};\n" +
        "let key = '';\n" +
        "try { const s = $('Read feedback settings').first().json || {}; key = typeof s.key === 'string' ? s.key : ''; } catch (e) { key = ''; }\n" +
        "const body = incoming.body === undefined ? null : incoming.body;\n" +
        "return [{ json: validateFeedback(body, key) }];\n",
    },
  },
  output: [{ ok: true, row: { date: '2026-11-19', n: 1, title: 'T', category: 'modele', rating: 'ok', note: '' } }],
});

const savedCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Saved?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.ok === true }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const saveFeedback = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save feedback',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: 'READER_FEEDBACK_TABLE_ID', cachedResultName: 'reader_feedback' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          date: expr('{{ $json.row.date }}'),
          n: expr('{{ $json.row.n }}'),
          title: expr('{{ $json.row.title }}'),
          category: expr('{{ $json.row.category }}'),
          rating: expr('{{ $json.row.rating }}'),
          note: expr('{{ $json.row.note }}'),
          handled: '',
        },
        schema: [STR('date'), { ...STR('n'), type: 'number' }, STR('title'), STR('category'), STR('rating'), STR('note'), STR('handled')],
      },
    },
  },
  output: [{ id: 1 }],
});

const respondSaved = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond saved',
    parameters: { respondWith: 'json', responseBody: '{"ok":true}', options: { responseCode: 200 } },
  },
});

const respondRejected = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond rejected',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json.status === 401 ? \'{"ok":false,"reason":"key"}\' : \'{"ok":false}\' }}'),
      options: { responseCode: expr('{{ $json.status }}') },
    },
  },
});

export default workflow('ppai-feedback', 'PPAI · oceny')
  .add(feedbackIn)
  .to(readSettings)
  .to(checkFeedback)
  .to(savedCheck.onTrue(saveFeedback.to(respondSaved)).onFalse(respondRejected));
