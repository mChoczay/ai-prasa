import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage 2: Sonnet writes the stories and the rumors column from the fetched articles. The lead,
// greeting and the numbers rubrics follow in PPAI · front (one long call would not fit in 180 s).

const writeRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Write request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', relay: false, articles: [], numbers: {}, candidates: [], history_titles: [] }],
});

const readProfiles = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read profiles',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' },
      returnAll: true,
    },
  },
  output: [{ entity_id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'Nvidia,NVDA' }],
});

const readWatchlist = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read watchlist',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'mvnQDdPGP2lzvwrR', cachedResultName: 'market_watchlist' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'active', condition: 'isTrue' }] },
      returnAll: true,
    },
  },
  output: [{ ticker: 'NVDA', name: 'NVIDIA', active: true }],
});

const readLeakers = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read leakers',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: '4SD76QXfOwi42qh7', cachedResultName: 'trusted_leakers' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'active', condition: 'isTrue' }] },
      returnAll: true,
    },
  },
  output: [{ name: 'Leaker', platform: 'X', note: '', active: true }],
});

const buildPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build stories prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/write.js') +
        'const FULL = ' + JSONTEXT('schemas/edition.schema.json') + ';\n' +
        "const p = $('Write request').first().json;\n" +
        "const profiles = $('Read profiles').all().map((i) => i.json).filter((r) => r.entity_id);\n" +
        "const watchlist = $('Read watchlist').all().map((i) => i.json).filter((r) => r.ticker);\n" +
        "const leakers = $('Read leakers').all().map((i) => i.json).filter((r) => r.name).map((r) => ({ name: r.name, platform: r.platform, note: r.note }));\n" +
        "const entities = entityList(profiles, watchlist);\n" +
        "const user = storiesPrompt({ date: p.date, articles: p.articles, leakers, entities, historyTitles: p.history_titles });\n" +
        "return [{ json: { user, schema: pickSchema(FULL, ['stories', 'rumors']), entities, leakers } }];\n",
    },
  },
  output: [{ user: '...', schema: { type: 'object' }, entities: [], leakers: [] }],
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

const writeWithSonnet = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Write stories with Sonnet',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Write request').first().json.run_id }}"),
          step: 'write stories',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/write.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'medium',
          max_tokens: 16000,
        },
        schema: CLAUDE_INPUTS,
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ ok: true, data: { stories: [], rumors: [] }, cost_usd: 0.1 }],
});

const keepStories = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Keep stories',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        "const p = $('Write request').first().json;\n" +
        "const built = $('Build stories prompt').first().json;\n" +
        "const part = $input.first().json.data || { stories: [], rumors: [] };\n" +
        "return [{ json: { ...p, stories_part: part, entities: built.entities, leakers: built.leakers } }];\n",
    },
  },
  output: [{ date: '2026-11-19', run_id: 'r', relay: false, stories_part: { stories: [], rumors: [] } }],
});

const relayCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Relay?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr("{{ $json.relay && $json.stop_after !== 'write' }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const handToFront = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to front',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'dBUk7jyGTj15o5V8', cachedResultName: 'PPAI · front' },
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

export default workflow('ppai-write', 'PPAI · write')
  .add(writeRequest)
  .to(readProfiles)
  .to(readWatchlist)
  .to(readLeakers)
  .to(buildPrompt)
  .to(writeWithSonnet)
  .to(keepStories)
  .to(relayCheck.onTrue(handToFront).onFalse(returnPayload));
