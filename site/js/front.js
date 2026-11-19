// The front page: a scannable overview. Stories link to the reader (#/<date>/<n>).
import {
  escapeHtml,
  longDate,
  pct,
  statusBadge,
  sourcesList,
  entityChip,
  imageFigure,
  marketTable,
  asOfDate,
  rankingBoards,
  CATEGORY_LABELS,
  WHY_LABELS,
  BOARDS,
  NO_DATA,
  DISCLAIMER,
  CREDITS,
} from './render.js';
import { firstSentence, marketMood, marketTiles, rankingChanges, rankingNotes, readerPages, minutesLabel } from './shape.js';

const BOARD_LABELS = Object.fromEntries(BOARDS);

function topicsLabel(n) {
  if (n === 1) return '1 temat';
  const last = n % 10;
  const teen = n % 100 >= 12 && n % 100 <= 14;
  return `${n} ${last >= 2 && last <= 4 && !teen ? 'tematy' : 'tematów'}`;
}

function kicker(story, extra = '') {
  return `<span class="kicker">${escapeHtml(CATEGORY_LABELS[story.category] || story.category)}${extra}</span>`;
}

function leadCard(story, date) {
  return `<a class="lead-card" href="#/${escapeHtml(date)}/1">${imageFigure(story.image, story.image_fallback, { size: 'hero' })}
${kicker(story, ' · czołówka')}<h2>${escapeHtml(story.title)}</h2><p class="lede">${escapeHtml(story.lede)}</p></a>`;
}

function storyRow(story, date, n) {
  return `<li><a class="story-row" href="#/${escapeHtml(date)}/${n}">${imageFigure(story.image, story.image_fallback, { size: 'thumb' })}
<div>${kicker(story)}<h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.lede)}</p></div></a></li>`;
}

function tile(t) {
  const c = pct(t.change);
  const type = escapeHtml(t.why_type);
  return `<details class="tile"><summary><span class="t-head"><span class="t-name">${escapeHtml(t.name)}</span><span class="t-chg ${c.cls}">${c.text}</span></span>
<span class="t-per">${escapeHtml(t.period)}</span><span class="t-why"><span class="badge why-${type}">${escapeHtml(WHY_LABELS[t.why_type] || t.why_type)}</span> ${escapeHtml(t.why_short)}</span></summary>
<p>${escapeHtml(t.why)}</p>${sourcesList(t.sources)}</details>`;
}

function marketSection(e) {
  const market = e.market || {};
  const tiles = marketTiles(e).map(tile).join('');
  const asOf = asOfDate(market);
  return `<section class="market"><h3>Rynek${asOf ? ` <span class="as-of">notowania z ${escapeHtml(asOf)}</span>` : ''}</h3>
${marketMood(market) ? `<p class="mood">${escapeHtml(marketMood(market))}</p>` : ''}
${tiles ? `<div class="tiles">${tiles}</div>` : ''}
<details class="basket"><summary>cały koszyk</summary>${marketTable(market)}${market.commentary ? `<p>${escapeHtml(market.commentary)}</p>` : ''}</details>
<p class="disclaimer">${DISCLAIMER}</p></section>`;
}

function changeText(c) {
  if (c.delta === 'new') return `nowość, #${escapeHtml(c.rank)}`;
  return c.delta > 0 ? `<span class="up">awans o ${c.delta}</span>, teraz #${escapeHtml(c.rank)}` : `<span class="down">spadek o ${Math.abs(c.delta)}</span>, teraz #${escapeHtml(c.rank)}`;
}

function rankingsSection(e) {
  const notes = rankingNotes(e)
    .map((n) => `<p class="note">${n.board ? `<b>${escapeHtml(BOARD_LABELS[n.board] || n.board)}:</b> ` : ''}${escapeHtml(n.text)}</p>`)
    .join('');
  const changes = rankingChanges(e)
    .map((c) => {
      const head = `<b>${escapeHtml(c.model)}</b> <span class="org">${escapeHtml(c.org)}</span> · ${escapeHtml(BOARD_LABELS[c.board])}: ${changeText(c)}`;
      return c.why ? `<li><details><summary>${head}${c.why_short ? ` — ${escapeHtml(c.why_short)}` : ''}</summary><p>${escapeHtml(c.why)}</p></details></li>` : `<li>${head}</li>`;
    })
    .join('');
  const hasBoards = BOARDS.some(([key]) => Array.isArray((e.rankings || {})[key]) && e.rankings[key].length);
  return `<section class="rankings"><h3>Rankingi · co się zmieniło</h3>
${notes || (hasBoards ? '' : NO_DATA)}${changes ? `<ul class="changes">${changes}</ul>` : ''}
<details class="full"><summary>pełne rankingi</summary>${rankingBoards(e.rankings)}</details></section>`;
}

function followUps(items, profilesById) {
  if (!items || !items.length) return '';
  const lis = items
    .map((f) => `<li>${entityChip(f.entity_id, profilesById)} ${escapeHtml(f.move)}: pamiętasz „${escapeHtml(f.related_story)}” z ${escapeHtml(f.story_date)}?</li>`)
    .join('');
  return `<section class="follow-ups"><h3>Sprawdzamy</h3><ul>${lis}</ul></section>`;
}

function rumors(list) {
  const items = (list || [])
    .map((r) => `<details class="rumor"><summary>${statusBadge('plotka')} ${escapeHtml(r.title)}</summary><p>${escapeHtml(r.body)}</p>${sourcesList(r.sources)}</details>`)
    .join('');
  return `<section class="rumors"><h3>Plotki i przecieki</h3>${items || '<p class="no-data">Dziś cisza.</p>'}</section>`;
}

function poznaj(spotlight, profilesById) {
  if (!spotlight) return '';
  const cards = [spotlight.company_id, spotlight.model_id]
    .filter(Boolean)
    .map((id) => profilesById && profilesById[id])
    .filter(Boolean)
    .map((p) => `<button class="poznaj" data-entity="${escapeHtml(p.id)}">${imageFigure(p.image, null, { size: 'round' })}<span><b>${escapeHtml(p.name)}</b> ${escapeHtml(firstSentence(p.summary))}</span></button>`)
    .join('');
  return cards ? `<section class="spotlight"><h3>Poznaj</h3>${cards}</section>` : '';
}

function supplementCards(e) {
  return readerPages(e)
    .filter((p) => p.kind !== 'story')
    .map((p) => {
      const s = e[p.kind];
      const label = p.kind === 'weekly' ? 'Tydzień w AI' : 'Miesiąc w AI';
      return `<a class="supp-card" href="#/${escapeHtml(e.date)}/${p.n}"><span class="kicker">${label}</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(firstSentence(s.body))}</p></a>`;
    })
    .join('');
}

export function renderFront(edition, profilesById) {
  const e = edition;
  const stories = e.stories || [];
  const count = (e.lead_story ? 1 : 0) + stories.length;
  const list = stories.map((s, i) => storyRow(s, e.date, i + 2)).join('');
  return `<article class="front">
<header class="masthead"><h1>Poranna prasa AI</h1>
<p class="meta">${escapeHtml(longDate(e.date))} · ${topicsLabel(count)} · ${escapeHtml(minutesLabel(e))}${e.quiet_day ? ' · spokojny dzień' : ''}</p></header>
${e.greeting ? `<p class="greeting">${escapeHtml(e.greeting)}</p>` : ''}
<div class="columns">
<div class="main">${e.lead_story ? leadCard(e.lead_story, e.date) : ''}
${list ? `<ol class="story-list">${list}</ol>` : ''}
${supplementCards(e)}</div>
<aside class="side">${marketSection(e)}${followUps(e.follow_ups, profilesById)}${rankingsSection(e)}${rumors(e.rumors)}${poznaj(e.spotlight, profilesById)}</aside>
</div>
${e.closing ? `<p class="closing">${escapeHtml(e.closing)}</p>` : ''}
${CREDITS}
</article>`;
}
