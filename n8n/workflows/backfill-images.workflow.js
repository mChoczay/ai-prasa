import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// One-off: give existing profile cards a Wikimedia Commons image with its credit. No Claude calls.
// Run it by hand; it only touches profiles whose image_url is empty.

const runManually = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: {
    name: 'Run manually',
    parameters: { rule: { interval: [{ field: 'months', monthsInterval: 12, triggerAtDayOfMonth: 1, triggerAtHour: 3, triggerAtMinute: 0 }] } },
  },
  output: [{}],
});

const readProfiles = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read profiles',
    alwaysOutputData: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' }, returnAll: true },
  },
  output: [{ entity_id: 'aapl', type: 'company', name: 'Apple', ticker: 'AAPL', image_url: '' }],
});

const queries = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Backfill queries',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/profiles.js') +
        "const query = (r) => (r.type === 'company' ? `${r.name} company ${r.ticker || ''}` : r.type === 'model' ? `${r.name} AI model` : `${r.name} artificial intelligence`).replace(/\\s+/g, ' ').trim();\n" +
        "const todo = $input.all().map((i) => i.json).filter((r) => r.entity_id && r.name && (!r.image_url || !r.image_page));\n" +
        "if (!todo.length) return [{ json: { none: true } }];\n" +
        "return todo.map((r) => ({ json: { entity_id: r.entity_id, url: wikiSearchUrl(query(r)) } }));\n",
    },
  },
  output: [{ entity_id: 'aapl', url: 'https://en.wikipedia.org/w/api.php?...' }],
});

const NOT_NONE = {
  options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
  conditions: [{ leftValue: expr('{{ $json.none !== true && Object.keys($json).length > 0 }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
  combinator: 'and',
};
const anyQuery = ifElse({ version: 2.2, config: { name: 'Anything to fill?', parameters: { conditions: NOT_NONE } } });
const anyFile = ifElse({ version: 2.2, config: { name: 'Any Commons image?', parameters: { conditions: NOT_NONE } } });

const HTTP_OPTIONS = { timeout: 15000, batching: { batch: { batchSize: 1, batchInterval: 1500 } }, response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } } };
const UA = { parameters: [{ name: 'User-Agent', value: 'PorannaPrasaAI/1.0 (personal news digest; n8n)' }] };

const wikipedia = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Wikipedia search',
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    parameters: { method: 'GET', url: expr('{{ $json.url }}'), sendHeaders: true, headerParameters: UA, options: HTTP_OPTIONS },
  },
  output: [{ statusCode: 200, body: { query: { pages: {} } } }],
});

const files = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Commons files',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/profiles.js') +
        "const asked = $('Backfill queries').all().map((i) => i.json);\n" +
        "const out = [];\n" +
        "$input.all().forEach((it, i) => {\n" +
        "  const j = it.json || {};\n" +
        "  const wiki = Number(j.statusCode) === 200 ? parseWikiSearch(j.body) : null;\n" +
        "  if (!asked[i] || !wiki || !wiki.image) return;\n" +
        "  out.push({ json: { entity_id: asked[i].entity_id, image_url: wiki.image.thumb, credit_url: commonsCreditUrl(wiki.image.file) } });\n" +
        "});\n" +
        "return out.length ? out : [{ json: { none: true } }];\n",
    },
  },
  output: [{ entity_id: 'aapl', image_url: 'https://upload.wikimedia.org/wikipedia/commons/a.jpg', credit_url: 'https://commons.wikimedia.org/w/api.php?...' }],
});

const commonsCredit = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Commons credit',
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    parameters: { method: 'GET', url: expr('{{ $json.credit_url }}'), sendHeaders: true, headerParameters: UA, options: HTTP_OPTIONS },
  },
  output: [{ statusCode: 200, body: { query: { pages: {} } } }],
});

const rows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Image rows',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/profiles.js') +
        "const found = $('Commons files').all().map((i) => i.json);\n" +
        "return $input.all().map((it, i) => {\n" +
        "  const j = it.json || {};\n" +
        "  const credit = Number(j.statusCode) === 200 ? parseCommonsCredit(j.body) : null;\n" +
        "  return { json: { entity_id: found[i].entity_id, image_url: found[i].image_url, image_credit: credit ? credit.credit : 'Wikimedia Commons', image_page: credit ? credit.page : '' } };\n" +
        "});\n",
    },
  },
  output: [{ entity_id: 'aapl', image_url: 'https://upload.wikimedia.org/wikipedia/commons/a.jpg', image_credit: 'c', image_page: 'p' }],
});

const saveImages = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save images',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'entity_id', condition: 'eq', keyValue: expr('{{ $json.entity_id }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: { image_url: expr('{{ $json.image_url }}'), image_credit: expr('{{ $json.image_credit }}'), image_page: expr('{{ $json.image_page }}') },
        schema: [
          { id: 'image_url', displayName: 'image_url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'image_credit', displayName: 'image_credit', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'image_page', displayName: 'image_page', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1 }],
});

export default workflow('ppai-backfill-images', 'PPAI · uzupełnij obrazki')
  .add(runManually)
  .to(readProfiles)
  .to(queries)
  .to(anyQuery.onTrue(wikipedia.to(files).to(anyFile.onTrue(commonsCredit.to(rows).to(saveImages)))));
