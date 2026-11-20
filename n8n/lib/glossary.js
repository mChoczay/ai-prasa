// Glossary: hard terms in today's stories, explained in plain Polish by Haiku once and then reused.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js alongside this file.
import { entityId } from './news.js';

const GLOSSARY_PER_STORY = 3;
const GLOSSARY_PER_EDITION = 12;
const GLOSSARY_EXPLAIN_MAX = 600;
const GLOSSARY_BODY_CHARS = 600;

// Lead story first, then the stories, as in the profiles stage.
function _glossarySlots(edition) {
  return [(edition && edition.lead_story) || null, ...((edition && edition.stories) || [])];
}

function _oneLine(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function glossaryPrompt(edition, knownTerms, feedback = '') {
  const stories = _glossarySlots(edition)
    .map((s, idx) => (s ? `[${idx}] ${_oneLine(s.title, 200)} — ${_oneLine(s.lede, 300)} — ${_oneLine(s.body, GLOSSARY_BODY_CHARS)}` : null))
    .filter(Boolean)
    .join('\n');
  const known = (knownTerms || []).map((r) => r && r.term).filter(Boolean);
  let text = `Today's stories (idx, title, lede, start of the body):\n${stories}\n\nTerms already in the glossary (return these with an empty explain if a story needs them):\n${known.length ? known.map((t) => `- ${t}`).join('\n') : '- (none yet)'}`;
  if (String(feedback || '').trim()) text += `\n\n## Reader feedback\n${String(feedback).trim()}`;
  return text;
}

// answer is Haiku's data ({stories: [{idx, terms: [{term, explain}]}]}), possibly invalid. Returns a copy of the
// edition whose stories carry term ids, the new rows for glossary_terms and the full glossary.json content.
function mergeGlossary(edition, answer, knownRows, date) {
  const e = JSON.parse(JSON.stringify(edition || {}));
  const byId = new Map();
  for (const r of knownRows || []) {
    if (r && r.term_id && r.term && r.explain) byId.set(String(r.term_id), { id: String(r.term_id), term: String(r.term), explain: String(r.explain) });
  }
  const newRows = [];
  const used = new Set();
  const slots = _glossarySlots(e);
  const list = answer && Array.isArray(answer.stories) ? answer.stories : [];
  for (const entry of list) {
    const idx = entry && Number.isInteger(entry.idx) ? entry.idx : -1;
    const story = slots[idx];
    if (!story || !Array.isArray(entry.terms)) continue;
    const ids = [];
    for (const t of entry.terms) {
      if (ids.length >= GLOSSARY_PER_STORY) break;
      const term = String((t && t.term) || '').trim();
      const id = entityId(term);
      if (!term || !id || ids.includes(id)) continue;
      if (!used.has(id) && used.size >= GLOSSARY_PER_EDITION) continue;
      if (!byId.has(id)) {
        const explain = String((t && t.explain) || '').trim().slice(0, GLOSSARY_EXPLAIN_MAX);
        if (!explain) continue;
        byId.set(id, { id, term, explain });
        newRows.push({ term_id: id, term, explain, first_date: date });
      }
      used.add(id);
      ids.push(id);
    }
    if (ids.length) story.terms = ids;
  }
  const terms = [...byId.values()].sort((a, b) => a.term.localeCompare(b.term, 'pl', { sensitivity: 'base' }));
  return { edition: e, newRows, glossaryJson: { terms } };
}

export { glossaryPrompt, mergeGlossary };
