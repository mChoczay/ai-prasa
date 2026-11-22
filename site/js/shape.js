// Data shaping for the front page and the reader, with fallbacks for editions written before the
// redesign (no market.mood, why_short, rankings.notes, images or supplement_minutes).

const D1_THRESHOLD = 3;
const D7_THRESHOLD = 8;
const AREA_ROWS = 5;

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

// Ranking areas worth showing: a key, a label and at least one row; five rows each.
export function rankingAreas(edition) {
  const areas = (edition && edition.rankings && edition.rankings.areas) || [];
  if (!Array.isArray(areas)) return [];
  return areas
    .filter((a) => a && typeof a.key === 'string' && a.key && typeof a.label === 'string' && Array.isArray(a.rows) && a.rows.length)
    .map((a) => ({ key: a.key, label: a.label, new_leader: a.new_leader === true, rows: a.rows.slice(0, AREA_ROWS) }));
}

// The area to open: the remembered one if this edition has it, else the first.
export function pickArea(areas, stored) {
  const keys = (areas || []).map((a) => a.key);
  return keys.includes(stored) ? stored : keys[0] || '';
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

const _MONTH_NAMES = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];

// Parts of an edition date (RRRR-MM-DD) with Polish short and full names; null for anything else.
export function dateParts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const weekday = _DAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { day, month, year, weekday, monthShort: _MONTHS[month - 1], monthName: _MONTH_NAMES[month - 1] };
}

// Browser-tab title: short, with the paper's name and the edition's day.
export function tabTitle(view, edition, page) {
  const e = edition || {};
  if (view === 'archive') return 'Archiwum · Prasa AI';
  if (view === 'vulns') return 'Luki · Prasa AI';
  if (view === 'about') return 'O gazecie · Prasa AI';
  if (view === 'front') {
    const p = dateParts(e.date);
    return p ? `Prasa AI · ${p.weekday} ${p.day} ${p.monthShort}` : 'Prasa AI';
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
