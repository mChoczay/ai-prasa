// Data shaping for the front page and the reader, with fallbacks for editions written before the
// redesign (no market.mood, why_short, rankings.notes, images or supplement_minutes).

const BOARDS = ['lmarena', 'aa', 'hf_trending'];
const D1_THRESHOLD = 3;
const D7_THRESHOLD = 8;
const RANK_SHIFT = 2;

// The first sentence: up to a . ! or ? followed by a capitalised word or the end of the text, so
// "2.5" and "proc. dziś" do not cut it short.
export function firstSentence(text) {
  const s = String(text || '').trim();
  const m = s.match(/^[\s\S]*?[.!?](?=\s+[A-ZĄĆĘŁŃÓŚŹŻ„"(]|\s*$)/);
  return m ? m[0].trim() : s;
}

export function marketMood(market) {
  if (!market) return '';
  return market.mood ? String(market.mood) : firstSentence(market.commentary);
}

export function whyShort(move) {
  if (!move) return '';
  return move.why_short ? String(move.why_short) : firstSentence(move.why);
}

function _num(v) {
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
}

// The tile figure: whichever of the one-day and seven-day changes is the bigger signal past its
// threshold; the one-day change when neither passes.
function _tileChange(row) {
  const d1 = _num(row.change_1d);
  const d7 = _num(row.change_7d);
  const candidates = [];
  if (d1 != null && Math.abs(d1) >= D1_THRESHOLD) candidates.push({ change: d1, period: '1d' });
  if (d7 != null && Math.abs(d7) >= D7_THRESHOLD) candidates.push({ change: d7, period: '7d' });
  candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  if (candidates.length) return candidates[0];
  return d1 != null ? { change: d1, period: '1d' } : d7 != null ? { change: d7, period: '7d' } : null;
}

export function marketTiles(edition, max = 4) {
  const rows = (edition && edition.market && edition.market.rows) || [];
  const byTicker = new Map(rows.map((r) => [String(r.ticker).toLowerCase(), r]));
  const tiles = [];
  const seen = new Set();
  for (const m of (edition && edition.big_moves) || []) {
    if (m.board !== 'market' || seen.has(m.entity_id)) continue;
    const row = byTicker.get(m.entity_id);
    const ch = row && _tileChange(row);
    if (!ch) continue;
    seen.add(m.entity_id);
    tiles.push({ ticker: row.ticker, name: row.name, change: ch.change, period: ch.period, why_type: m.why_type, why_short: whyShort(m), why: m.why || '', sources: m.sources || [] });
  }
  return tiles.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, max);
}

function _slug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function rankingChanges(edition) {
  const rankings = (edition && edition.rankings) || {};
  const moves = ((edition && edition.big_moves) || []).filter((m) => m.board !== 'market');
  const out = [];
  for (const board of BOARDS) {
    for (const r of rankings[board] || []) {
      const big = r.delta === 'new' || (_num(r.delta) != null && Math.abs(r.delta) >= RANK_SHIFT);
      if (!big) continue;
      const move = moves.find((m) => m.board === board && m.entity_id === _slug(r.model));
      out.push({ board, model: r.model, org: r.org, rank: r.rank, delta: r.delta, why_short: move ? whyShort(move) : '', why: move ? move.why || '' : '' });
    }
  }
  return out;
}

export function rankingNotes(edition) {
  const rankings = (edition && edition.rankings) || {};
  if (Array.isArray(rankings.notes) && rankings.notes.length) return rankings.notes;
  const text = String(rankings.commentary || '').trim();
  return text ? [{ board: null, text }] : [];
}

export function readerPages(edition) {
  const e = edition || {};
  const pages = [e.lead_story, ...(e.stories || [])].filter(Boolean).map((story) => ({ kind: 'story', story }));
  if (e.weekly) pages.push({ kind: 'weekly' });
  if (e.monthly) pages.push({ kind: 'monthly' });
  return pages.map((p, i) => ({ ...p, n: i + 1 }));
}

export function minutesLabel(edition) {
  const e = edition || {};
  const extra = Number(e.supplement_minutes) > 0 ? ` + dodatek ${e.supplement_minutes} min` : '';
  return `ok. ${e.minutes} min${extra}`;
}

const _DAYS = ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
const _MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

// Browser-tab title: short, with the paper's name and the edition's day.
export function tabTitle(view, edition, page) {
  const e = edition || {};
  if (view === 'archive') return 'Archiwum · Prasa AI';
  if (view === 'front') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e.date || ''));
    if (!m) return 'Prasa AI';
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const day = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    return `Prasa AI · ${_DAYS[day]} ${d} ${_MONTHS[mo - 1]}`;
  }
  if (view === 'reader') {
    const pages = readerPages(e);
    const p = pages[page - 1];
    if (!p) return 'Prasa AI';
    const title = (p.kind === 'story' ? p.story.title : e[p.kind] && e[p.kind].title) || 'Prasa AI';
    return `${p.n}/${pages.length} · ${title}`;
  }
  return 'Poranna prasa AI';
}
