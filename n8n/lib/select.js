// Relay stage "select": the selection prompt, applying Sonnet's choice, which pages to fetch and the
// article texts for the writer. Imports are stripped by scripts/inline-lib.mjs; inline news.js first.
import { safeNormalizeUrl, extractArticleText } from './news.js';

const MIN_ARTICLE_CHARS = 500;
const MAIN_TEXT_CHARS = 6000;
const RELATED_TEXT_CHARS = 2500;
const _STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'over', 'its', 'are', 'new', 'now', 'has', 'how', 'why', 'what', 'after', 'about', 'says', 'will', 'can', 'this', 'that', 'than', 'more', 'out']);

function selectPrompt(candidates, historyTitles) {
  const covered = (historyTitles || []).map((t) => `- ${t}`).join('\n') || '- (none)';
  const list = (candidates || [])
    .map((c) => `[${c.idx}] ${c.title} — ${c.source} — ${c.category}, importance ${c.importance} — ${String(c.published_at).slice(0, 16)}\n    ${c.snippet || ''}`)
    .join('\n');
  return `Titles covered in the last 7 days:\n${covered}\n\nCandidates:\n${list}`;
}

// Selection by idx -> candidate objects. Unknown or repeated idx are dropped; the lead falls back to the
// most important candidate when the model's lead_idx is unusable.
function applySelection(candidates, selection, { maxStories = 6, maxRumors = 3 } = {}) {
  const byIdx = new Map((candidates || []).map((c) => [c.idx, c]));
  const sel = selection || {};
  const used = new Set();
  const take = (idx) => {
    if (!byIdx.has(idx) || used.has(idx)) return null;
    used.add(idx);
    return byIdx.get(idx);
  };
  let lead = take(sel.lead_idx);
  if (!lead) {
    const ranked = [...byIdx.values()].sort((a, b) => (b.importance || 0) - (a.importance || 0));
    const first = ranked.find((c) => !(sel.rumor_idx || []).includes(c.idx));
    lead = first ? take(first.idx) : null;
  }
  const rumorIds = new Set(sel.rumor_idx || []);
  const stories = [];
  for (const idx of sel.story_idx || []) {
    if (rumorIds.has(idx) || stories.length >= maxStories) continue;
    const c = take(idx);
    if (c) stories.push(c);
  }
  const rumors = [];
  for (const idx of sel.rumor_idx || []) {
    if (rumors.length >= maxRumors) break;
    const c = take(idx);
    if (c) rumors.push(c);
  }
  return { lead, stories, rumors };
}

function _words(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 3 && !_STOP.has(w) && !/^\d+$/.test(w)),
  );
}

// Other candidates about the same event: at least 2 shared significant title words.
function relatedCandidates(item, candidates, max = 2) {
  const own = _words(item.title);
  return (candidates || [])
    .filter((c) => c.idx !== item.idx)
    .map((c) => ({ c, shared: [..._words(c.title)].filter((w) => own.has(w)).length }))
    .filter((x) => x.shared >= 2)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, max)
    .map((x) => x.c);
}

function _chosen(selection) {
  const s = selection || {};
  return [
    ...(s.lead ? [{ role: 'lead', c: s.lead }] : []),
    ...(s.stories || []).map((c) => ({ role: 'story', c })),
    ...(s.rumors || []).map((c) => ({ role: 'rumor', c })),
  ];
}

// URLs to fetch for the chosen items and their related coverage, each once.
function fetchList(selection, candidates) {
  const seen = new Set();
  const out = [];
  const add = (url, forIdx, role) => {
    const key = safeNormalizeUrl(url);
    if (!url || seen.has(key)) return;
    seen.add(key);
    out.push({ url, for_idx: forIdx, role });
  };
  for (const { c } of _chosen(selection)) {
    add(c.url, c.idx, 'main');
    for (const r of relatedCandidates(c, candidates, 2)) add(r.url, c.idx, 'related');
  }
  return out;
}

// fetched: [{url, statusCode, body}] from the HTTP node -> article texts for the writer.
function buildArticles(selection, candidates, fetched) {
  const pages = new Map();
  for (const f of fetched || []) {
    if (!f || Number(f.statusCode) !== 200 || typeof f.body !== 'string') continue;
    pages.set(safeNormalizeUrl(f.url), f.body);
  }
  const textOf = (c, max) => {
    const html = pages.get(safeNormalizeUrl(c.url));
    const text = html ? extractArticleText(html, max) : '';
    return text.length >= MIN_ARTICLE_CHARS ? { text, ok: true } : { text: c.snippet || '', ok: false };
  };
  return _chosen(selection).map(({ role, c }) => {
    const main = textOf(c, MAIN_TEXT_CHARS);
    return {
      role,
      idx: c.idx,
      title: c.title,
      url: c.url,
      source: c.source,
      published_at: c.published_at,
      category: c.category,
      text: main.text,
      text_ok: main.ok,
      related: relatedCandidates(c, candidates, 2).map((r) => ({ title: r.title, url: r.url, source: r.source, text: textOf(r, RELATED_TEXT_CHARS).text })),
    };
  });
}

export { selectPrompt, applySelection, relatedCandidates, fetchList, buildArticles };
