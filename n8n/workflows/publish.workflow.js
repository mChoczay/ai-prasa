import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// Relay stage 5 (last): one commit to the site repo with the edition, index.json and profiles.json
// (Git Data API, so the Pages deploy runs once), then the morning mail and the day's history rows
// (topics_history and impact_tags are replaced by date, so a re-run does not double them).
// A payload with remove_date deletes that test edition instead (no mail, no history).

const REPO = 'https://api.github.com/repos/mChoczay/ai-prasa';
const GH_HEADERS = {
  parameters: [
    { name: 'Accept', value: 'application/vnd.github+json' },
    { name: 'X-GitHub-Api-Version', value: '2022-11-28' },
  ],
};
const GH_CREDENTIALS = { githubApi: { id: 'orIAROLkwk0dVSdS', name: 'GitHub account' } };

const publishRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Publish request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', edition: {}, profiles_json: { profiles: [] }, history: { topics: [], tags: [] }, remove_date: '', no_mail: false }],
});

const readSettings = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read settings',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      returnAll: false,
      limit: 1,
    },
  },
  output: [{ id: 1, notify_email: 'owner@example.com', site_url: 'https://example.github.io/site/' }],
});

const mainRef = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: main ref',
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
  output: [{ ref: 'refs/heads/main', object: { sha: 'abc', type: 'commit' } }],
});

const baseCommit = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: base commit',
    parameters: {
      method: 'GET',
      url: expr(REPO + '/git/commits/{{ $json.object.sha }}'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      options: { timeout: 20000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ sha: 'abc', tree: { sha: 'def' } }],
});

const currentIndex = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: current index',
    parameters: {
      method: 'GET',
      url: REPO + '/contents/site/data/index.json?ref=main',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Accept', value: 'application/vnd.github.raw+json' },
          { name: 'X-GitHub-Api-Version', value: '2022-11-28' },
        ],
      },
      options: { timeout: 20000, response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } } },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ statusCode: 200, data: '{"editions":[]}' }],
});

const buildTree = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build tree',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/publish.js') +
        "const p = $('Publish request').first().json;\n" +
        "const idx = $('GitHub: current index').first().json;\n" +
        "const indexRaw = Number(idx.statusCode) === 200 ? idx.data : null;\n" +
        "const built = publishTree({ edition: p.edition, indexRaw, profilesJson: p.profiles_json, removeDate: p.remove_date || '' });\n" +
        "return [{ json: { head: $('GitHub: main ref').first().json.object.sha, base_tree: $('GitHub: base commit').first().json.tree.sha, tree: built.tree, message: built.message } }];\n",
    },
  },
  output: [{ head: 'abc', base_tree: 'def', tree: [], message: 'Publish the edition for 2026-11-19.' }],
});

const newTree = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: new tree',
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
    parameters: {
      method: 'POST',
      url: REPO + '/git/commits',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'githubApi',
      sendHeaders: true,
      headerParameters: GH_HEADERS,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ message: $('Build tree').first().json.message, tree: $json.sha, parents: [$('Build tree').first().json.head] }) }}"),
      options: { timeout: 30000 },
    },
    credentials: GH_CREDENTIALS,
  },
  output: [{ sha: 'commit1', html_url: 'https://github.com/x/y/commit/commit1' }],
});

const moveMain = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'GitHub: move main',
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
  output: [{ ref: 'refs/heads/main', object: { sha: 'commit1' } }],
});

const sendMailCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Send mail?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr("{{ !$('Publish request').first().json.no_mail && !$('Publish request').first().json.remove_date }}"), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

// Private webhook address and key for the "enable ratings" link (one row, kept only in n8n).
const readFeedbackSettings = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read feedback settings',
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'FwyBhGcpzlM0z4FO', cachedResultName: 'feedback_settings' },
      returnAll: false,
      limit: 1,
    },
  },
  output: [{ id: 1, url: 'https://n8n.example/webhook/x', key: 'k' }],
});

// Visitors for the morning mail (GoatCounter): only on Mondays (past week) and the 1st (past month).
const visitRangesNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Visit ranges',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/visits.js') +
        "const p = $('Publish request').first().json;\n" +
        "const ranges = visitRanges(p.edition && p.edition.date);\n" +
        "return ranges.length ? ranges.map((r) => ({ json: r })) : [{ json: { none: true } }];\n",
    },
  },
  output: [{ none: true }],
});

const visitStatsCheck = ifElse({
  version: 2.2,
  config: {
    name: 'Visit stats today?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ !$json.none }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
});

// Read-only GoatCounter API key in an n8n Custom Auth credential ({headers: {Authorization: 'Bearer …'}}); never in this repo.
const goatStats = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'GoatCounter stats',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 10000 },
    },
    credentials: { httpCustomAuth: { id: 'QYvsrmr12EumLOFG', name: 'GoatCunter' } },
  },
  output: [{ statusCode: 200, body: { total: 0, stats: [] } }],
});

const buildMail = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build morning mail',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/email.js', 'n8n/lib/visits.js') +
        "const p = $('Publish request').first().json;\n" +
        "const s = $('Read settings').first().json;\n" +
        "let fb = {};\n" +
        "try { fb = $('Read feedback settings').first().json || {}; } catch (e) { fb = {}; }\n" +
        "let visits = null;\n" +
        "try {\n" +
        "  const ranges = $('Visit ranges').all().map((i) => i.json).filter((r) => r && r.url);\n" +
        "  let bodies = [];\n" +
        "  try { bodies = $('GoatCounter stats').all().map((i) => (i.json && Number(i.json.statusCode) === 200 ? i.json.body : null)); } catch (e) { bodies = []; }\n" +
        "  visits = visitSummary(ranges, bodies);\n" +
        "} catch (e) { visits = null; }\n" +
        "const mail = renderEmailHtml(p.edition, s.site_url, { feedbackUrl: typeof fb.url === 'string' ? fb.url : '', feedbackKey: typeof fb.key === 'string' ? fb.key : '', visits });\n" +
        "return [{ json: { to: s.notify_email, subject: mail.subject, html: mail.html } }];\n",
    },
  },
  output: [{ to: 'owner@example.com', subject: 'Poranna prasa AI: ...', html: '<p>...</p>' }],
});

const sendMail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send morning mail',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $json.to }}'),
      subject: expr('{{ $json.subject }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false, senderName: 'Poranna prasa AI' },
    },
    credentials: { gmailOAuth2: { id: 'fty5idxwhe9Od6Fu', name: 'Gmail account' } },
  },
  output: [{ id: 'm1', threadId: 't1', labelIds: ['SENT'] }],
});

const clearTopics = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: "Clear the day's topics",
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: 'FkEQeOlZyvmwYNXB', cachedResultName: 'topics_history' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'date', condition: 'eq', keyValue: expr("{{ $('Publish request').first().json.remove_date || $('Publish request').first().json.date }}") }] },
    },
  },
  output: [{}],
});

const topicRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Topic rows',
    parameters: { mode: 'runOnceForAllItems', jsCode: "const h = $('Publish request').first().json.history || {};\nreturn (h.topics || []).map((t) => ({ json: t }));\n" },
  },
  output: [{ date: '2026-11-19', title: 't', summary: 's', category: 'modele', status: 'potwierdzone', source_urls: '' }],
});

const saveTopics = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save topics',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: 'FkEQeOlZyvmwYNXB', cachedResultName: 'topics_history' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'title', displayName: 'title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'summary', displayName: 'summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'category', displayName: 'category', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'status', displayName: 'status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'source_urls', displayName: 'source_urls', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
        ],
      },
      options: { optimizeBulk: true },
    },
  },
  output: [{}],
});

const clearTags = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: "Clear the day's impact tags",
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: '4IfcvfENP0VE7sak', cachedResultName: 'impact_tags' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'date', condition: 'eq', keyValue: expr("{{ $('Publish request').first().json.remove_date || $('Publish request').first().json.date }}") }] },
    },
  },
  output: [{}],
});

const tagRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Tag rows',
    parameters: { mode: 'runOnceForAllItems', jsCode: "const h = $('Publish request').first().json.history || {};\nreturn (h.tags || []).map((t) => ({ json: t }));\n" },
  },
  output: [{ date: '2026-11-19', story_title: 't', entity_id: 'nvda' }],
});

const saveTags = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save impact tags',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: '4IfcvfENP0VE7sak', cachedResultName: 'impact_tags' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'story_title', displayName: 'story_title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'entity_id', displayName: 'entity_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
        ],
      },
      options: { optimizeBulk: true },
    },
  },
  output: [{}],
});

export default workflow('ppai-publish', 'PPAI · publish')
  .add(publishRequest)
  .to(readSettings)
  .to(mainRef)
  .to(baseCommit)
  .to(currentIndex)
  .to(buildTree)
  .to(newTree)
  .to(newCommit)
  .to(moveMain)
  .to(sendMailCheck.onTrue(readFeedbackSettings.to(visitRangesNode).to(visitStatsCheck.onTrue(goatStats.to(buildMail)).onFalse(buildMail))))
  .add(buildMail)
  .to(sendMail)
  .add(moveMain)
  .to(clearTopics)
  .to(topicRows)
  .to(saveTopics)
  .add(moveMain)
  .to(clearTags)
  .to(tagRows)
  .to(saveTags);
