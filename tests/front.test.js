import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFront } from '../site/js/front.js';
import { imageFigure, escapeHtml as escapeText } from '../site/js/render.js';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const real = () => load('./fixtures/edition-2026-11-19.json');
const sample = () => load('./fixtures/edition-2026-11-18.json');
const count = (html, needle) => html.split(needle).length - 1;

test('front page links the lead and every story to its reader page', () => {
  const e = real();
  const html = renderFront(e, {});
  assert.match(html, /<a class="lead-card" href="#\/2026-11-19\/1">/);
  e.stories.forEach((s, i) => {
    assert.ok(html.includes(`href="#/2026-11-19/${i + 2}"`), `link for story ${i + 2}`);
  });
  assert.ok(html.includes('Anthropic debiutuje na Nasdaq'));
});

test('front page shows four market tiles, the basket and the disclaimer', () => {
  const html = renderFront(real(), {});
  assert.equal(count(html, 'class="tile"'), 4);
  assert.match(html, /<details class="basket">[\s\S]*<table/);
  assert.ok(html.includes('To nie jest porada inwestycyjna.'));
  assert.ok(html.includes('CoreWeave'));
  assert.ok(html.includes('−21,29%'));
});

test('front page of an edition without images has no image frames', () => {
  assert.equal(count(renderFront(real(), {}), '<figure'), 0);
});

test('front page shows the reading time label', () => {
  assert.ok(renderFront(real(), {}).includes('ok. 19 min'));
});

test('front page of the old sample edition renders with the ranking commentary fallback', () => {
  const e = sample();
  const html = renderFront(e, {});
  assert.ok(html.includes(e.rankings.commentary));
  assert.ok(html.includes(e.lead_story.title));
});

test('story images render with credits, and only https URLs are used', () => {
  const e = real();
  e.lead_story.image = { url: 'https://img.example/a.jpg', credit: 'CNBC', link: 'https://cnbc.com/x' };
  e.stories[0].image = { url: 'javascript:alert(1)', credit: 'x', link: '' };
  e.stories[1].image = { url: 'http://img.example/b.jpg', credit: 'y', link: '' };
  e.stories[2].image = null;
  e.stories[2].image_fallback = { url: 'https://upload.wikimedia.org/wikipedia/commons/a.png', credit: 'Jan K / CC BY-SA 4.0, Wikimedia Commons', link: '' };
  const html = renderFront(e, {});
  assert.ok(html.includes('src="https://img.example/a.jpg"'));
  assert.ok(html.includes('fot. CNBC'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('http://img.example'));
  assert.ok(html.includes('src="https://upload.wikimedia.org/wikipedia/commons/a.png"'));
});

test('imageFigure keeps the fallback for the browser to swap in and links the hero credit when asked', () => {
  const fig = imageFigure({ url: 'https://a.example/1.jpg', credit: 'The Verge', link: 'https://theverge.com/x' }, { url: 'https://upload.wikimedia.org/wikipedia/commons/b.png', credit: 'Commons' }, { size: 'hero', link: true });
  assert.match(fig, /<figure class="img img-hero">/);
  assert.match(fig, /loading="lazy"/);
  assert.match(fig, /data-fallback="https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/b\.png"/);
  assert.match(fig, /data-fallback-credit="Commons"/);
  assert.match(fig, /fot\. <a href="https:\/\/theverge\.com\/x"[^>]*>The Verge<\/a>/);
  assert.equal(imageFigure(null, null, { size: 'thumb' }), '');
  assert.doesNotMatch(imageFigure({ url: 'https://a.example/1.jpg', credit: 'x' }, null, { size: 'thumb' }), /figcaption/);
});

test('front page escapes story titles', () => {
  const e = real();
  e.stories[0].title = '<b>x</b>';
  const html = renderFront(e, {});
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>x</b>'));
});

test('front page shows follow-ups, the Poznaj card with its image, rumors and the credits', () => {
  const e = real();
  e.follow_ups = [{ entity_id: 'nvda', move: '−13%', related_story: 'Nvidia po wynikach', story_date: '2026-11-17' }];
  e.rumors = [{ title: 'Firma Q szykuje premierę', body: 'Dwa źródła.', sources: [] }];
  e.spotlight = { company_id: 'nvda', model_id: null };
  const profiles = { nvda: { id: 'nvda', type: 'company', name: 'NVIDIA', summary: 'Producent GPU. Lider rynku.', image: { url: 'https://upload.wikimedia.org/wikipedia/commons/n.png', credit: 'c', link: '' } } };
  const html = renderFront(e, profiles);
  assert.ok(html.includes('Sprawdzamy'));
  assert.ok(html.includes('Nvidia po wynikach'));
  assert.ok(html.includes('Firma Q szykuje premierę'));
  assert.match(html, /class="poznaj" data-entity="nvda"/);
  assert.ok(html.includes('Producent GPU.'));
  assert.ok(html.includes('class="img img-round"'));
  assert.ok(html.includes('Artificial Analysis'));
});

test('front page shows a supplement card that links to its reader page', () => {
  const e = real();
  e.weekly = { title: 'Tydzień w AI: Google prowadzi', body: 'Pierwsze zdanie. Drugie.', takeaways: [], race_map: [] };
  const html = renderFront(e, {});
  assert.ok(html.includes(`href="#/2026-11-19/${e.stories.length + 2}"`));
  assert.ok(html.includes('Tydzień w AI: Google prowadzi'));
});

test('the masthead carries the navigation with the edition marked as current', () => {
  const html = renderFront(real(), {});
  assert.ok(html.includes('class="mast-nav"'));
  assert.match(html, /<a href="#\/"[^>]*aria-current="page"[^>]*>Wydanie/);
  assert.ok(html.includes('href="#/archiwum"'));
  assert.match(html, /class="dateline"/);
});

test('the page has no separate top bar any more', () => {
  const index = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(index, /topbar/);
});

test('the company card has a close cross at the top instead of a button at the bottom', () => {
  const index = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const dialog = index.slice(index.indexOf('<dialog id="profile-dialog"'), index.indexOf('</dialog>'));
  assert.ok(dialog.includes('<button type="button" class="sheet-close" aria-label="Zamknij">×</button>'));
  assert.ok(dialog.indexOf('sheet-close') < dialog.indexOf('id="profile-body"'));
  assert.ok(!index.includes('method="dialog"'));
});

const areaRow = (rank, model, delta = null) => ({ rank, model, org: 'org' + rank, delta });
function withAreas() {
  const e = real();
  e.rankings.notes = [{ board: 'aa', text: 'Notatka redakcji o AA.' }];
  e.rankings.areas = [
    { key: 'webdev', label: 'Programowanie', new_leader: false, rows: [areaRow(1, 'Fable'), areaRow(2, 'Opus', 2), areaRow(3, 'Sonnet', -1), areaRow(4, 'Newbie', 'new'), areaRow(5, 'Five'), areaRow(6, 'Six'), areaRow(7, 'Seven')] },
    { key: 'polish', label: 'Po polsku', new_leader: true, rows: [areaRow(1, 'Argon'), areaRow(2, '<script>x</script>')] },
  ];
  return e;
}
const rankingsHtml = (html) => html.slice(html.indexOf('<section class="rankings">'), html.indexOf('</section>', html.indexOf('<section class="rankings">')));
const areaList = (html, key) => {
  const start = html.indexOf(`data-area="${key}"`, html.indexOf('class="area-list"'));
  return html.slice(html.lastIndexOf('<ol', start), html.indexOf('</ol>', start));
};

test('rankings show area pills and the top five of the chosen area', () => {
  const html = rankingsHtml(renderFront(withAreas(), {}));
  assert.ok(html.includes('<h3>Rankingi</h3>'));
  assert.equal(count(html, 'class="chip area-chip"'), 2);
  assert.match(html, /<button type="button" class="chip area-chip" data-area="webdev" aria-pressed="true">Programowanie<\/button>/);
  assert.match(html, /<button type="button" class="chip area-chip" data-area="polish" aria-pressed="false">Po polsku<\/button>/);
  const web = areaList(html, 'webdev');
  assert.ok(!web.includes(' hidden'));
  assert.equal(count(web, '<li>'), 5);
  assert.ok(web.includes('▲2') && web.includes('▼1') && web.includes('nowy'));
  assert.ok(!web.includes('Six'));
  const pl = areaList(html, 'polish');
  assert.ok(pl.includes(' hidden'));
  assert.ok(pl.includes('nowy lider'));
  assert.ok(pl.includes('&lt;script&gt;') && !pl.includes('<script>'));
  assert.ok(!html.includes('class="changes"'));
  assert.match(html, /<details class="full"><summary>Pokaż pełne rankingi<\/summary>[\s\S]*Notatka redakcji o AA\./);
});

test('rankings open the remembered area and ignore an unknown one', () => {
  const pl = rankingsHtml(renderFront(withAreas(), {}, { area: 'polish' }));
  assert.match(pl, /data-area="polish" aria-pressed="true"/);
  assert.ok(areaList(pl, 'webdev').includes(' hidden'));
  assert.ok(!areaList(pl, 'polish').includes(' hidden'));
  const bad = rankingsHtml(renderFront(withAreas(), {}, { area: '"><img src=x>' }));
  assert.match(bad, /data-area="webdev" aria-pressed="true"/);
  assert.ok(!bad.includes('<img src=x>'));
});

test('old editions without areas keep the notes visible and drop the moves list', () => {
  const empty = real();
  empty.rankings.areas = [];
  for (const e of [sample(), empty]) {
    const html = rankingsHtml(renderFront(e, {}));
    assert.ok(!html.includes('area-chip'), e.date);
    assert.ok(!html.includes('class="changes"'), e.date);
    const first = e.rankings.notes && e.rankings.notes.length ? e.rankings.notes[0].text : e.rankings.commentary.trim();
    const at = html.indexOf(escapeText(first));
    assert.ok(at > -1 && at < html.indexOf('<details class="full">'), e.date);
  }
});

test('follow-ups show one line per company, at most three, with a readable date', () => {
  const e = real();
  e.follow_ups = [
    { entity_id: 'googl', move: '−3,5%', related_story: 'Genie 4', story_date: '2026-11-18' },
    { entity_id: 'googl', move: '−8,7%', related_story: 'Genie 4', story_date: '2026-11-18' },
    { entity_id: 'nvda', move: '−3,3%', related_story: 'Intel 18A', story_date: '2026-11-15' },
    { entity_id: 'amzn', move: '−3,9%', related_story: 'Intel 18A', story_date: '2026-11-18' },
    { entity_id: 'meta', move: '−3,3%', related_story: 'Muse', story_date: '2026-11-18' },
  ];
  const html = renderFront(e, {});
  const block = html.slice(html.indexOf('class="follow-ups"'), html.indexOf('</section>', html.indexOf('class="follow-ups"')));
  assert.equal(count(block, '<li>'), 3);
  assert.equal(count(block, 'Genie 4'), 1);
  assert.ok(block.includes('z wczoraj') || block.includes('wczoraj'));
  assert.ok(block.includes('15 lis'));
  assert.ok(!block.includes('2026-11-'));
});

test('market dates and tile periods are written for people', () => {
  const html = renderFront(real(), {});
  const market = html.slice(html.indexOf('class="market"'), html.indexOf('</section>', html.indexOf('class="market"')));
  assert.ok(!/notowania z [0-9]{4}-/.test(market), "no ISO date in the market header");
  assert.match(market, /notowania z (pn|wt|śr|czw|pt|sob|ndz) [0-9]{1,2} [a-zźż]{3}/);
  assert.ok(market.includes('7 dni'));
  assert.ok(!market.includes('>7d<'));
});
