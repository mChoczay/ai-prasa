// Pure renderers for the "Poranna prasa AI" newspaper. Every value from data goes through escapeHtml.

const CATEGORY_LABELS = Object.freeze({
  modele: 'modele',
  gielda: 'giełda',
  inwestycje: 'inwestycje',
  rankingi: 'rankingi',
  narzedzia: 'narzędzia',
  regulacje: 'regulacje',
  przecieki: 'przecieki',
  inne: 'inne',
});
const WHY_LABELS = Object.freeze({ fakt: 'fakt', hipoteza: 'hipoteza', brak: 'brak jednoznacznej przyczyny' });
const BOARDS = Object.freeze([
  ['lmarena', 'LMArena'],
  ['aa', 'Artificial Analysis'],
  ['hf_trending', 'Hugging Face (trending)'],
]);
const NO_DATA = '<p class="no-data">dane niedostępne</p>';

export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

function longDate(dateStr) {
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

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return { text: '–', cls: 'flat' };
  const v = round2(n);
  const body = `${v.toFixed(2).replace('.', ',')}%`;
  if (v === 0) return { text: body, cls: 'flat' };
  return n > 0 ? { text: `+${body}`, cls: 'up' } : { text: `−${body}`, cls: 'down' };
}

function statusBadge(status) {
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function categoryBadge(category) {
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

function sourcesList(sources) {
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

function story(s, profilesById, { lead = false } = {}) {
  const chips = (s.may_affect || []).map((id) => entityChip(id, profilesById)).join(' ');
  return `<section class="story${lead ? ' lead' : ''}">
<div class="badges">${categoryBadge(s.category)}${statusBadge(s.status)}${s.is_update ? '<span class="badge update">aktualizacja</span>' : ''}</div>
<h${lead ? 2 : 3} class="title">${escapeHtml(s.title)}</h${lead ? 2 : 3}>
<p class="lede">${escapeHtml(s.lede)}</p>
${paragraphs(s.body)}
<p class="for-you"><strong>Co to znaczy dla Ciebie:</strong> ${escapeHtml(s.for_you)}</p>
${chips ? `<p class="may-affect">Może dotyczyć: ${chips}</p>` : ''}
${s.disclaimer ? `<p class="disclaimer">${escapeHtml(s.disclaimer)}</p>` : ''}
${sourcesList(s.sources)}
</section>`;
}

export function renderMarket(market) {
  if (!market || !Array.isArray(market.rows) || !market.rows.length) {
    return `<section class="market"><h3>Rynek</h3>${NO_DATA}</section>`;
  }
  const dates = market.rows.map((r) => r.last_trade_date).filter(Boolean).sort();
  const asOf = dates.length ? dates[dates.length - 1] : '';
  const rows = market.rows
    .map((r) => {
      const d1 = pct(r.change_1d);
      const d7 = pct(r.change_7d);
      const d30 = pct(r.change_30d);
      return `<tr><td>${escapeHtml(r.name)}</td><td class="${d1.cls}">${d1.text}</td><td class="${d7.cls}">${d7.text}</td><td class="${d30.cls}">${d30.text}</td></tr>`;
    })
    .join('');
  return `<section class="market"><h3>Rynek</h3>
<p class="meta">notowania z ${escapeHtml(asOf)}</p>
<table><thead><tr><th>Spółka</th><th>1 d</th><th>7 d</th><th>30 d</th></tr></thead><tbody>${rows}</tbody></table>
${market.commentary ? `<p>${escapeHtml(market.commentary)}</p>` : ''}
${market.disclaimer ? `<p class="disclaimer">${escapeHtml(market.disclaimer)}</p>` : ''}
</section>`;
}

function delta(d) {
  if (d === 'new') return '<span class="up">nowy</span>';
  if (typeof d !== 'number' || d === 0) return '';
  return d > 0 ? `<span class="up">▲ ${d}</span>` : `<span class="down">▼ ${Math.abs(d)}</span>`;
}

export function renderRankings(rankings) {
  const r = rankings || {};
  const boards = BOARDS.map(([key, label]) => {
    const list = r[key];
    if (!Array.isArray(list) || !list.length) return `<h4>${label}</h4>${NO_DATA}`;
    const items = list
      .slice(0, 10)
      .map((row) => `<li><span class="rank">#${escapeHtml(row.rank)}</span> ${escapeHtml(row.model)} <span class="org">${escapeHtml(row.org)}</span> ${delta(row.delta)}</li>`)
      .join('');
    return `<h4>${label}</h4><ol class="board">${items}</ol>`;
  }).join('');
  return `<section class="rankings"><h3>Rankingi</h3>${boards}${r.commentary ? `<p>${escapeHtml(r.commentary)}</p>` : ''}</section>`;
}

function bigMoves(moves, profilesById) {
  if (!moves || !moves.length) return '';
  const items = moves
    .map(
      (m) => `<li>${entityChip(m.entity_id, profilesById)} <strong>${escapeHtml(m.change)}</strong>
<p class="why why-${escapeHtml(m.why_type)}"><span class="why-label">Dlaczego? (${escapeHtml(WHY_LABELS[m.why_type] || m.why_type)})</span> ${escapeHtml(m.why)}</p>${sourcesList(m.sources)}</li>`,
    )
    .join('');
  return `<section class="big-moves"><h3>Duże ruchy</h3><ul>${items}</ul></section>`;
}

function followUps(items, profilesById) {
  if (!items || !items.length) return '';
  const lis = items
    .map(
      (f) =>
        `<li>${entityChip(f.entity_id, profilesById)} ${escapeHtml(f.move)}: pamiętasz „${escapeHtml(f.related_story)}” z ${escapeHtml(f.story_date)}?</li>`,
    )
    .join('');
  return `<section class="follow-ups"><h3>Sprawdzamy</h3><ul>${lis}</ul></section>`;
}

function rumors(list) {
  const items = (list || [])
    .map((r) => `<li>${statusBadge('plotka')} <strong>${escapeHtml(r.title)}</strong> ${escapeHtml(r.body)}${sourcesList(r.sources)}</li>`)
    .join('');
  return `<section class="rumors"><h3>Plotki i przecieki</h3>${items ? `<ul>${items}</ul>` : '<p class="no-data">Dziś cisza.</p>'}</section>`;
}

export function renderProfileCard(profile) {
  if (!profile) return '';
  const products = Array.isArray(profile.key_products) ? profile.key_products.join(', ') : profile.key_products;
  return `<div class="profile-card">
<h3>${escapeHtml(profile.name)}</h3>
<p>${escapeHtml(profile.summary)}</p>
${profile.owner ? `<p><strong>Kto:</strong> ${escapeHtml(profile.owner)}</p>` : ''}
${products ? `<p><strong>Produkty:</strong> ${escapeHtml(products)}</p>` : ''}
${profile.why_it_matters ? `<p><strong>Dlaczego ważne:</strong> ${escapeHtml(profile.why_it_matters)}</p>` : ''}
<p class="meta">stan na ${escapeHtml(profile.updated_at)}</p>
</div>`;
}

function spotlight(sp, profilesById) {
  if (!sp) return '';
  const cards = [sp.company_id, sp.model_id]
    .filter(Boolean)
    .map((id) => renderProfileCard(profilesById && profilesById[id]))
    .join('');
  return cards ? `<section class="spotlight"><h3>Poznaj</h3>${cards}</section>` : '';
}

function period(p, label) {
  if (!p) return '';
  const takeaways = (p.takeaways || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const race = (p.race_map || [])
    .map((r) => `<tr><td>${escapeHtml(r.area)}</td><td>${escapeHtml(r.leader)}</td><td>${escapeHtml(r.note)}</td></tr>`)
    .join('');
  return `<section class="supplement"><p class="kicker">${label}</p><h2>${escapeHtml(p.title)}</h2>${paragraphs(p.body)}
${takeaways ? `<h4>Warto zapamiętać</h4><ol>${takeaways}</ol>` : ''}
${race ? `<h4>Kto prowadzi</h4><table><tbody>${race}</tbody></table>` : ''}</section>`;
}

export function renderEdition(edition, profilesById) {
  const e = edition;
  const stories = (e.stories || []).map((s) => story(s, profilesById)).join('');
  return `<article class="edition">
<header class="masthead"><h1>Poranna prasa AI</h1>
<p class="meta">${escapeHtml(longDate(e.date))} · ok. ${escapeHtml(e.minutes)} min czytania${e.quiet_day ? ' · spokojny dzień' : ''}</p></header>
<p class="greeting">${escapeHtml(e.greeting)}</p>
<div class="columns">
<div class="main">${e.lead_story ? story(e.lead_story, profilesById, { lead: true }) : ''}${stories}</div>
<aside class="side">${renderMarket(e.market)}${bigMoves(e.big_moves, profilesById)}${followUps(e.follow_ups, profilesById)}${renderRankings(e.rankings)}${rumors(e.rumors)}${spotlight(e.spotlight, profilesById)}</aside>
</div>
${period(e.weekly, 'Tydzień w AI')}${period(e.monthly, 'Miesiąc w AI')}
${e.closing ? `<p class="closing">${escapeHtml(e.closing)}</p>` : ''}
</article>`;
}

export function renderArchive(index, { category = null } = {}) {
  const editions = ((index && index.editions) || []).filter((ed) => !category || (ed.categories || []).includes(category));
  const filters = ['<a href="#/archiwum">wszystkie</a>']
    .concat(Object.entries(CATEGORY_LABELS).map(([key, label]) => `<a href="#/archiwum?kat=${key}"${key === category ? ' class="active"' : ''}>${label}</a>`))
    .join(' ');
  const items = editions
    .map(
      (ed) =>
        `<li><a href="#/${escapeHtml(ed.date)}">${escapeHtml(ed.date)} · ${escapeHtml(ed.lead_title)}</a> <span class="meta">${escapeHtml(ed.minutes)} min${ed.kind && ed.kind !== 'daily' ? ` · ${escapeHtml(ed.kind)}` : ''}</span></li>`,
    )
    .join('');
  return `<section class="archive"><h2>Archiwum</h2><nav class="filters">${filters}</nav>${items ? `<ul>${items}</ul>` : '<p class="no-data">Brak wydań w tej kategorii.</p>'}</section>`;
}
