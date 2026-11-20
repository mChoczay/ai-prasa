// Ranking areas for the front page: LMArena area leaderboards (programming, agents, writing, Polish, maths,
// images), each compared with its previous snapshot. Display-only data: it never reaches a prompt or the move
// log. Imports are stripped by scripts/inline-lib.mjs; inline news.js, dates.js, parsers.js and moves.js alongside.
import { entityId } from './news.js';
import { parseLmarena, collapseVariants } from './parsers.js';
import { diffLeaderboard } from './moves.js';

const AREAS = Object.freeze([
  { key: 'webdev', label: 'Programowanie', config: 'webdev', category: 'overall' },
  { key: 'agent', label: 'Agenci', config: 'agent', category: 'overall' },
  { key: 'writing', label: 'Pisanie', config: 'text', category: 'creative_writing' },
  { key: 'polish', label: 'Po polsku', config: 'text', category: 'polish' },
  { key: 'math', label: 'Matematyka', config: 'text', category: 'math' },
  { key: 'image', label: 'Obrazy', config: 'text_to_image', category: 'overall' },
]);

const AREA_KEEP = 20;
const AREA_SHOW = 10;

function areaRequests() {
  const base = 'https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset';
  return AREAS.map((a) => ({
    key: a.key,
    url: `${base}&config=${a.config}&split=latest&where=${encodeURIComponent(`"category"='${a.category}'`)}&orderby=${encodeURIComponent('"rank"')}&offset=0&length=60`,
  }));
}

function _delta(move) {
  if (!move) return null;
  if (move.kind === 'new') return 'new';
  if (move.kind === 'up') return move.from - move.to;
  if (move.kind === 'down') return -(move.to - move.from);
  return null;
}

// responses[i] is the HTTP body for AREAS[i] (null on failure); prevRows are snapshot rows from earlier days.
function buildAreas(responses, prevRows) {
  const areas = [];
  const missing = [];
  const writes = [];
  const earlier = Array.isArray(prevRows) ? prevRows.filter((r) => r && r.board && r.date) : [];
  AREAS.forEach((a, i) => {
    const list = collapseVariants(parseLmarena((responses || [])[i], a.category));
    if (!Array.isArray(list) || !list.length) {
      missing.push(a.key);
      return;
    }
    const board = `area_${a.key}`;
    const top = list.slice(0, AREA_KEEP);
    const mine = earlier.filter((r) => r.board === board);
    const last = mine.map((r) => r.date).sort().pop();
    const prev = mine.filter((r) => r.date === last).map((r) => ({ rank: Number(r.rank), model: r.model, org: r.org, score: r.score }));
    const moves = diffLeaderboard(prev, top, { board, minShift: 1, topN: AREA_KEEP });
    const byId = Object.fromEntries(moves.map((m) => [m.entity_id, m]));
    const prevLeader = prev.find((r) => r.rank === 1);
    areas.push({
      key: a.key,
      label: a.label,
      new_leader: Boolean(prevLeader) && entityId(prevLeader.model) !== entityId(top[0].model),
      rows: top.slice(0, AREA_SHOW).map((r) => ({ rank: r.rank, model: r.model, org: r.org, delta: _delta(byId[entityId(r.model)]) })),
    });
    for (const r of top) writes.push({ board, rank: r.rank, model: r.model, org: r.org, score: r.score });
  });
  return { areas, missing, writes };
}

export { AREAS, areaRequests, buildAreas };
