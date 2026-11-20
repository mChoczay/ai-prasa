import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFront } from '../site/js/front.js';
import { imageFigure } from '../site/js/render.js';

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
