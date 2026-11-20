import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const T_WATCHLIST = 'mvnQDdPGP2lzvwrR';
const T_MARKET = 'vgsxC2Az6D9WXUDC';
const T_BOARDS = '9PHj89xswPDRzjlo';
const T_MOVES = 'VNLgCQrBHwhYOm3e';
const T_TAGS = '4IfcvfENP0VE7sak';


const numbersRequest = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'Numbers request', parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [{ name: 'date', type: 'string' }] } } },
  output: [{ date: '2026-11-19' }],
});

const clearTodayMoves = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: "Clear today's move log",
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: T_MOVES, cachedResultName: 'move_log' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr('{{ $today.toISO() }}') }] },
    },
  },
  output: [{}],
});

const readWatchlist = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read watchlist',
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_WATCHLIST, cachedResultName: 'market_watchlist' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'active', condition: 'isTrue' }] },
      returnAll: true,
    },
  },
  output: [{ ticker: 'NVDA', name: 'NVIDIA', active: true }],
});

const usTickers = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: {
    name: 'US tickers',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ /^[A-Z]+$/.test($json.ticker) }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
  },
  output: [{ ticker: 'NVDA', name: 'NVIDIA', active: true }],
});

const marketDates = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Market reference days',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/dates.js') +
        "const refs = tradingRefDates($('Numbers request').first().json.date);\n" +
        "return [refs.d0, refs.d1, refs.d7, refs.d30].map((day) => ({ json: { day } }));\n",
    },
  },
  output: [{ day: '2026-11-18' }],
});

const massiveGrouped = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Massive grouped daily',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/{{ $json.day }}?adjusted=true'),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 60000, batching: { batch: { batchSize: 1, batchInterval: 13000 } } },
    },
    credentials: { httpCustomAuth: { id: 'VvwfgsE7mJkt65tI', name: 'Massive' } },
  },
  output: [{ statusCode: 200, body: { results: [{ T: 'NVDA', t: 1795035600000, c: 150.96 }] } }],
});

const watchlistCloses = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Watchlist closes',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        "const want = new Set($('US tickers').all().map((i) => i.json.ticker));\n" +
        "const days = $input.all().map((i) => i.json).filter((r) => Number(r.statusCode) === 200 && r.body && Array.isArray(r.body.results))\n" +
        "  .map((r) => ({ results: r.body.results.filter((b) => want.has(b.T)).map((b) => ({ T: b.T, t: b.t, c: b.c })) }));\n" +
        "return [{ json: { days } }];\n",
    },
  },
  output: [{ days: [{ results: [{ T: 'NVDA', t: 1795035600000, c: 150.96 }] }] }],
});

const lmarena = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'LMArena leaderboard',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&offset=0&length=100',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 60000 },
    },
  },
  output: [{ statusCode: 200, body: { rows: [] } }],
});

const hfTrending = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Hugging Face trending',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: { method: 'GET', url: 'https://huggingface.co/api/models?sort=trendingScore&limit=20', options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 60000 } },
  },
  output: [{ statusCode: 200, body: [] }],
});

// Ranking areas (display only): one LMArena area leaderboard per request, see n8n/lib/areas.js.
const areaList = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Area requests',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: INLINE('n8n/lib/areas.js') + 'return areaRequests().map((r) => ({ json: r }));\n',
    },
  },
  output: [{ key: 'webdev', url: 'https://datasets-server.huggingface.co/filter' }],
});

const areaBoards = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'LMArena areas',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 10000, batching: { batch: { batchSize: 6, batchInterval: 0 } } },
    },
  },
  output: [{ statusCode: 200, body: { rows: [] } }],
});

const aaPageList = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'AA page list',
    parameters: { mode: 'runOnceForAllItems', jsCode: 'return [1, 2, 3, 4].map((page) => ({ json: { page } }));\n' },
  },
  output: [{ page: 1 }],
});

const aaModels = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Artificial Analysis models',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('https://artificialanalysis.ai/api/v2/language/models/free?page={{ $json.page }}'),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 60000, batching: { batch: { batchSize: 1, batchInterval: 1000 } } },
    },
    credentials: { httpCustomAuth: { id: '5ytMLVR0maiJLpxd', name: 'Artificial Analysis' } },
  },
  output: [{ statusCode: 200, body: { data: [] } }],
});

const recentBoards = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Recent leaderboard snapshots',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_BOARDS, cachedResultName: 'leaderboard_snapshots' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(8, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-18', board: 'lmarena', rank: 1, model: 'Model A', org: 'a', score: 1500 }],
});

const recentMoves = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Recent move log',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_MOVES, cachedResultName: 'move_log' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(8, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-17', entity_id: 'nvda', kind: 'd1' }],
});

const recentTags = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Recent impact tags',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: T_TAGS, cachedResultName: 'impact_tags' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'createdAt', condition: 'gte', keyValue: expr("{{ $today.minus(6, 'days').toISO() }}") }] },
      returnAll: true,
    },
  },
  output: [{ date: '2026-11-16', story_title: 'News', entity_id: 'nvda' }],
});

const computeNumbers = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Compute numbers',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/dates.js', 'n8n/lib/news.js', 'n8n/lib/parsers.js', 'n8n/lib/moves.js', 'n8n/lib/areas.js') +
        "const date = $('Numbers request').first().json.date;\n" +
        "const ok = (item) => item && item.json && Number(item.json.statusCode) === 200 ? item.json.body : null;\n" +
        "const tickers = $('US tickers').all().map((i) => i.json);\n" +
        "const refs = tradingRefDates(date);\n" +
        "const series = parseMassiveGrouped($('Watchlist closes').first().json.days) || {};\n" +
        "const marketRows = [];\n" +
        "tickers.forEach((t) => {\n" +
        "  const s = series[t.ticker];\n" +
        "  const ch = s ? computeChanges(s, date) : null;\n" +
        "  if (!ch) return;\n" +
        "  const prev = s.filter((r) => r.date < ch.last_trade_date).pop();\n" +
        "  if (!prev || prev.date !== refs.d1 || ch.last_trade_date !== refs.d0) ch.change_1d = null;\n" +
        "  marketRows.push({ ticker: t.ticker, name: t.name, ...ch });\n" +
        "});\n" +
        "const asOf = marketRows.map((r) => r.last_trade_date).sort().pop() || null;\n" +
        "const market = marketRows.length ? { rows: marketRows, as_of: asOf } : null;\n" +
        "const aaPages = $('Artificial Analysis models').all().map(ok).filter(Boolean);\n" +
        "const current = {\n" +
        "  lmarena: collapseVariants(parseLmarena(ok($('LMArena leaderboard').first()))),\n" +
        "  aa: aaPages.length ? collapseVariants(parseAaModels(aaPages)) : null,\n" +
        "  hf_trending: parseHfTrending(ok($('Hugging Face trending').first())),\n" +
        "};\n" +
        "const prevRows = $('Recent leaderboard snapshots').all().map((i) => i.json).filter((r) => r.board && r.date && r.date < date);\n" +
        "const prevFor = (board) => {\n" +
        "  const rows = prevRows.filter((r) => r.board === board);\n" +
        "  const last = rows.map((r) => r.date).sort().pop();\n" +
        "  return rows.filter((r) => r.date === last).map((r) => ({ rank: r.rank, model: r.model, org: r.org, score: r.score }));\n" +
        "};\n" +
        "const rankingMoves = [];\n" +
        "const rankings = {};\n" +
        "for (const board of ['lmarena', 'aa', 'hf_trending']) {\n" +
        "  const list = current[board];\n" +
        "  if (!list) { rankings[board] = null; continue; }\n" +
        "  const top = list.slice(0, 20);\n" +
        "  const moves = diffLeaderboard(prevFor(board), top, { board });\n" +
        "  rankingMoves.push(...moves);\n" +
        "  const byId = Object.fromEntries(moves.map((m) => [m.entity_id, m]));\n" +
        "  rankings[board] = top.map((r) => {\n" +
        "    const m = byId[entityId(r.model)];\n" +
        "    const delta = !m ? null : m.kind === 'new' ? 'new' : m.kind === 'up' ? m.from - m.to : m.kind === 'down' ? -(m.to - m.from) : null;\n" +
        "    return { ...r, delta };\n" +
        "  });\n" +
        "}\n" +
        "const areaSet = buildAreas($('LMArena areas').all().map(ok), prevRows);\n" +
        "rankings.areas = areaSet.areas;\n" +
        "const moveLog = $('Recent move log').all().map((i) => i.json).filter((r) => r.entity_id);\n" +
        "const bigMoves = findBigMoves({ snapshots: marketRows, moveLog, today: date });\n" +
        "const tags = $('Recent impact tags').all().map((i) => i.json).filter((r) => r.entity_id);\n" +
        "const rankingAsMoves = rankingMoves.map((m) => ({ entity_id: m.entity_id, change: m.kind === 'up' ? '+' + (m.from - m.to) + ' (' + m.board + ')' : m.kind === 'down' ? '-' + (m.to - m.from) + ' (' + m.board + ')' : m.kind + ' (' + m.board + ')' }));\n" +
        "const followUps = findFollowUps({ impactTags: tags, moves: [...bigMoves, ...rankingAsMoves], today: date });\n" +
        "const leaderboardTop = [...new Set([...(current.lmarena || []).slice(0, 20), ...(current.aa || []).slice(0, 20)].map((r) => r.model))];\n" +
        "const marketWrite = marketRows.map((r) => ({ date, ticker: r.ticker, close: r.close, change_1d: r.change_1d, change_7d: r.change_7d, change_30d: r.change_30d, last_trade_date: r.last_trade_date }));\n" +
        "const boardWrite = [];\n" +
        "for (const board of ['lmarena', 'aa', 'hf_trending']) for (const r of rankings[board] || []) boardWrite.push({ date, board, rank: r.rank, model: r.model, org: r.org, score: r.score });\n" +
        "for (const r of areaSet.writes) boardWrite.push({ date, ...r });\n" +
        "const moveWrite = [\n" +
        "  { date, entity_id: '', kind: 'run' },\n" +
        "  ...bigMoves.map((m) => ({ date: m.log_date, entity_id: m.entity_id, kind: m.kind })),\n" +
        "  ...rankingMoves.map((m) => ({ date, entity_id: m.entity_id, kind: 'rank' })),\n" +
        "];\n" +
        "return [{ json: {\n" +
        "  date, market, rankings, big_moves: bigMoves, ranking_moves: rankingMoves, follow_ups: followUps, leaderboard_top: leaderboardTop, areas_missing: areaSet.missing,\n" +
        "  writes: {\n" +
        "    market: marketWrite.length ? marketWrite : [{ date, ticker: '', close: 0, change_1d: null, change_7d: null, change_30d: null, last_trade_date: '' }],\n" +
        "    boards: boardWrite.length ? boardWrite : [{ date, board: 'none', rank: 0, model: '', org: '', score: 0 }],\n" +
        "    moves: moveWrite,\n" +
        "  },\n" +
        "} }];\n",
    },
  },
  output: [{ date: '2026-11-19', market: null, rankings: {}, big_moves: [], ranking_moves: [], follow_ups: [], leaderboard_top: [], writes: { market: [], boards: [], moves: [] } }],
});

const clearTodayMarket = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: "Clear today's market snapshots",
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: T_MARKET, cachedResultName: 'market_snapshots' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'date', condition: 'eq', keyValue: expr("{{ $('Numbers request').first().json.date }}") }] },
    },
  },
  output: [{}],
});

const clearTodayBoards = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: "Clear today's leaderboard snapshots",
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: T_BOARDS, cachedResultName: 'leaderboard_snapshots' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'date', condition: 'eq', keyValue: expr("{{ $('Numbers request').first().json.date }}") }] },
    },
  },
  output: [{}],
});

const marketItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Market snapshot rows', parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Compute numbers').first().json.writes.market.map((r) => ({ json: r }));\n" } },
  output: [{ date: '2026-11-19', ticker: 'NVDA', close: 150.96, change_1d: 1.2, change_7d: -3, change_30d: -10, last_trade_date: '2026-11-18' }],
});

const insertMarket = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save market snapshots',
    alwaysOutputData: true,
    executeOnce: false,
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: T_MARKET, cachedResultName: 'market_snapshots' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          date: expr('{{ $json.date }}'),
          ticker: expr('{{ $json.ticker }}'),
          close: expr('{{ $json.close }}'),
          change_1d: expr('{{ $json.change_1d }}'),
          change_7d: expr('{{ $json.change_7d }}'),
          change_30d: expr('{{ $json.change_30d }}'),
          last_trade_date: expr('{{ $json.last_trade_date }}'),
        },
        schema: [{ id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'ticker', displayName: 'ticker', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'close', displayName: 'close', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }, { id: 'change_1d', displayName: 'change_1d', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }, { id: 'change_7d', displayName: 'change_7d', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }, { id: 'change_30d', displayName: 'change_30d', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }, { id: 'last_trade_date', displayName: 'last_trade_date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }],
      },
      options: { optimizeBulk: true },
    },
  },
  output: [{}],
});

const boardItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Leaderboard snapshot rows', parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Compute numbers').first().json.writes.boards.map((r) => ({ json: r }));\n" } },
  output: [{ date: '2026-11-19', board: 'lmarena', rank: 1, model: 'Model A', org: 'a', score: 1500 }],
});

const insertBoards = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save leaderboard snapshots',
    alwaysOutputData: true,
    executeOnce: false,
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: T_BOARDS, cachedResultName: 'leaderboard_snapshots' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          date: expr('{{ $json.date }}'),
          board: expr('{{ $json.board }}'),
          rank: expr('{{ $json.rank }}'),
          model: expr('{{ $json.model }}'),
          org: expr('{{ $json.org }}'),
          score: expr('{{ $json.score }}'),
        },
        schema: [{ id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'board', displayName: 'board', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'rank', displayName: 'rank', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }, { id: 'model', displayName: 'model', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'org', displayName: 'org', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'score', displayName: 'score', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true }],
      },
      options: { optimizeBulk: true },
    },
  },
  output: [{}],
});

const moveItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Move log rows', parameters: { mode: 'runOnceForAllItems', jsCode: "return $('Compute numbers').first().json.writes.moves.map((r) => ({ json: r }));\n" } },
  output: [{ date: '2026-11-19', entity_id: '', kind: 'run' }],
});

const insertMoves = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Save move log',
    alwaysOutputData: true,
    executeOnce: false,
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: T_MOVES, cachedResultName: 'move_log' },
      columns: {
        mappingMode: 'defineBelow',
        value: { date: expr('{{ $json.date }}'), entity_id: expr('{{ $json.entity_id }}'), kind: expr('{{ $json.kind }}') },
        schema: [{ id: 'date', displayName: 'date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'entity_id', displayName: 'entity_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'kind', displayName: 'kind', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }],
      },
      options: { optimizeBulk: true },
    },
  },
  output: [{}],
});

const returnNumbers = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Return numbers',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const n = $('Compute numbers').first().json;\nconst { writes, ...out } = n;\nreturn [{ json: out }];\n",
    },
  },
  output: [{ date: '2026-11-19', market: null, rankings: {}, big_moves: [], ranking_moves: [], follow_ups: [], leaderboard_top: [] }],
});

export default workflow('ppai-numbers', 'PPAI · numbers')
  .add(numbersRequest)
  .to(clearTodayMoves)
  .to(readWatchlist)
  .to(usTickers)
  .to(marketDates)
  .to(massiveGrouped)
  .to(watchlistCloses)
  .to(lmarena)
  .to(hfTrending)
  .to(areaList)
  .to(areaBoards)
  .to(aaPageList)
  .to(aaModels)
  .to(recentBoards)
  .to(recentMoves)
  .to(recentTags)
  .to(computeNumbers)
  .to(clearTodayMarket)
  .to(clearTodayBoards)
  .to(marketItems)
  .to(insertMarket)
  .to(boardItems)
  .to(insertBoards)
  .to(moveItems)
  .to(insertMoves)
  .to(returnNumbers);
