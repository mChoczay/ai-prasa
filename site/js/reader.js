// The reader: every story (and supplement) of an edition as a page in a horizontal scroll-snap strip.
import {
  escapeHtml,
  paragraphs,
  statusBadge,
  categoryLabel,
  sourcesList,
  entityChip,
  termChip,
  imageFigure,
} from './render.js';
import { readerPages, dateParts } from './shape.js';
import { feedbackBlock } from './feedback.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SUPPLEMENT_LABELS = Object.freeze({ weekly: 'Tydzień w AI', monthly: 'Miesiąc w AI' });

export function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'oceny') {
    const q = new URLSearchParams(query);
    const url = q.get('u') || '';
    const key = q.get('k') || '';
    // Only a bare link or off=1 turns ratings off; a cut-off link does nothing.
    return { view: 'feedback', date: null, page: null, category: null, url, key, off: q.get('off') === '1' || (!url && !key) };
  }
  if (parts[0] === 'luki') return { view: 'vulns', date: null, page: null, category: null };
  if (parts[0] === 'o-gazecie') return { view: 'about', date: null, page: null, category: null };
  if (parts[0] === 'archiwum') {
    // Old ?kat= links still open the archive; there is no filter any more.
    return { view: 'archive', date: null, page: null, category: null };
  }
  const date = DATE.test(parts[0] || '') ? parts[0] : null;
  const page = date && /^\d+$/.test(parts[1] || '') ? Number(parts[1]) : null;
  return { view: page !== null ? 'reader' : 'front', date, page, category: null };
}

export function clampPage(page, count) {
  const n = Number.isFinite(page) ? Math.trunc(page) : 1;
  return Math.min(Math.max(n, 1), Math.max(count, 1));
}

function pageTitle(edition, p) {
  return p.kind === 'story' ? p.story.title : edition[p.kind].title;
}

// Marks the first appearance of each term or company in already-escaped paragraph HTML as a button
// (the same cards open from it). Only plain text between tags is searched; entities such as &lt; and
// text already inside a button are skipped, and a match must stand as a whole word.
function markInline(html, marks) {
  const reEscape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = html;
  for (const m of marks) {
    const needle = escapeHtml(m.text);
    if (!needle) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${reEscape(needle)}(?![\\p{L}\\p{N}])`, 'iu');
    let done = false;
    let inButton = false;
    out = out
      .split(/(<[^>]+>)/)
      .map((part) => {
        if (part.startsWith('<')) {
          if (/^<button\b/.test(part)) inButton = true;
          if (/^<\/button>/.test(part)) inButton = false;
          return part;
        }
        if (done || inButton) return part;
        return part
          .split(/(&#?\w+;)/)
          .map((piece) => {
            if (done || piece.startsWith('&')) return piece;
            const hit = re.exec(piece);
            if (!hit) return piece;
            done = true;
            return `${piece.slice(0, hit.index)}<button type="button" class="inline-term" ${m.attr}>${hit[0]}</button>${piece.slice(hit.index + hit[0].length)}`;
          })
          .join('');
      })
      .join('');
  }
  return out;
}

function storyBody(s, profilesById, termsById) {
  const chips = (s.may_affect || []).map((id) => entityChip(id, profilesById)).join(' ');
  const terms = (Array.isArray(s.terms) ? s.terms : []).map((id) => termChip(id, termsById)).filter(Boolean).join(' · ');
  const marks = [
    ...(Array.isArray(s.terms) ? s.terms : [])
      .filter((id) => termsById && termsById[id])
      .map((id) => ({ text: termsById[id].term, attr: `data-term="${escapeHtml(id)}"` })),
    ...(s.may_affect || [])
      .filter((id) => profilesById && profilesById[id])
      .map((id) => ({ text: profilesById[id].name, attr: `data-entity="${escapeHtml(id)}"` })),
  ];
  return `${imageFigure(s.image, s.image_fallback, { size: 'hero', link: true })}
<p class="story-kicker">${categoryLabel(s.category)} · ${statusBadge(s.status)}${s.is_update ? ' · aktualizacja' : ''}</p>
<h2>${escapeHtml(s.title)}</h2>
<p class="lede">${escapeHtml(s.lede)}</p>
<div class="body">${markInline(paragraphs(s.body), marks)}</div>
${s.for_you ? `<p class="for-you"><strong>Dla Ciebie:</strong> ${escapeHtml(s.for_you)}</p>` : ''}
${chips ? `<p class="may-affect">Może dotyczyć: ${chips}</p>` : ''}
${terms ? `<p class="terms">Pojęcia: ${terms}</p>` : ''}
${s.disclaimer ? `<p class="disclaimer">${escapeHtml(s.disclaimer)}</p>` : ''}
${sourcesList(s.sources)}`;
}

// Supplement text: a block starting with "## " (or "### ") opens with a subhead line; the rest of the
// block, if any, is its first paragraph.
function supplementParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const head = /^#{2,3} (.*)(?:\n([\s\S]*))?$/.exec(p);
      if (!head) return paragraphs(p);
      return `<h3>${escapeHtml(head[1].trim())}</h3>${paragraphs(head[2] || '')}`;
    })
    .join('');
}

function supplementBody(p, label) {
  const takeaways = (p.takeaways || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const race = (p.race_map || [])
    .map((r) => `<tr><th scope="row">${escapeHtml(r.area)}</th><td><strong>${escapeHtml(r.leader)}</strong><span>${escapeHtml(r.note)}</span></td></tr>`)
    .join('');
  return `<p class="kicker">${label}</p><h2>${escapeHtml(p.title)}</h2><div class="body">${supplementParagraphs(p.body)}</div>
${takeaways ? `<h4>Warto zapamiętać</h4><ol>${takeaways}</ol>` : ''}
${race ? `<h4>Kto prowadzi</h4><table class="race"><tbody>${race}</tbody></table>` : ''}`;
}

export function renderReader(edition, profilesById, page, { feedback = false, ratings = {}, terms = {} } = {}) {
  const e = edition;
  const pages = readerPages(e);
  const total = pages.length;
  const sections = pages
    .map((p, i) => {
      const prev = pages[i - 1];
      const next = pages[i + 1];
      const body = p.kind === 'story' ? storyBody(p.story, profilesById, terms) : supplementBody(e[p.kind], SUPPLEMENT_LABELS[p.kind]);
      const fb = feedback && p.kind === 'story' ? feedbackBlock(p.n, ratings[p.n] || '') : '';
      const nav = `<nav class="page-nav">${prev ? `<button class="prev" data-go="${prev.n}">‹ ${escapeHtml(pageTitle(e, prev))}</button>` : '<span></span>'}${next ? `<button class="next" data-go="${next.n}">${escapeHtml(pageTitle(e, next))} ›</button>` : ''}</nav>`;
      return `<section class="page" data-n="${p.n}"><div class="page-inner">${body}${fb}${nav}</div></section>`;
    })
    .join('');
  return `<div class="reader" data-page="${escapeHtml(page)}">
<header class="reader-bar"><a class="back" href="#/${escapeHtml(e.date)}" aria-label="${escapeHtml(backLabel(e.date))}">Prasa AI</a><span class="count">${escapeHtml(page)} / ${total}</span></header>
<div class="progress"><span></span></div>
<button class="arrow arrow-prev" data-step="-1" aria-label="poprzednia strona">‹</button>
<div class="pages">${sections}</div>
<button class="arrow arrow-next" data-step="1" aria-label="następna strona">›</button>
</div>`;
}

// Browser only. Scrolls to the page, reports the visible page, handles buttons and arrow keys.
// Returns a function that removes the listeners.
export function initReader(root, { page, onPage }) {
  const strip = root.querySelector('.pages');
  const list = [...strip.querySelectorAll('.page')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = page;
  const go = (n, smooth) => {
    const el = list[n - 1];
    if (el) strip.scrollTo({ left: el.offsetLeft, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  };
  // Counter and progress line in the reader bar follow the visible page.
  const count = root.querySelector('.reader-bar .count');
  const bar = root.querySelector('.progress span');
  const mark = (n) => {
    if (count) count.textContent = `${n} / ${list.length}`;
    if (bar) bar.style.width = `${(n / Math.max(list.length, 1)) * 100}%`;
  };
  mark(page);
  go(page, false);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const n = Number(entry.target.dataset.n);
        if (n !== current) {
          current = n;
          mark(n);
          onPage(n);
        }
      }
    },
    { root: strip, threshold: 0.6 },
  );
  list.forEach((el) => observer.observe(el));
  const onClick = (event) => {
    const target = event.target.closest('[data-go],[data-step]');
    if (!target) return;
    go(target.dataset.go ? Number(target.dataset.go) : current + Number(target.dataset.step), true);
  };
  const onKey = (event) => {
    if (isTypingTarget(event.target)) return;
    if (event.key === 'ArrowRight') go(current + 1, true);
    if (event.key === 'ArrowLeft') go(current - 1, true);
  };
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  return () => {
    observer.disconnect();
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
}

// Keys typed into a note must not turn pages.
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toUpperCase();
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || el.isContentEditable === true;
}

const _MONTHS_GENITIVE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

function backLabel(dateStr) {
  const p = dateParts(dateStr);
  return p ? `Wróć do wydania z ${p.day} ${_MONTHS_GENITIVE[p.month - 1]}` : 'Wróć do wydania';
}

