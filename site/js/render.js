import { dateParts } from './shape.js';
// Shared renderers for the "Poranna prasa AI" newspaper (front page, reader, archive, profile card).
// Every value from data goes through escapeHtml; data URLs are used only when they are https.

export const CATEGORY_LABELS = Object.freeze({
  modele: 'modele',
  gielda: 'giełda',
  inwestycje: 'inwestycje',
  rankingi: 'rankingi',
  narzedzia: 'narzędzia',
  regulacje: 'regulacje',
  przecieki: 'przecieki',
  inne: 'inne',
});
export const WHY_LABELS = Object.freeze({ fakt: 'fakt', hipoteza: 'hipoteza', brak: 'brak przyczyny' });
export const BOARDS = Object.freeze([
  ['lmarena', 'LMArena'],
  ['aa', 'Artificial Analysis'],
  ['hf_trending', 'Hugging Face (trending)'],
]);
export const NO_DATA = '<p class="no-data">dane niedostępne</p>';
export const DISCLAIMER = 'To nie jest porada inwestycyjna.';
export const CREDITS = `<footer class="credits">Dane rankingowe: <a href="https://artificialanalysis.ai/" target="_blank" rel="noopener noreferrer">Artificial Analysis</a> · <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset" target="_blank" rel="noopener noreferrer">LMArena</a> (CC BY 4.0) · <a href="https://huggingface.co/models?sort=trending" target="_blank" rel="noopener noreferrer">Hugging Face</a>. Teksty powstają automatycznie z pomocą AI na podstawie podanych źródeł. Zdjęcia: podglądy artykułów źródłowych i Wikimedia Commons.</footer>`;

export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

export function longDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return escapeHtml(dateStr);
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function round2(n) {
  return Math.round(Number(`${Math.abs(n)}e2`)) / 100;
}

export function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return { text: '–', cls: 'flat' };
  const v = round2(n);
  const body = `${v.toFixed(2).replace('.', ',')}%`;
  if (v === 0) return { text: body, cls: 'flat' };
  return n > 0 ? { text: `+${body}`, cls: 'up' } : { text: `−${body}`, cls: 'down' };
}

export function statusBadge(status) {
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

export function categoryBadge(category) {
  return `<span class="badge cat-${escapeHtml(category)}">${escapeHtml(CATEGORY_LABELS[category] || category)}</span>`;
}

export function entityChip(id, profilesById) {
  const p = profilesById && profilesById[id];
  if (!p) return `<span class="entity-unknown">${escapeHtml(id)}</span>`;
  return `<button class="entity" data-entity="${escapeHtml(id)}">${escapeHtml(p.name)}</button>`;
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function isHttpsUrl(url) {
  return /^https:\/\//i.test(String(url || '').trim());
}

export function sourcesList(sources) {
  if (!sources || !sources.length) return '';
  const links = sources
    .map((s) => {
      const label = `${escapeHtml(s.name)}${s.primary ? ' (źródło pierwotne)' : ''}`;
      return isHttpUrl(s.url)
        ? `<a href="${escapeHtml(s.url.trim())}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : label;
    })
    .join(' · ');
  return `<p class="sources">Źródła: ${links}</p>`;
}

// An image with its fallback (swapped in by app.js when the first one fails). Hero images carry the
// credit; with link: true the credit links to its source (not inside another link).
export function imageFigure(image, fallback, { size = 'thumb', link = false } = {}) {
  const ok = (i) => i && isHttpsUrl(i.url);
  const main = ok(image) ? image : ok(fallback) ? fallback : null;
  if (!main) return '';
  const spare = main === image && ok(fallback) ? fallback : null;
  const spareAttrs = spare ? ` data-fallback="${escapeHtml(spare.url.trim())}" data-fallback-credit="${escapeHtml(spare.credit || '')}"` : '';
  let caption = '';
  if (size === 'hero' && main.credit) {
    const credit = link && isHttpsUrl(main.link) ? `<a href="${escapeHtml(main.link.trim())}" target="_blank" rel="noopener noreferrer">${escapeHtml(main.credit)}</a>` : escapeHtml(main.credit);
    caption = `<figcaption>fot. ${credit}</figcaption>`;
  }
  return `<figure class="img img-${escapeHtml(size)}"><img src="${escapeHtml(main.url.trim())}" loading="lazy" decoding="async" alt=""${spareAttrs}>${caption}</figure>`;
}

export function marketTable(market) {
  if (!market || !Array.isArray(market.rows) || !market.rows.length) return NO_DATA;
  const rows = market.rows
    .map((r) => {
      const d1 = pct(r.change_1d);
      const d7 = pct(r.change_7d);
      const d30 = pct(r.change_30d);
      return `<tr><td>${escapeHtml(r.name)}</td><td class="${d1.cls}">${d1.text}</td><td class="${d7.cls}">${d7.text}</td><td class="${d30.cls}">${d30.text}</td></tr>`;
    })
    .join('');
  return `<table><thead><tr><th>Spółka</th><th>1 d</th><th>7 d</th><th>30 d</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function asOfDate(market) {
  const dates = ((market && market.rows) || []).map((r) => r.last_trade_date).filter(Boolean).sort();
  return (market && market.as_of) || (dates.length ? dates[dates.length - 1] : '');
}

export function renderMarket(market) {
  if (!market || !Array.isArray(market.rows) || !market.rows.length) {
    return `<section class="market"><h3>Rynek</h3>${NO_DATA}</section>`;
  }
  return `<section class="market"><h3>Rynek</h3>
<p class="meta">notowania z ${escapeHtml(asOfDate(market))}</p>
${marketTable(market)}
${market.commentary ? `<p>${escapeHtml(market.commentary)}</p>` : ''}
${market.disclaimer ? `<p class="disclaimer">${escapeHtml(market.disclaimer)}</p>` : ''}
</section>`;
}

function delta(d) {
  if (d === 'new') return '<span class="up">nowy</span>';
  if (typeof d !== 'number' || d === 0) return '';
  return d > 0 ? `<span class="up">▲ ${d}</span>` : `<span class="down">▼ ${Math.abs(d)}</span>`;
}

export function rankingBoards(rankings) {
  const r = rankings || {};
  return BOARDS.map(([key, label]) => {
    const list = r[key];
    if (!Array.isArray(list) || !list.length) return `<h4>${label}</h4>${NO_DATA}`;
    const items = list
      .slice(0, 10)
      .map((row) => `<li><span class="rank">#${escapeHtml(row.rank)}</span> ${escapeHtml(row.model)} <span class="org">${escapeHtml(row.org)}</span> ${delta(row.delta)}</li>`)
      .join('');
    return `<h4>${label}</h4><ol class="board">${items}</ol>`;
  }).join('');
}

export function renderRankings(rankings) {
  const r = rankings || {};
  return `<section class="rankings"><h3>Rankingi</h3>${rankingBoards(r)}${r.commentary ? `<p>${escapeHtml(r.commentary)}</p>` : ''}</section>`;
}

export function renderProfileCard(profile) {
  if (!profile) return '';
  const products = Array.isArray(profile.key_products) ? profile.key_products.join(', ') : profile.key_products;
  return `<div class="profile-card">
${imageFigure(profile.image, null, { size: 'hero', link: true })}
<h3>${escapeHtml(profile.name)}</h3>
<p>${escapeHtml(profile.summary)}</p>
${profile.owner ? `<p><strong>Kto:</strong> ${escapeHtml(profile.owner)}</p>` : ''}
${products ? `<p><strong>Produkty:</strong> ${escapeHtml(products)}</p>` : ''}
${profile.why_it_matters ? `<p><strong>Dlaczego ważne:</strong> ${escapeHtml(profile.why_it_matters)}</p>` : ''}
<p class="meta">stan na ${escapeHtml(profile.updated_at)}</p>
</div>`;
}

const SUPPLEMENT_KINDS = Object.freeze({ weekly: 'Tydzień w AI', monthly: 'Miesiąc w AI' });

// Archive: chips for categories, editions grouped by month (newest first, as in the index), each with
// its day, the lead title and the reading time.
// Every edition, newest first, grouped by month. Old #/archiwum?kat=… links land here too.
export function renderArchive(index) {
  const editions = (index && index.editions) || [];
  const groups = [];
  for (const ed of editions) {
    const key = String(ed.date || '').slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(ed);
    else groups.push({ key, items: [ed] });
  }
  const row = (ed) => {
    const p = dateParts(ed.date);
    const extra = SUPPLEMENT_KINDS[ed.kind] ? ` · ${SUPPLEMENT_KINDS[ed.kind]}` : '';
    const minutes = Number.isFinite(Number(ed.minutes)) && ed.minutes !== '' && ed.minutes != null ? `ok. ${escapeHtml(ed.minutes)} min` : '';
    return `<li><a href="#/${escapeHtml(ed.date)}"><span class="day"><b>${p ? p.day : escapeHtml(ed.date)}</b><small>${p ? p.weekday : ''}</small></span><span class="what"><span class="title">${escapeHtml(ed.lead_title)}</span><span class="meta">${minutes}${extra}</span></span></a></li>`;
  };
  const body = groups
    .map((g) => {
      const p = dateParts(`${g.key}-01`);
      return `<h3 class="month">${p ? `${p.monthName} ${p.year}` : escapeHtml(g.key)}</h3><ul class="days">${g.items.map(row).join('')}</ul>`;
    })
    .join('');
  return `<section class="archive"><header class="masthead"><h1>Poranna prasa AI</h1>${mastheadNav('archive')}</header>
${body || '<p class="no-data">Brak wydań.</p>'}</section>`;
}

// Navigation under the paper's name: the current view is marked for screen readers and styling.
export function mastheadNav(active) {
  const link = (href, label, on) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="mast-nav">${link('#/', 'Wydanie', active === 'edition')}<span aria-hidden="true">·</span>${link('#/archiwum', 'Archiwum', active === 'archive')}</nav>`;
}
