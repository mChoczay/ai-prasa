import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const newsRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: {
    name: 'News request',
    parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [{ name: 'date', type: 'string' }, { name: 'run_id', type: 'string' }] } },
  },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1' }],
});

const readSources = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read news sources',
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'szI5pmboyvUhEj78', cachedResultName: 'news_sources' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'active', condition: 'isTrue' }] },
      returnAll: true,
    },
  },
  output: [{ url: 'https://openai.com/news/rss.xml', kind: 'rss', label: 'OpenAI News', active: true }],
});

const readFeeds = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: 'Read feeds',
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    parameters: { url: expr('{{ $json.url }}'), options: {} },
  },
  output: [{ title: 'OpenAI ships a model', link: 'https://openai.com/news/x', isoDate: '2026-11-19T03:00:00.000Z', contentSnippet: 'Today we release...' }],
});

const recentTopics = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Recent topics',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'FkEQeOlZyvmwYNXB', cachedResultName: 'topics_history' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(7, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-18', title: 'Earlier story', summary: '...', category: 'modele' }],
});

const buildCandidates = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build candidates',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/candidates.js') +
        "const date = $('News request').first().json.date;\n" +
        "const items = $('Read feeds').all().map((i) => i.json);\n" +
        "const history = $('Recent topics').all().map((i) => i.json).filter((r) => r.title);\n" +
        "const now = new Date();\n" +
        "const candidates = buildCandidateList(items, { now, maxAgeHours: 30, max: 150 });\n" +
        "const user = filterPrompt(candidates, history);\n" +
        "return [{ json: { date, candidates, user, history_titles: history.map((h) => h.title) } }];\n",
    },
  },
  output: [{ date: '2026-11-19', candidates: [], user: '...', history_titles: [] }],
});

const filterWithHaiku = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Filter with Haiku',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('News request').first().json.run_id }}"),
          step: 'news filter',
          model: 'claude-haiku-5-5',
          system: TEXT('prompts/filter.md'),
          user: expr('{{ $json.user }}'),
          schema: JSONFILE('schemas/filter.schema.json'),
          effort: 'low',
          max_tokens: 12000,
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
  output: [{ ok: true, data: { items: [{ idx: 0, category: 'modele', importance: 5, keep: true }] }, cost_usd: 0.001 }],
});

const keepTop = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Keep top candidates',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/candidates.js') +
        "const base = $('Build candidates').first().json;\n" +
        "const triage = $input.first().json.data;\n" +
        "const top = applyTriage(base.candidates, triage, { max: 15 });\n" +
        "return [{ json: { date: base.date, candidates: top, history_titles: base.history_titles } }];\n",
    },
  },
  output: [{ date: '2026-11-19', candidates: [], history_titles: [] }],
});

export default workflow('ppai-news', 'PPAI · news')
  .add(newsRequest)
  .to(readSources)
  .to(readFeeds)
  .to(recentTopics)
  .to(buildCandidates)
  .to(filterWithHaiku)
  .to(keepTop);
