// Relay stages "write" and "front": the two writing prompts and assembling the edition.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js, dates.js and edition.js first.
import { safeNormalizeUrl } from './news.js';
import { readingMinutes } from './edition.js';

// "Dlaczego?" goes to the writer only for the largest moves; the rest stay in the market table.
function capBigMoves(moves, n = 6) {
  const seen = new Set();
  return [...(moves || [])]
    .sort((a, b) => Math.abs(Number(b.change) || 0) - Math.abs(Number(a.change) || 0))
    .filter((m) => {
      const key = `${m.entity_id}|${m.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, n);
}

function pickSchema(full, keys) {
  const properties = {};
  for (const k of keys) {
    if (!full.properties || !(k in full.properties)) throw new Error(`unknown property: ${k}`);
    properties[k] = full.properties[k];
  }
  return { type: 'object', properties, required: [...keys], additionalProperties: false };
}

// Known entities for the writer and for resolving "Może dotyczyć": profiles plus the active watchlist.
function entityList(profiles, watchlist) {
  const out = [];
  const ids = new Set();
  for (const p of profiles || []) {
    const id = p.entity_id || p.id;
    if (!id || ids.has(id)) continue;
    ids.add(id);
    out.push({ id, name: p.name, aliases: p.aliases || '', type: p.type || null });
  }
  for (const w of watchlist || []) {
    if (!w.active) continue;
    const id = String(w.ticker).toLowerCase();
    if (ids.has(id)) continue;
    ids.add(id);
    out.push({ id, name: w.name, aliases: w.ticker, type: 'company' });
  }
  return out;
}

function _articleBlock(a, n) {
  const head = `### [${n}] ${a.title}\nSource: ${a.source} — ${a.url} — published ${String(a.published_at).slice(0, 16)} — category hint: ${a.category}`;
  const body = a.text_ok ? a.text : `(full text unavailable: only the snippet) ${a.text}`;
  const related = (a.related || []).map((r) => `- Related: ${r.title} — ${r.source} — ${r.url}\n  ${r.text}`).join('\n');
  return `${head}\n${body}${related ? `\n${related}` : ''}`;
}

function _context({ date, leakers, entities, historyTitles }) {
  const leak = (leakers || []).map((l) => `- ${l.name} (${l.platform})${l.note ? `: ${l.note}` : ''}`).join('\n') || '- (none)';
  const ents = (entities || []).map((e) => `- ${e.name}${e.aliases ? ` [${e.aliases}]` : ''}`).join('\n') || '- (none)';
  const hist = (historyTitles || []).map((t) => `- ${t}`).join('\n') || '- (none)';
  return `Edition date: ${date}\n\nTrusted leakers:\n${leak}\n\nKnown entities (use these names in may_affect_names when they fit):\n${ents}\n\nTitles covered in the last 7 days:\n${hist}`;
}

function storiesPrompt({ date, articles, leakers, entities, historyTitles, feedback = '' }) {
  const stories = (articles || []).filter((a) => a.role === 'story');
  const rumors = (articles || []).filter((a) => a.role === 'rumor');
  const block = (list, start) => list.map((a, i) => _articleBlock(a, start + i)).join('\n\n') || '(none)';
  return `${_context({ date, leakers, entities, historyTitles })}

Write only the "stories" and "rumors" parts of today's edition. The lead story is written separately; do not repeat it.

## Articles for stories (one story each)
${block(stories, 1)}

## Articles for the rumors column
${block(rumors, stories.length + 1)}${feedback ? `\n\n## Reader feedback\n${feedback}` : ''}`;
}

function _pct(v) {
  if (v == null || !Number.isFinite(Number(v))) return 'n/a';
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n}%`;
}

function _delta(d) {
  if (d == null) return '';
  if (d === 'new') return ' new';
  return ` ${d > 0 ? '+' : ''}${d}`;
}

const _BOARDS = [
  ['lmarena', 'LMArena (text)'],
  ['aa', 'Artificial Analysis'],
  ['hf_trending', 'Hugging Face trending'],
];

function frontPrompt({ date, articles, written, numbers, candidates, leakers, entities, historyTitles, feedback = '' }) {
  const lead = (articles || []).find((a) => a.role === 'lead');
  const n = numbers || {};
  const market = n.market && Array.isArray(n.market.rows) && n.market.rows.length
    ? `Last close: ${n.market.as_of}\n` + n.market.rows.map((r) => `- ${r.name} (${r.ticker}): close ${r.close}, 1d ${_pct(r.change_1d)}, 7d ${_pct(r.change_7d)}, 30d ${_pct(r.change_30d)}`).join('\n')
    : 'dane niedostępne';
  const boards = _BOARDS.map(([key, label]) => {
    const list = n.rankings && n.rankings[key];
    if (!Array.isArray(list) || !list.length) return `${label}: dane niedostępne`;
    return `${label}:\n` + list.slice(0, 10).map((r) => `- #${r.rank} ${r.model} (${r.org})${_delta(r.delta)}`).join('\n');
  }).join('\n');
  const moves = capBigMoves(n.big_moves, 6).map((m) => `- ${m.entity_id} — ${m.board} — ${m.kind === 'd7' ? '7d' : '1d'} ${_pct(m.change)}`);
  const rankMoves = (n.ranking_moves || []).map((m) => `- ${m.entity_id} — ${m.board} — ${m.kind}${m.from != null ? ` from #${m.from}` : ''}${m.to != null ? ` to #${m.to}` : ''}`);
  const follow = (n.follow_ups || []).map((f) => `- ${f.entity_id}: move ${f.move} — earlier story "${f.related_story}" (${f.story_date})`).join('\n') || '- (none)';
  const storyList = ((written && written.stories) || []).map((s) => `- ${s.title}: ${s.lede}`).join('\n') || '- (none)';
  const rumorList = ((written && written.rumors) || []).map((r) => `- ${r.title}`).join('\n') || '- (none)';
  const headlines = (candidates || []).map((c) => `- ${c.title} — ${c.source} — ${c.url}\n  ${c.snippet || ''}`).join('\n') || '- (none)';
  return `${_context({ date, leakers, entities, historyTitles })}

Write the greeting, the lead story, the market and rankings commentary, the "Dlaczego?" entries for the big moves, the follow-ups and the closing. The other stories are already written; the greeting and closing may refer to them.

## Lead article
${lead ? _articleBlock(lead, 1) : '(none: write the lead from the strongest headline below)'}

## Stories already written
${storyList}

## Rumors already written
${rumorList}

## Market (USD, US listings)
${market}

## Leaderboards (top 10)
${boards}

## Big moves needing "Dlaczego?" (one big_moves entry each, use these entity_id values)
${moves.concat(rankMoves).join('\n') || '- (none)'}

## Follow-ups (one follow_ups entry each)
${follow}

## Other headlines of the day (context and possible sources for "Dlaczego?")
${headlines}${feedback ? `\n\n## Reader feedback\n${feedback}` : ''}`;
}

// Each story gets the preview image of the first cited article (main or related) that has one.
function attachImages(stories, articles) {
  const images = new Map();
  for (const a of articles || []) {
    for (const x of [a, ...(a.related || [])]) if (x && x.image && !images.has(safeNormalizeUrl(x.url))) images.set(safeNormalizeUrl(x.url), x.image);
  }
  return (stories || []).map((s) => {
    if (!s) return s;
    const hit = (s.sources || []).map((src) => images.get(safeNormalizeUrl(src.url))).find(Boolean);
    return { ...s, image: hit || null };
  });
}

function _keepKnown(sources, known) {
  return (sources || []).filter((s) => s && known.has(safeNormalizeUrl(s.url)));
}

// Merge the two model outputs into one edition (model shape); sources not from the input are dropped,
// so checkEditionRules then removes stories left without any.
function assembleEdition({ storiesPart, frontPart, knownUrls, articles = [] }) {
  const known = new Set((knownUrls || []).map(safeNormalizeUrl));
  const sp = storiesPart || {};
  const fp = frontPart || {};
  const story = (s) => (s ? { ...s, sources: _keepKnown(s.sources, known) } : null);
  return {
    greeting: fp.greeting || '',
    lead_story: fp.lead_story ? attachImages([story(fp.lead_story)], articles)[0] : null,
    stories: attachImages((sp.stories || []).map(story), articles),
    market: { commentary: (fp.market && fp.market.commentary) || '', mood: (fp.market && fp.market.mood) || '' },
    rankings: { commentary: (fp.rankings && fp.rankings.commentary) || '', notes: (fp.rankings && fp.rankings.notes) || [] },
    rumors: (sp.rumors || []).map(story),
    big_moves: (fp.big_moves || []).map((m) => ({ ...m, sources: _keepKnown(m.sources, known) })),
    follow_ups: fp.follow_ups || [],
    closing: fp.closing || '',
  };
}

// Workflow-owned fields on top of the checked edition: dates, tables, minutes; moves the model was not
// given are dropped.
function finalizeEdition(checked, { date, generatedAt, numbers, allowedMoveIds }) {
  const n = numbers || {};
  const allowed = new Set(allowedMoveIds || []);
  const followAllowed = new Set((n.follow_ups || []).map((f) => f.entity_id));
  const rankings = n.rankings || {};
  const e = {
    date,
    edition: 'daily',
    generated_at: generatedAt,
    quiet_day: Boolean(checked.quiet_day),
    greeting: checked.greeting,
    lead_story: checked.lead_story,
    stories: checked.stories || [],
    market: {
      commentary: (checked.market && checked.market.commentary) || '',
      mood: (checked.market && checked.market.mood) || '',
      disclaimer: checked.market && checked.market.disclaimer,
      rows: n.market && Array.isArray(n.market.rows) ? n.market.rows : null,
      as_of: (n.market && n.market.as_of) || null,
    },
    rankings: {
      commentary: (checked.rankings && checked.rankings.commentary) || '',
      notes: (checked.rankings && checked.rankings.notes) || [],
      lmarena: rankings.lmarena || null,
      aa: rankings.aa || null,
      hf_trending: rankings.hf_trending || null,
    },
    rumors: checked.rumors || [],
    big_moves: (checked.big_moves || []).filter((m) => allowed.has(m.entity_id)),
    follow_ups: (checked.follow_ups || []).filter((f) => followAllowed.has(f.entity_id)),
    closing: checked.closing,
    weekly: null,
    monthly: null,
    spotlight: null,
  };
  e.minutes = readingMinutes(e);
  return e;
}

export { attachImages, capBigMoves, pickSchema, entityList, storiesPrompt, frontPrompt, assembleEdition, finalizeEdition };
