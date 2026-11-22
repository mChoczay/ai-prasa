// Relay stage "edit": a managing editor rewrites today's texts for readability. The editor may cut and
// clarify, never add: every text that fails a check keeps the reporter's version.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js, dates.js and edition.js first.
import { readingMinutes, supplementMinutes } from './edition.js';

const EDIT_MIN_RATIO = 0.4;
const EDIT_MAX_RATIO = 1.15;
const SUPPLEMENT_KINDS = Object.freeze(['weekly', 'monthly']);

function _editWords(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length;
}

// Numbers as written, decimal parts included: "2.3.1", "22,92", "17".
function numbersIn(text) {
  return String(text || '').match(/\d+(?:[.,]\d+)*/g) || [];
}

function _editSlots(edition) {
  return [(edition && edition.lead_story) || null, ...((edition && edition.stories) || [])];
}

function editPrompt(edition, feedback = '') {
  const parts = [];
  _editSlots(edition).forEach((s, idx) => {
    if (!s) return;
    parts.push(`### Story idx ${idx}\nTitle: ${s.title || ''}\nLede: ${s.lede || ''}\nBody:\n${s.body || ''}\nFor you: ${s.for_you || ''}`);
  });
  for (const kind of SUPPLEMENT_KINDS) {
    const p = edition && edition[kind];
    if (!p) continue;
    const takeaways = (p.takeaways || []).map((t) => `- ${t}`).join('\n');
    parts.push(`### Supplement ${kind}\nTitle: ${p.title || ''}\nBody:\n${p.body || ''}\nTakeaways:\n${takeaways}`);
  }
  const notes = String(feedback || '').trim();
  return `Today's texts. Edit each one and return all of them.\n\n${parts.join('\n\n')}${notes ? `\n\n## Reader feedback\n${notes}` : ''}`;
}

// Why an edited text cannot be used, or '' when it can.
function _problem({ before, after, beforeBody, afterBody, required }) {
  if (!String(afterBody || '').trim() || required.some((f) => !String(f || '').trim())) return 'empty field';
  const was = _editWords(beforeBody);
  const now = _editWords(afterBody);
  if (now < was * EDIT_MIN_RATIO || now > was * EDIT_MAX_RATIO) return `length ${now} of ${was} words`;
  const allowed = new Set(numbersIn(before));
  const added = numbersIn(after).filter((n) => !allowed.has(n));
  if (added.length) return `new number ${added.join(', ')}`;
  return '';
}

function applyEdits(edition, answer) {
  const e = JSON.parse(JSON.stringify(edition || {}));
  const kept = [];
  let changed = false;
  const slots = _editSlots(e);

  const stories = answer && Array.isArray(answer.stories) ? answer.stories : [];
  for (const ed of stories) {
    const idx = ed && Number.isInteger(ed.idx) ? ed.idx : -1;
    const s = slots[idx];
    if (!s) continue;
    const required = [ed.lede, ...(String(s.for_you || '').trim() ? [ed.for_you] : [])];
    const problem = _problem({
      before: [s.title, s.lede, s.body, s.for_you].join('\n'),
      after: [ed.lede, ed.body, ed.for_you].join('\n'),
      beforeBody: s.body,
      afterBody: ed.body,
      required,
    });
    if (problem) {
      kept.push(`story ${idx}: ${problem}`);
      continue;
    }
    s.lede = String(ed.lede).trim();
    s.body = String(ed.body).trim();
    s.for_you = String(ed.for_you || '').trim();
    changed = true;
  }

  const supplements = answer && Array.isArray(answer.supplements) ? answer.supplements : [];
  for (const ed of supplements) {
    const kind = ed && SUPPLEMENT_KINDS.includes(ed.kind) ? ed.kind : null;
    const p = kind && e[kind];
    if (!p) continue;
    const takeaways = Array.isArray(ed.takeaways) ? ed.takeaways.map((t) => String(t || '').trim()) : [];
    const was = (p.takeaways || []).length;
    if (takeaways.length !== was) {
      kept.push(`${kind}: ${takeaways.length} takeaways instead of ${was}`);
      continue;
    }
    const table = (p.race_map || []).map((r) => [r.area, r.leader, r.note].join(' ')).join('\n');
    const problem = _problem({
      before: [p.title, p.body, ...(p.takeaways || []), table].join('\n'),
      after: [ed.title, ed.body, ...takeaways].join('\n'),
      beforeBody: p.body,
      afterBody: ed.body,
      required: [ed.title, ...takeaways],
    });
    if (problem) {
      kept.push(`${kind}: ${problem}`);
      continue;
    }
    p.title = String(ed.title).trim();
    p.body = String(ed.body).trim();
    p.takeaways = takeaways;
    changed = true;
  }

  if (changed) {
    e.minutes = readingMinutes(e);
    e.supplement_minutes = supplementMinutes(e);
  }
  return { edition: e, report: { kept } };
}

export { numbersIn, editPrompt, applyEdits };
