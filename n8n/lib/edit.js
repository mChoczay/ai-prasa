// Editing for readability: a managing editor rewrites today's texts (the "edit" relay stage) and the
// weekly/monthly supplements (in the period stage). The editor may cut and clarify, never add: every text
// that fails a check keeps the reporter's version. The checks compare with the original edition only.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js, dates.js and edition.js first.
import { readingMinutes, supplementMinutes } from './edition.js';

const EDIT_MIN_RATIO = 0.4;
const EDIT_MAX_RATIO = 1.25;
const EDIT_SHORT_WORDS = 45;
const SUPPLEMENT_KINDS = Object.freeze(['weekly', 'monthly']);
const _UNITS = [
  [/^(%|proc)/i, '%'],
  [/^(mln|milion)/i, 'mln'],
  [/^(mld|miliard)/i, 'mld'],
  [/^(bln|bilion)/i, 'bln'],
  [/^(tys|tysi)/i, 'tys'],
  [/^(usd|dolar)/i, 'USD'],
  [/^(zł|złot)/i, 'zł'],
];

function _editWords(text) {
  return String(text || '').split(/\s+/).filter((w) => w && !/^#+$/.test(w)).length;
}

// Numbers as written, decimal parts included, with the unit right after them normalised:
// "2.3.1", "22,92 %", "17 mln" (also from "17 milionów"). A number means the same only with the same unit.
function numbersIn(text) {
  const out = [];
  const re = /(\d+(?:[.,]\d+)*)(?:\s?(%|[a-ząćęłńóśźż]+))?/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const word = m[2] || '';
    const unit = (_UNITS.find(([pattern]) => pattern.test(word)) || [])[1];
    out.push(unit ? `${m[1]} ${unit}` : m[1]);
  }
  return out;
}

function _subheads(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .filter((block) => /^#{2,3} /.test(block.trim())).length;
}

function _editSlots(edition) {
  return [(edition && edition.lead_story) || null, ...((edition && edition.stories) || [])];
}

function editPrompt(edition, feedback = '', { stories = true, supplements = true } = {}) {
  const parts = [];
  if (stories) {
    _editSlots(edition).forEach((s, idx) => {
      if (!s) return;
      const forYou = String(s.for_you || '').trim() ? `\nFor you: ${s.for_you}` : '\nFor you: (none, return an empty string)';
      parts.push(`### Story idx ${idx}\nTitle: ${s.title || ''}\nLede: ${s.lede || ''}\nBody:\n${s.body || ''}${forYou}`);
    });
  }
  if (supplements) {
    for (const kind of SUPPLEMENT_KINDS) {
      const p = edition && edition[kind];
      if (!p) continue;
      const takeaways = (p.takeaways || []).map((t) => `- ${t}`).join('\n');
      parts.push(`### Supplement ${kind}\nTitle: ${p.title || ''}\nBody:\n${p.body || ''}\nTakeaways:\n${takeaways}`);
    }
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

// A short field (lede, "Dla Ciebie") may grow a little, never into an article.
function _tooLong(after, before) {
  const now = _editWords(after);
  return now > Math.max(_editWords(before) * 1.5, EDIT_SHORT_WORDS) ? now : 0;
}

function applyEdits(edition, answer) {
  const original = edition || {};
  const e = JSON.parse(JSON.stringify(original));
  const kept = [];
  let changed = false;
  const before = _editSlots(original);
  const slots = _editSlots(e);
  const seen = new Set();

  const stories = answer && Array.isArray(answer.stories) ? answer.stories : [];
  for (const ed of stories) {
    const idx = ed && Number.isInteger(ed.idx) ? ed.idx : -1;
    const s = before[idx];
    if (!s) continue;
    if (seen.has(`story ${idx}`)) {
      kept.push(`story ${idx}: repeated`);
      continue;
    }
    seen.add(`story ${idx}`);
    const hadForYou = Boolean(String(s.for_you || '').trim());
    const forYou = hadForYou ? String(ed.for_you || '').trim() : '';
    const ledeWords = _tooLong(ed.lede, s.lede);
    const forYouWords = hadForYou ? _tooLong(forYou, s.for_you) : 0;
    const problem =
      _problem({
        before: [s.title, s.lede, s.body, s.for_you].join('\n'),
        after: [ed.lede, ed.body, forYou].join('\n'),
        beforeBody: s.body,
        afterBody: ed.body,
        required: [ed.lede, ...(hadForYou ? [forYou] : [])],
      }) ||
      (ledeWords ? `lede ${ledeWords} words` : '') ||
      (forYouWords ? `for_you ${forYouWords} words` : '');
    if (problem) {
      kept.push(`story ${idx}: ${problem}`);
      continue;
    }
    slots[idx].lede = String(ed.lede).trim();
    slots[idx].body = String(ed.body).trim();
    slots[idx].for_you = forYou;
    changed = true;
  }

  const supplements = answer && Array.isArray(answer.supplements) ? answer.supplements : [];
  for (const ed of supplements) {
    const kind = ed && SUPPLEMENT_KINDS.includes(ed.kind) ? ed.kind : null;
    const p = kind && original[kind];
    if (!p) continue;
    if (seen.has(kind)) {
      kept.push(`${kind}: repeated`);
      continue;
    }
    seen.add(kind);
    const takeaways = Array.isArray(ed.takeaways) ? ed.takeaways.map((t) => String(t || '').trim()) : [];
    const was = (p.takeaways || []).length;
    if (takeaways.length !== was) {
      kept.push(`${kind}: ${takeaways.length} takeaways instead of ${was}`);
      continue;
    }
    const heads = _subheads(p.body);
    const newHeads = _subheads(ed.body);
    if (newHeads < Math.min(heads, 3)) {
      kept.push(`${kind}: ${newHeads} subheads of ${heads}`);
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
    e[kind].title = String(ed.title).trim();
    e[kind].body = String(ed.body).trim();
    e[kind].takeaways = takeaways;
    changed = true;
  }

  if (changed) {
    e.minutes = readingMinutes(e);
    e.supplement_minutes = supplementMinutes(e);
  }
  return { edition: e, report: { kept } };
}

export { numbersIn, editPrompt, applyEdits };
