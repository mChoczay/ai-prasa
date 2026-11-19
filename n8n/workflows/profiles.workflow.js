import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage 4: up to 10 new or stale profile cards a day (Wikipedia search + Haiku), then the edition
// gets its "Może dotyczyć" ids and the "Poznaj" spotlight, and goes on to PPAI · publish.
// Every branch ends in "Read all profiles", so a day with nothing to profile still publishes.

const profilesRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Profiles request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', relay: false, edition: {}, new_entity_names: [], leaderboard_top: [], numbers: { market: null, rankings: null } }],
});

const readProfiles = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read profiles',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' }, returnAll: true },
  },
  output: [{ entity_id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'NVDA', updated_at: '2026-11-19' }],
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

const plan = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Plan profiles',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/profiles.js') +
        "const p = $('Profiles request').first().json;\n" +
        "const profiles = $('Read profiles').all().map((i) => i.json).filter((r) => r.entity_id);\n" +
        "const watchlist = $('Read watchlist').all().map((i) => i.json).filter((r) => r.ticker);\n" +
        "const targets = profileTargets({ edition: p.edition, newEntityNames: p.new_entity_names, watchlist, leaderboardTop: p.leaderboard_top, profiles, rankings: p.numbers && p.numbers.rankings, today: p.date });\n" +
        "if (!targets.length) return [{ json: { none: true } }];\n" +
        "return targets.map((t) => ({ json: { ...t, url: wikiSearchUrl(t.query) } }));\n",
    },
  },
  output: [{ id: 'nvda', name: 'NVIDIA', type: 'company', reason: 'new', ticker: 'NVDA', query: 'NVIDIA company NVDA', boards: [], mentions: [], url: 'https://en.wikipedia.org/w/api.php?...' }],
});

// The three checks below pass real items and stop the { none: true } / empty placeholder items.
const NOT_NONE = {
  options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
  conditions: [{ leftValue: expr('{{ $json.none !== true && Object.keys($json).length > 0 }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
  combinator: 'and',
};
const anyTarget = ifElse({ version: 2.2, config: { name: 'Anything to profile?', parameters: { conditions: NOT_NONE } } });
const anyPrompt = ifElse({ version: 2.2, config: { name: 'Any reference text?', parameters: { conditions: NOT_NONE } } });
const anyRow = ifElse({ version: 2.2, config: { name: 'Any card written?', parameters: { conditions: NOT_NONE } } });

const wikipedia = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Wikipedia search',
    onError: 'continueRegularOutput',
    alwaysOutputData: true,
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'PorannaPrasaAI/1.0 (personal news digest; n8n)' }] },
      options: { timeout: 15000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } } },
    },
  },
  output: [{ statusCode: 200, body: { query: { pages: {} } } }],
});

const prompts = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Profile prompts',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/profiles.js') +
        "const targets = $('Plan profiles').all().map((i) => i.json);\n" +
        "const out = [];\n" +
        "$input.all().forEach((it, i) => {\n" +
        "  const t = targets[i];\n" +
        "  if (!t) return;\n" +
        "  const j = it.json || {};\n" +
        "  const wiki = Number(j.statusCode) === 200 ? parseWikiSearch(j.body) : null;\n" +
        "  if (!hasReference(t, wiki)) return;\n" +
        "  out.push({ json: { target: t, wiki, user: profilePrompt(t, wiki) } });\n" +
        "});\n" +
        "return out.length ? out : [{ json: { none: true } }];\n",
    },
  },
  output: [{ target: { id: 'nvda' }, wiki: null, user: '...' }],
});

const haiku = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Profile with Haiku',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'each',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Profiles request').first().json.run_id }}"),
          step: 'profile',
          model: 'claude-haiku-5-5',
          system: TEXT('prompts/profile.md'),
          user: expr('{{ $json.user }}'),
          schema: JSONFILE('schemas/profile.schema.json'),
          effort: 'low',
          max_tokens: 1500,
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
  output: [{ ok: true, data: { type: 'company', name: 'NVIDIA', owner: '', summary: '', key_products: [], why_it_matters: '', aliases: [] }, cost_usd: 0.0002 }],
});

const rows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Profile rows',
    alwaysOutputData: true,
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/profiles.js') +
        "const stop = pauseErrorOf($input.all().map((i) => i.json));\n" +
        "if (stop) throw new Error(stop);\n" +
        "const date = $('Profiles request').first().json.date;\n" +
        "const asked = $('Profile prompts').all().map((i) => i.json);\n" +
        "const out = [];\n" +
        "$input.all().forEach((it, i) => {\n" +
        "  const r = it.json || {};\n" +
        "  const a = asked[i];\n" +
        "  if (!a || !r.ok || !r.data || !r.data.summary) return;\n" +
        "  out.push({ json: profileRow(a.target, r.data, a.wiki, date) });\n" +
        "});\n" +
        "return out;\n",
    },
  },
  output: [{ entity_id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'NVDA', ticker: 'NVDA', summary: '', owner: '', key_products: '', why_it_matters: '', updated_at: '2026-11-19', source_urls: '' }],
});

const PROFILE_COLUMNS = [
  { id: 'entity_id', displayName: 'entity_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'type', displayName: 'type', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'name', displayName: 'name', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'aliases', displayName: 'aliases', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'ticker', displayName: 'ticker', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'summary', displayName: 'summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'owner', displayName: 'owner', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'key_products', displayName: 'key_products', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'why_it_matters', displayName: 'why_it_matters', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'updated_at', displayName: 'updated_at', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'source_urls', displayName: 'source_urls', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
];

const saveProfiles = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save profiles',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'entity_id', condition: 'eq', keyValue: expr('{{ $json.entity_id }}') }] },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: PROFILE_COLUMNS,
      },
    },
  },
  output: [{ id: 1 }],
});

const readAll = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read all profiles',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' }, returnAll: true },
  },
  output: [{ entity_id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'NVDA' }],
});

const finish = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Finish edition',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/profiles.js') +
        "const p = $('Profiles request').first().json;\n" +
        "const all = $('Read all profiles').all().map((i) => i.json).filter((r) => r.entity_id);\n" +
        "const done = finishEdition(p.edition, all, p.date);\n" +
        "return [{ json: { date: p.date, run_id: p.run_id, relay: p.relay, stop_after: p.stop_after || '', edition: done.edition, profiles_json: done.profiles, history: historyRows(done.edition), spotlight_ids: done.spotlightIds } }];\n",
    },
  },
  output: [{ date: '2026-11-19', run_id: 'r', relay: false, edition: {}, profiles_json: { profiles: [] }, history: { topics: [], tags: [] }, spotlight_ids: [] }],
});

const relayCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Relay?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr("{{ $json.relay && $json.stop_after !== 'profiles' }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const handToPublish = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to publish',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'CcAkdIqGWlJrqHGQ', cachedResultName: 'PPAI · publish' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const returnPayload = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Return payload' }, output: [{}] });

const spotlightItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Spotlight items',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const f = $('Finish edition').first().json;\nreturn (f.spotlight_ids || []).map((id) => ({ json: { entity_id: id, date: f.date } }));\n",
    },
  },
  output: [{ entity_id: 'nvda', date: '2026-11-19' }],
});

const markSpotlight = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Mark spotlight',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: { __rl: true, mode: 'id', value: 'wcapeOXWEzCIt8OK', cachedResultName: 'entity_profiles' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'entity_id', condition: 'eq', keyValue: expr('{{ $json.entity_id }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: { last_spotlight_at: expr('{{ $json.date }}') },
        schema: [{ id: 'last_spotlight_at', displayName: 'last_spotlight_at', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }],
      },
    },
  },
  output: [{ id: 1 }],
});

export default workflow('ppai-profiles', 'PPAI · profiles')
  .add(profilesRequest)
  .to(readProfiles)
  .to(readWatchlist)
  .to(plan)
  .to(
    anyTarget
      .onTrue(
        wikipedia.to(prompts).to(
          anyPrompt
            .onTrue(haiku.to(rows).to(anyRow.onTrue(saveProfiles.to(readAll)).onFalse(readAll)))
            .onFalse(readAll),
        ),
      )
      .onFalse(readAll),
  )
  .add(readAll)
  .to(finish)
  .to(relayCheck.onTrue(handToPublish).onFalse(returnPayload))
  .add(finish)
  .to(spotlightItems)
  .to(markSpotlight);
