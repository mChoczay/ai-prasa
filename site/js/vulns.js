// The "Luki" page: the vulnerability log from data/luki.json with filters, search and sorting.
import { escapeHtml, mastheadNav } from './render.js';
import { dateParts } from './shape.js';

export const VULN_DEFAULTS = Object.freeze({ status: 'all', severity: 'all', q: '', sort: 'newest', showPatched: false });

const SEVERITY_ORDER = Object.freeze({ krytyczna: 0, wysoka: 1, średnia: 2, niska: 3 });
const SEVERITY_CLASS = Object.freeze({ krytyczna: 'crit', wysoka: 'high', średnia: 'mid', niska: 'low' });
const STATUS_PILLS = [['all', 'Wszystkie'], ['open', 'Niezałatane'], ['patched', 'Załatane']];
const SEVERITY_PILLS = [['all', 'Każda'], ['krytyczna', 'Krytyczna'], ['wysoka', 'Wysoka'], ['średnia', 'Średnia'], ['niska', 'Niska'], ['unknown', 'Nieznana']];
const SORT_PILLS = [['newest', 'Najnowsze'], ['severity', 'Najpoważniejsze'], ['product', 'A–Z']];

const rank = (v) => (v.severity in SEVERITY_ORDER ? SEVERITY_ORDER[v.severity] : 4);
const newest = (a, b) => String(b.first_date || '').localeCompare(String(a.first_date || '')) || String(a.cve_id).localeCompare(String(b.cve_id));

export function filterVulns(vulns, state) {
  const s = { ...VULN_DEFAULTS, ...(state || {}) };
  const q = String(s.q || '').trim().toLowerCase();
  return (vulns || []).filter((v) => {
    if (!v) return false;
    if (s.status !== 'all' && v.status !== s.status) return false;
    if (s.severity === 'unknown' ? v.severity in SEVERITY_ORDER : s.severity !== 'all' && v.severity !== s.severity) return false;
    return !q || [v.product, v.cve_id, v.summary].some((f) => String(f || '').toLowerCase().includes(q));
  });
}

export function sortVulns(vulns, sort) {
  const list = [...(vulns || [])];
  if (sort === 'severity') return list.sort((a, b) => rank(a) - rank(b) || newest(a, b));
  if (sort === 'product') return list.sort((a, b) => String(a.product || '').localeCompare(String(b.product || ''), 'pl', { sensitivity: 'base' }) || newest(a, b));
  return list.sort(newest);
}

function shortDay(dateStr) {
  const p = dateParts(String(dateStr || '').slice(0, 10));
  return p ? `${p.day} ${p.monthShort}` : '';
}

function openLabel(n) {
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  if (n === 1) return '1 niezałatana';
  return `${n} ${last >= 2 && last <= 4 && !teen ? 'niezałatane' : 'niezałatanych'}`;
}

function item(v) {
  const status = v.status === 'patched'
    ? `<span class="pill vuln-patched">${v.fixed_in ? `załatana od ${escapeHtml(v.fixed_in)}` : 'załatana'}</span>`
    : '<span class="pill vuln-open">niezałatana</span>';
  const sev = `<span class="pill sev sev-${SEVERITY_CLASS[v.severity] || 'none'}">${escapeHtml(v.severity in SEVERITY_ORDER ? v.severity : 'nieznana')}</span>`;
  const meta = [shortDay(v.first_date), v.checked_at ? `sprawdzono ${shortDay(v.checked_at)}` : ''].filter(Boolean);
  const story = v.story || {};
  if (story.date && Number(story.n) > 0) meta.push(`<a href="#/${escapeHtml(story.date)}/${escapeHtml(story.n)}">czytaj artykuł ›</a>`);
  return `<article class="vuln"><p class="vuln-tags">${status}${sev}</p><h3>${escapeHtml(v.product)} · ${escapeHtml(v.cve_id)}</h3><p>${escapeHtml(v.summary)}</p><p class="vuln-meta">${meta.join(' · ')}</p></article>`;
}

// The list alone, so typing in the search box can redraw it without touching the input.
export function renderVulnList(data, state) {
  const s = { ...VULN_DEFAULTS, ...(state || {}) };
  const all = (data && Array.isArray(data.vulns) ? data.vulns : []).filter(Boolean);
  if (!all.length) return '<p class="no-data">Na razie żadnych luk w dzienniku.</p>';
  const shown = sortVulns(filterVulns(all, s), s.sort);
  if (!shown.length) return '<p class="no-data">Nic nie pasuje do filtrów.</p>';
  if (s.status !== 'all') return shown.map(item).join('');
  const open = shown.filter((v) => v.status !== 'patched');
  const patched = shown.filter((v) => v.status === 'patched');
  const fold = patched.length ? `<details class="patched"${s.showPatched ? ' open' : ''}><summary>Pokaż załatane (${patched.length})</summary>${patched.map(item).join('')}</details>` : '';
  return open.map(item).join('') + fold;
}

function pills(kind, options, current, attr) {
  return options
    .map(([value, label]) => `<button type="button" class="chip" ${attr}="${kind ? `${kind}:` : ''}${escapeHtml(value)}" aria-pressed="${value === current}">${label}</button>`)
    .join('');
}

export function renderVulns(data, state) {
  const s = { ...VULN_DEFAULTS, ...(state || {}) };
  const all = (data && Array.isArray(data.vulns) ? data.vulns : []).filter(Boolean);
  const open = all.filter((v) => v.status !== 'patched').length;
  return `<section class="vulns"><header class="masthead"><h1>Poranna prasa AI</h1>${mastheadNav('vulns')}</header>
<h2 class="vulns-head">Luki · ${openLabel(open)}</h2>
<div class="vuln-controls">
<div class="chips" role="group" aria-label="Status">${pills('status', STATUS_PILLS, s.status, 'data-vf')}</div>
<div class="chips" role="group" aria-label="Powaga">${pills('severity', SEVERITY_PILLS, s.severity, 'data-vf')}</div>
<input type="search" class="vuln-search" data-vq placeholder="Szukaj programu lub CVE" aria-label="Szukaj programu lub CVE" value="${escapeHtml(s.q)}">
<div class="chips" role="group" aria-label="Sortowanie">${pills('', SORT_PILLS, s.sort, 'data-vs')}</div>
</div>
<div class="vuln-list">${renderVulnList(data, s)}</div>
<p class="vuln-agent"><a href="data/luki.md">plik dla agenta</a></p></section>`;
}
