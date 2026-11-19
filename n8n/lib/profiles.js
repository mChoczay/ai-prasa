// Relay stage "profiles": which entities get a new card today, the Wikipedia lookup, the Haiku prompt,
// the table row, and finishing the edition (pending names, spotlight) plus the rows for publish.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js, dates.js and edition.js first.
import { entityId } from './news.js';
import { collectNewEntities, resolvePending, pickSpotlight } from './edition.js';

const WIKI_EXTRACT_CHARS = 2500;

function _stories(edition) {
  return [edition && edition.lead_story, ...((edition && edition.stories) || [])].filter(Boolean);
}

// Up to 3 sentences of today's edition that mention the name.
function _mentions(edition, name) {
  const needle = String(name || '').toLowerCase();
  if (!needle) return [];
  const out = [];
  for (const s of _stories(edition)) {
    for (const sentence of `${s.lede || ''} ${s.body || ''}`.split(/(?<=[.!?])\s+/)) {
      if (sentence.toLowerCase().includes(needle) && out.length < 3) out.push(sentence.trim());
    }
  }
  return out;
}

function _boardRows(rankings, name) {
  const out = [];
  for (const board of ['lmarena', 'aa', 'hf_trending']) {
    for (const r of (rankings && rankings[board]) || []) {
      if (String(r.model).toLowerCase() === String(name).toLowerCase()) out.push({ board, rank: r.rank, org: r.org });
    }
  }
  return out;
}

// Entities to profile today, each with a Wikipedia search query and context from the edition.
function profileTargets({ edition, newEntityNames, watchlist, leaderboardTop, profiles, rankings, today, maxPerDay = 10 }) {
  const known = (profiles || []).map((p) => ({ ...p, id: p.entity_id || p.id }));
  const tickers = new Map((watchlist || []).map((w) => [String(w.ticker).toLowerCase(), w.ticker]));
  return collectNewEntities({ newEntityNames, watchlist, leaderboardTop, profiles: known, today, maxPerDay }).map((t) => {
    const ticker = t.type === 'company' ? tickers.get(t.id) || null : null;
    const boards = _boardRows(rankings, t.name);
    const org = boards.length ? boards[0].org : '';
    const query = t.type === 'company' ? `${t.name} company ${ticker || ''}` : t.type === 'model' ? `${t.name} ${org} AI model` : `${t.name} artificial intelligence`;
    return { ...t, ticker, query: query.replace(/\s+/g, ' ').trim(), boards, mentions: _mentions(edition, t.name) };
  });
}

function wikiSearchUrl(query) {
  return (
    'https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=1&prop=extracts%7Cinfo&exintro=1&explaintext=1&inprop=url&gsrsearch=' +
    encodeURIComponent(query)
  );
}

// Wikipedia search+extract response -> { title, extract, url } or null.
function parseWikiSearch(body) {
  const pages = body && body.query && body.query.pages;
  if (!pages || typeof pages !== 'object') return null;
  const page = Object.values(pages)[0];
  if (!page || typeof page.extract !== 'string' || !page.extract.trim()) return null;
  return { title: page.title, extract: page.extract.trim().slice(0, WIKI_EXTRACT_CHARS), url: page.fullurl || null };
}

function profilePrompt(target, wiki) {
  const lines = [`Name: ${target.name}`, `Suggested type: ${target.type || '(unknown)'}`];
  if (target.ticker) lines.push(`Stock ticker: ${target.ticker}`);
  for (const b of target.boards || []) lines.push(`Leaderboard: #${b.rank} on ${b.board}, organization ${b.org}`);
  lines.push('', 'Reference text:');
  if (wiki) lines.push(`Wikipedia, "${wiki.title}": ${wiki.extract}`);
  for (const m of target.mentions || []) lines.push(`From today's news: ${m}`);
  if (!wiki && !(target.mentions || []).length && !(target.boards || []).length) lines.push('(none)');
  lines.push('', 'If the Wikipedia text is about something else than this entity, ignore it.');
  return lines.join('\n');
}

// True when there is anything to write a card from.
function hasReference(target, wiki) {
  return Boolean(wiki || (target.mentions || []).length || (target.boards || []).length);
}

function profileRow(target, card, wiki, date) {
  const aliases = [...new Set([...(card.aliases || []), ...(target.ticker ? [target.ticker] : [])])];
  return {
    entity_id: target.id || entityId(card.name),
    type: card.type || target.type || 'org',
    name: target.name,
    aliases: aliases.join(','),
    ticker: target.ticker || '',
    summary: card.summary,
    owner: card.owner,
    key_products: (card.key_products || []).join(', '),
    why_it_matters: card.why_it_matters,
    updated_at: date,
    source_urls: wiki && wiki.url ? wiki.url : '',
  };
}

// Table rows -> the site's profiles.json.
function profilesJson(rows) {
  const profiles = (rows || [])
    .filter((r) => r.entity_id)
    .map((r) => ({
      id: r.entity_id,
      type: r.type,
      name: r.name,
      aliases: r.aliases || '',
      ticker: r.ticker || '',
      summary: r.summary || '',
      owner: r.owner || '',
      key_products: String(r.key_products || '').split(',').map((s) => s.trim()).filter(Boolean),
      why_it_matters: r.why_it_matters || '',
      updated_at: r.updated_at ? String(r.updated_at).slice(0, 10) : '',
      last_spotlight_at: r.last_spotlight_at ? String(r.last_spotlight_at).slice(0, 10) : null,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { profiles };
}

// Pending names become ids now that profiles exist; the spotlight is picked from today's entities.
function finishEdition(edition, rows, today) {
  const profiles = profilesJson(rows).profiles;
  const done = resolvePending(edition, profiles);
  const todays = [];
  for (const s of _stories(done)) for (const id of s.may_affect || []) if (!todays.includes(id)) todays.push(id);
  for (const m of done.big_moves || []) if (!todays.includes(m.entity_id)) todays.push(m.entity_id);
  const spotlight = pickSpotlight({ profiles, todaysEntityIds: todays, today });
  done.spotlight = spotlight.company_id || spotlight.model_id ? spotlight : null;
  return { edition: done, spotlightIds: [spotlight.company_id, spotlight.model_id].filter(Boolean), profiles: { profiles } };
}

// Rows for topics_history and impact_tags (replaced by date in publish).
function historyRows(edition) {
  const topics = _stories(edition).map((s) => ({
    date: edition.date,
    title: s.title,
    summary: s.lede || '',
    category: s.category,
    status: s.status,
    source_urls: (s.sources || []).map((x) => x.url).join(' '),
  }));
  const tags = [];
  for (const s of _stories(edition)) for (const id of s.may_affect || []) tags.push({ date: edition.date, story_title: s.title, entity_id: id });
  return { topics, tags };
}

export { profileTargets, wikiSearchUrl, parseWikiSearch, profilePrompt, hasReference, profileRow, profilesJson, finishEdition, historyRows };
