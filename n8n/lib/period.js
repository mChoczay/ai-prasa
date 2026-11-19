// Relay stage "period": the weekly ("Tydzień w AI") and monthly ("Miesiąc w AI") supplements.
// Imports are stripped by scripts/inline-lib.mjs; inline dates.js and edition.js first.
import { supplementMinutes } from './edition.js';

const WINDOWS = Object.freeze({ weekly: 7, monthly: 30 });

function _shift(date, days) {
  const [y, m, d] = String(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function periodKinds(flags) {
  return ['weekly', 'monthly'].filter((k) => flags && flags[k]);
}

// Leaderboard top 10 per board on the first snapshot day inside the window.
function _boardsThen(snapshots, start) {
  const out = {};
  for (const board of ['lmarena', 'aa', 'hf_trending']) {
    const rows = (snapshots || []).filter((r) => r.board === board && r.date >= start);
    const first = rows.map((r) => r.date).sort()[0];
    out[board] = first ? rows.filter((r) => r.date === first).sort((a, b) => a.rank - b.rank).slice(0, 10) : [];
    out[board].date = first || null;
  }
  return out;
}

function _pct(v) {
  return v == null || !Number.isFinite(Number(v)) ? 'n/a' : `${Number(v) > 0 ? '+' : ''}${Number(v)}%`;
}

function periodPrompt({ kind, date, topics, snapshots, numbers }) {
  const days = WINDOWS[kind];
  const start = _shift(date, -days);
  const label = kind === 'weekly' ? 'Tydzień w AI (last 7 days)' : 'Miesiąc w AI (last 30 days)';
  const stories = (topics || [])
    .filter((t) => t.title && t.date >= start && t.date <= date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => `- ${t.date} [${t.category}, ${t.status}] ${t.title}: ${t.summary || ''}`)
    .join('\n') || '- (none)';
  const rows = (numbers && numbers.market && numbers.market.rows) || [];
  const market = rows.length
    ? rows.map((r) => `- ${r.name} (${r.ticker}): ${kind === 'weekly' ? `7d ${_pct(r.change_7d)}` : `30d ${_pct(r.change_30d)}`}`).join('\n')
    : 'dane niedostępne';
  const then = _boardsThen(snapshots, start);
  const now = (numbers && numbers.rankings) || {};
  const boards = ['lmarena', 'aa', 'hf_trending']
    .map((b) => {
      const cur = (now[b] || []).slice(0, 10).map((r) => `#${r.rank} ${r.model}`).join(', ') || 'dane niedostępne';
      const old = then[b].length ? then[b].map((r) => `#${r.rank} ${r.model}`).join(', ') : 'no snapshot';
      return `${b}: now ${cur}\n  at ${then[b].date || 'start'}: ${old}`;
    })
    .join('\n');
  return `Supplement: ${label}, ending ${date}.\n\n## Stories published in the period\n${stories}\n\n## Stock changes over the period\n${market}\n\n## Leaderboards, now vs. the start of the period\n${boards}`;
}

// One schema with a property per requested kind.
function periodSchema(single, kinds) {
  const properties = {};
  for (const k of kinds) properties[k] = single;
  return { type: 'object', properties, required: [...kinds], additionalProperties: false };
}

function addPeriods(edition, data, kinds) {
  const e = JSON.parse(JSON.stringify(edition));
  for (const k of kinds) e[k] = data && data[k] && data[k].body ? data[k] : null;
  e.supplement_minutes = supplementMinutes(e);
  return e;
}

export { periodKinds, periodPrompt, periodSchema, addPeriods };
