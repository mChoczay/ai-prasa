import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// PPAI · luki: the vulnerability log, apart from the edition relay. Every morning at 06:30 it reads the
// published editions of the last week it has not read yet (the 2 oldest that exist), has Haiku name their CVEs, looks up
// at most 10 CVEs in OSV and NVD (7 s apart), saves the rows, and commits site/data/luki.json and luki.md
// when they changed. "Run for a date" re-reads one edition by hand.

const T_LOG = 'Tk83d9EwYaf8i0Kn';
const T_RUNS = 'znsPiZP6QyiYnkGt';
const T_STATE = 'g73ONaCkopLd0kpN';
const SITE = 'https://mchoczay.github.io/ai-prasa/';
const REPO = 'https://api.github.com/repos/mChoczay/ai-prasa';
const GH_HEADERS = { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] };
const GH_RAW = { parameters: [{ name: 'Accept', value: 'application/vnd.github.raw+json' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] };
const GH_CREDENTIALS = { githubApi: { id: 'orIAROLkwk0dVSdS', name: 'GitHub account' } };
const UA = { parameters: [{ name: 'User-Agent', value: 'PorannaPrasaAI/1.0 (personal news digest; n8n)' }] };

const everyMorning = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: { name: 'Every morning', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 30 }] } } },
  output: [{}],
});

const runForDate = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Run for a date', parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [{ name: 'date', type: 'string' }] } } },
  output: [{ date: '2026-11-22' }],
});

const readState = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read state',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_STATE, cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      returnAll: true,
    },
  },
  output: [{}],
});

const readRuns = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read runs',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_RUNS, cachedResultName: 'vuln_runs' },
      matchType: 'allConditions',
      filters: { conditions: [] },
      returnAll: true,
    },
  },
  output: [{}],
});

const readLog = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read log',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_LOG, cachedResultName: 'vuln_log' },
      matchType: 'allConditions',
      filters: { conditions: [] },
      returnAll: true,
    },
  },
  output: [{}],
});

const planRun = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Plan run',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/vulns.js') +
        "let given = '';\n" +
        "try { given = String($('Run for a date').first().json.date || ''); } catch (e) { given = ''; }\n" +
        "const today = /^\\d{4}-\\d{2}-\\d{2}$/.test(given) ? given : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());\n" +
        "const state = $('Read state').first().json || {};\n" +
        "const done = $('Read runs').all().map((i) => i.json && i.json.date).filter(Boolean);\n" +
        "const dates = given === today ? [today] : editionDatesToRead(today, done, { max: 7 });\n" +
        "const base = { today, dates, paused: state.paused === true };\n" +
        "return (dates.length ? dates : [today]).map((d) => ({ json: { ...base, fetch: d } }));\n",
    },
  },
  output: [{ today: '2026-11-23', dates: ['2026-11-22'], paused: false, fetch: '2026-11-22' }],
});

const fetchEditions = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch editions',
    onError: 'continueRegularOutput',
    parameters: { method: 'GET', url: expr("{{ '" + SITE + "data/' + $json.fetch + '.json?t=' + $now.toMillis() }}"), options: { timeout: 15000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } } },
  },
  output: [{ statusCode: 200, data: '{}' }],
});

const vulnsPromptNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Vulns prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/vulns.js') +
        'const SCHEMA = ' + JSONTEXT('schemas/vulns.schema.json') + ';\n' +
        "const plan = $('Plan run').all().map((i) => i.json);\n" +
        "const fetched = $input.all().map((i) => i.json);\n" +
        "const editions = [];\n" +
        "plan.forEach((p, i) => {\n" +
        "  const f = fetched[i] || {};\n" +
        "  if (p.paused || !p.dates.includes(p.fetch) || Number(f.statusCode) !== 200) return;\n" +
        "  let e = null;\n" +
        "  try { e = typeof f.data === 'string' ? JSON.parse(f.data) : f.data; } catch (err) { e = null; }\n" +
        "  if (e && e.date === p.fetch) editions.push(e);\n" +
        "});\n" +
        "editions.splice(2);\n" +
        "const loaded = editions.map((e) => e.date);\n" +
        "return [{ json: { skip: editions.length === 0, loaded, editions, user: editions.length ? vulnsPrompt(editions) : '', schema: SCHEMA } }];\n",
    },
  },
  output: [{ skip: false, loaded: ['2026-11-22'], editions: [], user: '...', schema: { type: 'object' } }],
});

const needHaiku = ifElse({
  version: 2.2,
  config: {
    name: 'Anything to read?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.skip }}'), rightValue: false, operator: { type: 'boolean', operation: 'false', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const extract = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Extract with Haiku',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ 'vulns-' + $('Plan run').first().json.today }}"),
          step: 'vulns',
          model: 'claude-haiku-5-5',
          system: TEXT('prompts/vulns.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'low',
          max_tokens: 6000,
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
  output: [{ ok: true, data: { vulns: [] }, cost_usd: 0.002 }],
});

const mergeNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Merge findings',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/budget.js', 'n8n/lib/vulns.js') +
        "const results = $input.all().map((i) => i.json);\n" +
        "const stop = pauseErrorOf(results);\n" +
        "if (stop) throw new Error(stop);\n" +
        "const prompt = $('Vulns prompt').first().json;\n" +
        "const rows = $('Read log').all().map((i) => i.json).filter((r) => r && r.vuln_key);\n" +
        "const r = results[0] || {};\n" +
        "if (prompt.skip || !r.ok) return [{ json: { rows, changed: [], processed: [] } }];\n" +
        "const answer = r.data || { vulns: [] };\n" +
        "const merged = mergeFindings(rows, answer, prompt.editions, new Date().toISOString());\n" +
        "const list = Array.isArray(answer.vulns) ? answer.vulns : [];\n" +
        "const processed = prompt.loaded.map((date) => ({ date, found: list.filter((f) => f && String(f.story_ref || '').startsWith(date + '#')).length }));\n" +
        "return [{ json: { rows: merged.rows, changed: merged.changed, processed } }];\n",
    },
  },
  output: [{ rows: [], changed: [], processed: [] }],
});

const checkQueue = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check queue',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/vulns.js') +
        "const m = $('Merge findings').first().json;\n" +
        "// On a day Haiku ran, fewer lookups keep the run well inside 180 s.\n" +
        "let haiku = false;\n" +
        "try { haiku = $('Vulns prompt').first().json.skip === false; } catch (e) { haiku = false; }\n" +
        "const ids = checksToRun(m.rows, new Date().toISOString(), haiku ? 5 : 10);\n" +
        "return ids.length ? ids.map((cve_id) => ({ json: { cve_id } })) : [{ json: { none: true } }];\n",
    },
  },
  output: [{ cve_id: 'CVE-2026-125396' }],
});

const osv = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'OSV',
    onError: 'continueRegularOutput',
    parameters: { method: 'GET', url: expr("{{ 'https://api.osv.dev/v1/vulns/' + ($json.cve_id || 'none') }}"), sendHeaders: true, headerParameters: UA, options: { timeout: 15000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } } },
  },
  output: [{ statusCode: 200, data: '{}' }],
});

const nvd = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'NVD',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr("{{ 'https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=' + ($('Check queue').all()[$itemIndex].json.cve_id || 'none') }}"),
      sendHeaders: true,
      headerParameters: UA,
      options: { timeout: 10000, batching: { batch: { batchSize: 1, batchInterval: 7000 } }, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } },
    },
  },
  output: [{ statusCode: 200, data: '{}' }],
});

const applyNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Apply checks',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/vulns.js') +
        "const m = $('Merge findings').first().json;\n" +
        "const queue = $('Check queue').all().map((i) => i.json);\n" +
        "const osvOut = $('OSV').all().map((i) => i.json);\n" +
        "const nvdOut = $input.all().map((i) => i.json);\n" +
        "const body = (res) => { if (!res || Number(res.statusCode) !== 200) return null; try { return typeof res.data === 'string' ? JSON.parse(res.data) : res.data; } catch (e) { return null; } };\n" +
        "const results = queue.filter((q) => q.cve_id).map((q, i) => ({ cve_id: q.cve_id, osv: body(osvOut[i]), nvd: body(nvdOut[i]) }));\n" +
        "const checked = applyChecks(m.rows, results, new Date().toISOString());\n" +
        "const changed = new Map(m.changed.map((r) => [r.vuln_key, r]));\n" +
        "for (const r of checked.changed) changed.set(r.vuln_key, r);\n" +
        "return [{ json: { rows: checked.rows, changed: [...changed.values()], processed: m.processed } }];\n",
    },
  },
  output: [{ rows: [], changed: [], processed: [] }],
});

const changedRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Changed rows',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "return ($input.first().json.changed || []).map((r) => ({ json: r }));\n",
    },
  },
  output: [{ vuln_key: 'CVE-2026-125396' }],
});

const saveLog = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save log',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: T_LOG, cachedResultName: 'vuln_log' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'vuln_key', condition: 'eq', keyValue: expr('{{ $json.vuln_key }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          vuln_key: expr('{{ $json.vuln_key }}'),
          cve_id: expr('{{ $json.cve_id }}'),
          product: expr('{{ $json.product }}'),
          packages: expr('{{ $json.packages }}'),
          affected: expr('{{ $json.affected }}'),
          fixed_in: expr('{{ $json.fixed_in }}'),
          severity: expr('{{ $json.severity }}'),
          severity_source: expr('{{ $json.severity_source }}'),
          status: expr('{{ $json.status }}'),
          status_source: expr('{{ $json.status_source }}'),
          summary: expr('{{ $json.summary }}'),
          agent_text: expr('{{ $json.agent_text }}'),
          first_date: expr('{{ $json.first_date }}'),
          story_date: expr('{{ $json.story_date }}'),
          story_n: expr('{{ $json.story_n }}'),
          story_title: expr('{{ $json.story_title }}'),
          sources: expr('{{ $json.sources }}'),
          checked_at: expr('{{ $json.checked_at }}'),
          patched_at: expr('{{ $json.patched_at }}'),
        },
        schema: [
          { id: 'vuln_key', displayName: 'vuln_key', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'cve_id', displayName: 'cve_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'product', displayName: 'product', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'packages', displayName: 'packages', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'affected', displayName: 'affected', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'fixed_in', displayName: 'fixed_in', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'severity', displayName: 'severity', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'severity_source', displayName: 'severity_source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'status', displayName: 'status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'status_source', displayName: 'status_source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'summary', displayName: 'summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'agent_text', displayName: 'agent_text', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'first_date', displayName: 'first_date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'story_date', displayName: 'story_date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'story_n', displayName: 'story_n', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'story_title', displayName: 'story_title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'sources', displayName: 'sources', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'checked_at', displayName: 'checked_at', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'patched_at', displayName: 'patched_at', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1 }],
});

const processedRuns = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Processed runs',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const at = new Date().toISOString();\nreturn ($input.first().json.processed || []).map((p) => ({ json: { date: p.date, found: p.found, processed_at: at } }));\n",
    },
  },
  output: [{ date: '2026-11-22', found: 1, processed_at: '2026-11-23T05:30:00.000Z' }],
});

const saveRuns = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save runs',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: T_RUNS, cachedResultName: 'vuln_runs' },
      columns: {
        mappingMode: 'defineBelow',
        value: { date: expr('{{ $json.date }}'), processed_at: expr('{{ $json.processed_at }}'), found: expr('{{ $json.found }}') },
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'processed_at', displayName: 'processed_at', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'found', displayName: 'found', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
        ],
      },
    },
  },
  output: [{ id: 1 }],
});

const mainRef = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: main ref',
    executeOnce: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'GET',
      url: REPO + '/git/ref/heads/main',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      options: { timeout: 20000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ object: { sha: 'abc' } }],
});

const baseCommit = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: base commit',
    executeOnce: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'GET',
      url: expr("{{ '" + REPO + "/git/commits/' + $json.object.sha }}"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      options: { timeout: 20000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ tree: { sha: 'def' } }],
});

const currentJson = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: current luki.json',
    executeOnce: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'GET',
      url: REPO + '/contents/site/data/luki.json?ref=main',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_RAW,
      options: { timeout: 20000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ statusCode: 404, data: '' }],
});

const currentMd = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: current luki.md',
    executeOnce: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'GET',
      url: REPO + '/contents/site/data/luki.md?ref=main',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_RAW,
      options: { timeout: 20000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ statusCode: 404, data: '' }],
});

const buildFiles = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build files',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/vulns.js') +
        "const rows = $('Apply checks').first().json.rows;\n" +
        "const today = $('Plan run').first().json.today;\n" +
        "const now = new Date().toISOString();\n" +
        "const cur = (name) => { const r = $(name).first().json || {}; return Number(r.statusCode) === 200 ? String(r.data) : null; };\n" +
        "const json = vulnsJson(rows, now);\n" +
        "const md = agentMarkdown(rows, now);\n" +
        "const same = sameVulnFiles(cur('GitHub: current luki.json'), cur('GitHub: current luki.md'), json, md);\n" +
        "const t = vulnTree(json, md, today);\n" +
        "return [{ json: { same, tree: t.tree, message: t.message, head: $('GitHub: main ref').first().json.object.sha, base_tree: $('GitHub: base commit').first().json.tree.sha } }];\n",
    },
  },
  output: [{ same: false, tree: [], message: 'Update the vulnerability log for 2026-11-23.', head: 'abc', base_tree: 'def' }],
});

const anythingToCommit = ifElse({
  version: 2.2,
  config: {
    name: 'Anything to commit?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.same }}'), rightValue: false, operator: { type: 'boolean', operation: 'false', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

const newTree = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: new tree',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: REPO + '/git/trees',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ base_tree: $json.base_tree, tree: $json.tree }) }}'),
      options: { timeout: 30000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ sha: 'tree1' }],
});

const newCommit = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: new commit',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: REPO + '/git/commits',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ message: $('Build files').first().json.message, tree: $json.sha, parents: [$('Build files').first().json.head] }) }}"),
      options: { timeout: 30000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ sha: 'commit1' }],
});

const moveMain = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: move main',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'PATCH',
      url: REPO + '/git/refs/heads/main',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ sha: $json.sha, force: false }) }}'),
      options: { timeout: 30000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ ref: 'refs/heads/main' }],
});

const done = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Nothing to commit' }, output: [{}] });

export default workflow('ppai-vulns', 'PPAI · luki')
  .add(everyMorning)
  .to(readState)
  .add(runForDate)
  .to(readState)
  .to(readRuns)
  .to(readLog)
  .to(planRun)
  .to(fetchEditions)
  .to(vulnsPromptNode)
  .to(needHaiku.onTrue(extract.to(mergeNode)).onFalse(mergeNode))
  .add(mergeNode)
  .to(checkQueue)
  .to(osv)
  .to(nvd)
  .to(applyNode)
  .to(changedRows)
  .to(saveLog)
  .add(applyNode)
  .to(processedRuns)
  .to(saveRuns)
  .add(applyNode)
  .to(mainRef)
  .to(baseCommit)
  .to(currentJson)
  .to(currentMd)
  .to(buildFiles)
  .to(anythingToCommit.onTrue(newTree.to(newCommit).to(moveMain)).onFalse(done));
