// Reader feedback: validating what the site sends to the private webhook, and the short digest the
// editors (select, write, front) get in their prompts. Imports are stripped by scripts/inline-lib.mjs;
// inline dates.js first.
import { daysBetween } from './dates.js';

const FEEDBACK_RATINGS = ['more', 'ok', 'less', ''];
const FEEDBACK_WINDOW_DAYS = 30;
const FEEDBACK_MAX_EXAMPLES = 10;
const FEEDBACK_MAX_NOTES = 10;
const FEEDBACK_NOTE_CHARS = 300;
const FEEDBACK_MAX_CHARS = 2400;

function validateFeedback(body, key) {
  // No key configured (settings row missing or its read failed): a server problem, not a wrong key,
  // so the site must not turn ratings off.
  if (typeof key !== 'string' || !key) return { ok: false, status: 503 };
  let b = body;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      return { ok: false, status: 400 };
    }
  }
  if (!b || typeof b !== 'object') return { ok: false, status: 400 };
  if (b.k !== key) return { ok: false, status: 401 };
  const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null;
  const n = Number.isInteger(b.n) && b.n >= 1 && b.n <= 20 ? b.n : null;
  const title = typeof b.title === 'string' && b.title.length <= 300 ? b.title : null;
  const category = typeof b.category === 'string' && b.category.length <= 40 ? b.category : null;
  if (!date || !n || title === null || category === null) return { ok: false, status: 400 };
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  const hasRating = typeof b.rating === 'string' && FEEDBACK_RATINGS.includes(b.rating);
  if (b.rating !== undefined && !hasRating) return { ok: false, status: 400 };
  if (note.length > 1000) return { ok: false, status: 400 };
  if (!hasRating && !note) return { ok: false, status: 400 };
  return { ok: true, row: { date, n, title, category, rating: hasRating ? b.rating : '', note } };
}

function _quoted(text, max) {
  const s = String(text || '').replace(/[\s\u0085]+/g, ' ').replace(/"/g, "'").trim();
  return max && s.length > max ? s.slice(0, max) + '…' : s;
}

function _inWindow(row, today) {
  if (!row || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
  const age = daysBetween(row.date, today);
  return age >= 0 && age <= FEEDBACK_WINDOW_DAYS;
}

function feedbackDigest(rows, today) {
  const recent = (rows || [])
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => _inWindow(row, today))
    .sort((a, b) => {
      // createdAt may be an ISO string or a Date; compare as time.
      const ta = Date.parse(a.row.createdAt) || 0;
      const tb = Date.parse(b.row.createdAt) || 0;
      return ta - tb || a.i - b.i;
    })
    .map(({ row }) => row);

  // Last rating per story wins; an empty rating clears it. A note-only row (empty rating) is not a rating.
  const last = new Map();
  for (const r of recent) {
    if (typeof r.rating !== 'string' || (!r.rating && r.note)) continue;
    last.set(`${r.date}#${r.n}`, r);
  }
  const rated = [...last.values()].filter((r) => r.rating === 'more' || r.rating === 'less');
  const tally = new Map();
  for (const r of rated) {
    const t = tally.get(r.category) || { more: 0, less: 0 };
    t[r.rating] += 1;
    tally.set(r.category, t);
  }
  const notes = recent.filter((r) => typeof r.note === 'string' && r.note.trim()).reverse().slice(0, FEEDBACK_MAX_NOTES);

  const examples = rated
    .slice()
    .reverse()
    .slice(0, FEEDBACK_MAX_EXAMPLES)
    .map((r) => `- ${r.rating} like this: "${_quoted(r.title, 200)}" (${_quoted(r.category, 40)})`);
  const noteLines = notes.map((r) => `- ${r.date}, "${_quoted(r.title, 200)}": "${_quoted(r.note, FEEDBACK_NOTE_CHARS)}"`);
  const byCat = [...tally.entries()].map(([c, t]) => `${_quoted(c, 40)} +${t.more}/-${t.less}`).join(', ');
  const build = () => {
    const lines = [];
    if (rated.length) lines.push(`Ratings (last ${FEEDBACK_WINDOW_DAYS} days, by category): ${byCat}`, ...examples);
    if (noteLines.length) lines.push(`Notes from the reader (last ${FEEDBACK_WINDOW_DAYS} days, newest first):`, ...noteLines);
    return lines.join('\n');
  };
  // About 400 words at most: drop the oldest example or note, from the longer list, until it fits.
  let text = build();
  while (text.length > FEEDBACK_MAX_CHARS && (examples.length || noteLines.length > 1)) {
    if (examples.length >= noteLines.length || noteLines.length <= 1) examples.pop();
    else noteLines.pop();
    text = build();
  }
  return text;
}

export { validateFeedback, feedbackDigest };
