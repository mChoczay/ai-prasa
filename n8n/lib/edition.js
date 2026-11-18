// Edition cleanup rules, entities, spotlight and archive index.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js and dates.js alongside this file.
import { entityId } from './news.js';
import { daysBetween } from './dates.js';

const STATUSES = Object.freeze(['potwierdzone', 'plotka', 'opinia']);
const MARKET_CATEGORIES = Object.freeze(['gielda', 'inwestycje']);
const DISCLAIMER = 'To nie jest porada inwestycyjna.';
const MIN_STORIES = 5;
const PROFILE_MAX_AGE_DAYS = 90;
const SPOTLIGHT_COOLDOWN_DAYS = 60;

function _aliases(profile) {
  return String(profile.aliases || '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

function resolveEntity(name, profiles) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  const hit = (profiles || []).find(
    (p) =>
      String(p.id).toLowerCase() === needle ||
      String(p.name || '').toLowerCase() === needle ||
      _aliases(p).includes(needle),
  );
  return hit ? hit.id : null;
}

function _hasSources(item) {
  return Array.isArray(item.sources) && item.sources.length > 0;
}

function checkEditionRules(input, profiles) {
  const edition = structuredClone(input);
  const errors = [];
  const newEntityNames = [];

  const validStory = (story) => {
    if (!_hasSources(story)) {
      errors.push(`story without sources: ${story.title}`);
      return false;
    }
    if (!STATUSES.includes(story.status)) {
      errors.push(`invalid status: ${story.title}`);
      return false;
    }
    return true;
  };

  const all = [edition.lead_story, ...(edition.stories || [])].filter(Boolean).filter(validStory);
  for (const story of all) {
    const ids = [];
    for (const name of story.may_affect_names || []) {
      const id = resolveEntity(name, profiles);
      if (id) {
        if (!ids.includes(id)) ids.push(id);
      } else if (!newEntityNames.includes(name)) {
        newEntityNames.push(name);
      }
    }
    delete story.may_affect_names;
    story.may_affect = ids;
    story.disclaimer = MARKET_CATEGORIES.includes(story.category) ? DISCLAIMER : story.disclaimer ?? null;
  }
  edition.lead_story = all[0] || null;
  edition.stories = all.slice(1);

  edition.rumors = (edition.rumors || []).filter((r) => {
    if (_hasSources(r)) return true;
    errors.push(`story without sources: ${r.title}`);
    return false;
  });

  if (edition.market) edition.market.disclaimer = DISCLAIMER;
  edition.quiet_day = all.length < MIN_STORIES;
  return { edition, errors, newEntityNames };
}

function collectNewEntities({ newEntityNames, watchlist, leaderboardTop, profiles, today, maxPerDay = 10 }) {
  const known = profiles || [];
  const out = [];
  const seen = new Set();
  const add = (id, name, type, reason) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name, type, reason });
  };
  const missing = (name, id) => !resolveEntity(name, known) && !resolveEntity(id, known);

  for (const w of watchlist || []) {
    if (!w.active) continue;
    const id = String(w.ticker).toLowerCase();
    if (missing(w.name, id)) add(id, w.name, 'company', 'new');
  }
  for (const name of newEntityNames || []) {
    const id = entityId(name);
    if (missing(name, id)) add(id, name, null, 'new');
  }
  for (const name of leaderboardTop || []) {
    const id = entityId(name);
    if (missing(name, id)) add(id, name, 'model', 'new');
  }
  for (const p of known) {
    if (p.updated_at && daysBetween(String(p.updated_at).slice(0, 10), today) > PROFILE_MAX_AGE_DAYS) {
      add(p.id, p.name, p.type, 'stale');
    }
  }
  return out.slice(0, maxPerDay);
}

function _eligible(profile, today) {
  return (
    profile.last_spotlight_at == null ||
    profile.last_spotlight_at === '' ||
    daysBetween(String(profile.last_spotlight_at).slice(0, 10), today) > SPOTLIGHT_COOLDOWN_DAYS
  );
}

function pickSpotlight({ profiles, todaysEntityIds, today }) {
  const pick = (type) => {
    const ofType = (profiles || []).filter((p) => p.type === type && _eligible(p, today));
    for (const id of todaysEntityIds || []) {
      const hit = ofType.find((p) => p.id === id);
      if (hit) return hit.id;
    }
    const sorted = [...ofType].sort((a, b) => {
      const av = a.last_spotlight_at || '';
      const bv = b.last_spotlight_at || '';
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sorted.length ? sorted[0].id : null;
  };
  return { company_id: pick('company'), model_id: pick('model') };
}

function _words(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length;
}

function readingMinutes(edition) {
  const stories = [edition.lead_story, ...(edition.stories || [])].filter(Boolean);
  let words = _words(edition.greeting) + _words(edition.closing);
  for (const s of stories) words += _words(s.lede) + _words(s.body) + _words(s.for_you);
  for (const r of edition.rumors || []) words += _words(r.body);
  for (const m of edition.big_moves || []) words += _words(m.why);
  words += _words(edition.market && edition.market.commentary);
  words += _words(edition.rankings && edition.rankings.commentary);
  for (const p of [edition.weekly, edition.monthly]) if (p) words += _words(p.body);
  return Math.max(1, Math.ceil(words / 200));
}

function upsertIndex(index, entry) {
  const editions = ((index && index.editions) || []).filter((e) => e.date !== entry.date);
  editions.push(entry);
  editions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { ...index, editions };
}

export { DISCLAIMER, resolveEntity, checkEditionRules, collectNewEntities, pickSpotlight, readingMinutes, upsertIndex };
