import { workflow, node, trigger, switchCase, expr } from '@n8n/workflow-sdk';

// Relay stage 3: Sonnet writes the greeting, lead, market and rankings commentary, "Dlaczego?" and the
// closing; then the edition is assembled, checked (sources, statuses, disclaimers, quiet day) and given
// its workflow-owned fields. Next: PPAI · period on Sundays / the 1st, otherwise PPAI · profiles.

const frontRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Front request', parameters: { inputSource: 'passthrough' } },
  output: [{ date: '2026-11-19', run_id: '2026-11-19-1', relay: false, flags: { weekly: false, monthly: false }, articles: [], numbers: {}, candidates: [], history_titles: [], stories_part: { stories: [], rumors: [] }, entities: [], leakers: [] }],
});

const buildPrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build front prompt',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/write.js') +
        'const FULL = ' + JSONTEXT('schemas/edition.schema.json') + ';\n' +
        "const p = $('Front request').first().json;\n" +
        "const user = frontPrompt({ date: p.date, articles: p.articles, written: p.stories_part, numbers: p.numbers, candidates: p.candidates, leakers: p.leakers, entities: p.entities, historyTitles: p.history_titles });\n" +
        "return [{ json: { user, schema: pickSchema(FULL, ['greeting', 'lead_story', 'market', 'rankings', 'big_moves', 'follow_ups', 'closing']) } }];\n",
    },
  },
  output: [{ user: '...', schema: { type: 'object' } }],
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

const writeFront = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Write front with Sonnet',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'xngSOQVAGpMZrfDS', cachedResultName: 'PPAI · claude' },
      mode: 'once',
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr("{{ $('Front request').first().json.run_id }}"),
          step: 'write front',
          model: 'claude-sonnet-5-5',
          system: TEXT('prompts/write.md'),
          user: expr('{{ $json.user }}'),
          schema: expr('{{ $json.schema }}'),
          effort: 'medium',
          max_tokens: 12000,
        },
        schema: CLAUDE_INPUTS,
      },
      options: { waitForSubWorkflow: true },
    },
  },
  output: [{ ok: true, data: { greeting: '', lead_story: null, market: { commentary: '' }, rankings: { commentary: '' }, big_moves: [], follow_ups: [], closing: '' }, cost_usd: 0.1 }],
});

const assemble = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Assemble edition',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/news.js', 'n8n/lib/dates.js', 'n8n/lib/edition.js', 'n8n/lib/write.js') +
        "const p = $('Front request').first().json;\n" +
        "const front = $input.first().json.data || {};\n" +
        "const n = p.numbers || {};\n" +
        "const knownUrls = [];\n" +
        "for (const a of p.articles || []) { knownUrls.push(a.url); for (const r of a.related || []) knownUrls.push(r.url); }\n" +
        "for (const c of p.candidates || []) knownUrls.push(c.url);\n" +
        "const raw = assembleEdition({ storiesPart: p.stories_part, frontPart: front, knownUrls });\n" +
        "const checked = checkEditionRules(raw, p.entities || []);\n" +
        "const allowedMoveIds = capBigMoves(n.big_moves, 6).map((m) => m.entity_id).concat((n.ranking_moves || []).map((m) => m.entity_id));\n" +
        "const edition = finalizeEdition(checked.edition, { date: p.date, generatedAt: new Date().toISOString(), numbers: n, allowedMoveIds });\n" +
        "const flags = p.flags || {};\n" +
        "const next = !p.relay ? 'stop' : flags.weekly || flags.monthly ? 'period' : 'profiles';\n" +
        "return [{ json: {\n" +
        "  date: p.date, run_id: p.run_id, relay: p.relay, stop_after: p.stop_after || '', flags, next, edition,\n" +
        "  rule_errors: checked.errors, new_entity_names: checked.newEntityNames,\n" +
        "  leaderboard_top: n.leaderboard_top || [], numbers: { market: n.market || null, rankings: n.rankings || null },\n" +
        "} }];\n",
    },
  },
  output: [{ date: '2026-11-19', run_id: 'r', relay: false, next: 'stop', edition: {}, rule_errors: [], new_entity_names: [] }],
});

const route = switchCase({
  version: 3.2,
  config: {
    name: 'Next stage',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Front request').first().json.stop_after === 'front' ? 'stop' : $json.next }}"), rightValue: 'period', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'period' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Front request').first().json.stop_after === 'front' ? 'stop' : $json.next }}"), rightValue: 'profiles', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'profiles' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: expr("{{ $('Front request').first().json.stop_after === 'front' ? 'stop' : $json.next }}"), rightValue: 'stop', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'stop' },
        ],
      },
      options: {},
    },
  },
});

const handToPeriod = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to period',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'PERIOD_WORKFLOW_ID', cachedResultName: 'PPAI · period' },
      mode: 'once',
      options: { waitForSubWorkflow: false },
    },
  },
  output: [{}],
});

const handToProfiles = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: {
    name: 'Hand to profiles',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'PROFILES_WORKFLOW_ID', cachedResultName: 'PPAI · profiles' },
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

export default workflow('ppai-front', 'PPAI · front')
  .add(frontRequest)
  .to(buildPrompt)
  .to(writeFront)
  .to(assemble)
  .to(route.onCase(0, handToPeriod).onCase(1, handToProfiles).onCase(2, returnPayload));
