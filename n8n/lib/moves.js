// Market and leaderboard move detection. Imports are stripped by scripts/inline-lib.mjs;
// inline dates.js and news.js alongside this file.
import { daysBetween } from './dates.js';
import { entityId } from './news.js';

function _round2(n) {
  return Math.round(Number(`${n}e2`)) / 100;
}

function _shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function _pct(close, ref) {
  if (!ref || !Number.isFinite(ref.close) || ref.close === 0) return null;
  return _round2((close / ref.close - 1) * 100);
}

function computeChanges(rows, asOfDate) {
  const upTo = (rows || []).filter((r) => r.date <= asOfDate && Number.isFinite(r.close));
  if (!upTo.length) return null;
  const last = upTo[upTo.length - 1];
  const lastOnOrBefore = (date) => {
    const hits = upTo.filter((r) => r.date <= date);
    return hits.length ? hits[hits.length - 1] : null;
  };
  return {
    close: last.close,
    change_1d: _pct(last.close, upTo.length > 1 ? upTo[upTo.length - 2] : null),
    change_7d: _pct(last.close, lastOnOrBefore(_shiftDate(last.date, -7))),
    change_30d: _pct(last.close, lastOnOrBefore(_shiftDate(last.date, -30))),
    last_trade_date: last.date,
  };
}

function findBigMoves({ snapshots, moveLog, today, thresholds = { d1: 3, d7: 8 } }) {
  const log = moveLog || [];
  const moves = [];
  for (const s of snapshots || []) {
    const id = String(s.ticker).toLowerCase();
    if (Number.isFinite(s.change_1d) && Math.abs(s.change_1d) >= thresholds.d1) {
      const seen = log.some((l) => l.entity_id === id && l.kind === 'd1' && l.date === s.last_trade_date);
      if (!seen) moves.push({ entity_id: id, board: 'market', kind: 'd1', change: s.change_1d, log_date: s.last_trade_date });
    }
    if (Number.isFinite(s.change_7d) && Math.abs(s.change_7d) >= thresholds.d7) {
      const recent = log.some((l) => {
        if (l.entity_id !== id || l.kind !== 'd7') return false;
        const age = daysBetween(l.date, today);
        return age >= 0 && age < 7;
      });
      if (!recent) moves.push({ entity_id: id, board: 'market', kind: 'd7', change: s.change_7d, log_date: today });
    }
  }
  return moves;
}

function diffLeaderboard(prev, curr, { board, minShift = 2, topN = 20 }) {
  if (!Array.isArray(prev) || !prev.length || !Array.isArray(curr)) return [];
  const top = (list) => new Map(list.filter((r) => r.rank <= topN).map((r) => [entityId(r.model), r.rank]));
  const before = top(prev);
  const after = top(curr);
  const moves = [];
  for (const [id, to] of after) {
    if (!before.has(id)) {
      moves.push({ entity_id: id, board, kind: 'new', from: null, to });
      continue;
    }
    const from = before.get(id);
    if (from - to >= minShift) moves.push({ entity_id: id, board, kind: 'up', from, to });
    else if (to - from >= minShift) moves.push({ entity_id: id, board, kind: 'down', from, to });
  }
  for (const [id, from] of before) {
    if (!after.has(id)) moves.push({ entity_id: id, board, kind: 'out', from, to: null });
  }
  return moves;
}

function findFollowUps({ impactTags, moves, today, windowDays = 5, maxItems = 3 }) {
  const out = [];
  for (const move of moves || []) {
    const tags = (impactTags || [])
      .filter((t) => t.entity_id === move.entity_id)
      .filter((t) => {
        const age = daysBetween(t.date, today);
        return age >= 1 && age <= windowDays;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    if (tags.length) {
      out.push({ entity_id: move.entity_id, move: String(move.change), related_story: tags[0].story_title, story_date: tags[0].date });
    }
  }
  // One line per company (its biggest move), biggest first; ranking moves ("+2 (lmarena)") count as 0.
  const size = (f) => Math.abs(Number(f.move)) || 0;
  const best = new Map();
  for (const f of out) if (!best.has(f.entity_id) || size(f) > size(best.get(f.entity_id))) best.set(f.entity_id, f);
  return [...best.values()].sort((a, b) => size(b) - size(a)).slice(0, maxItems);
}

export { computeChanges, findBigMoves, diffLeaderboard, findFollowUps };
