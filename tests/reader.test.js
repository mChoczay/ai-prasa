import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRoute, clampPage, renderReader } from '../site/js/reader.js';

const real = () => JSON.parse(readFileSync(new URL('./fixtures/edition-2026-11-19.json', import.meta.url), 'utf8'));
const count = (html, needle) => html.split(needle).length - 1;
const profiles = { nvda: { id: 'nvda', name: 'NVIDIA' } };

test('parseRoute reads the front page, reader pages and the archive', () => {
  assert.deepEqual(parseRoute('#/2026-11-19/3'), { view: 'reader', date: '2026-11-19', page: 3, category: null });
  assert.deepEqual(parseRoute('#/'), { view: 'front', date: null, page: null, category: null });
  assert.deepEqual(parseRoute(''), { view: 'front', date: null, page: null, category: null });
  assert.deepEqual(parseRoute('#/2026-11-19'), { view: 'front', date: '2026-11-19', page: null, category: null });
  assert.deepEqual(parseRoute('#/archiwum?kat=modele'), { view: 'archive', date: null, page: null, category: 'modele' });
  assert.deepEqual(parseRoute('#/2026-11-19/abc'), { view: 'front', date: '2026-11-19', page: null, category: null });
});

test('clampPage keeps deep links inside the edition', () => {
  assert.equal(clampPage(12, 7), 7);
  assert.equal(clampPage(0, 7), 1);
  assert.equal(clampPage(3, 7), 3);
  assert.equal(clampPage(NaN, 7), 1);
});

test('the reader has one page per story with counters and neighbour buttons', () => {
  const e = real();
  const html = renderReader(e, profiles, 2);
  const total = 1 + e.stories.length;
  assert.equal(count(html, 'class="page"'), total);
  assert.ok(html.includes(`2 / ${total}`));
  assert.ok(html.includes('href="#/2026-11-19"'));
  const first = html.slice(html.indexOf('data-n="1"'), html.indexOf('data-n="2"'));
  assert.doesNotMatch(first, /class="prev"/);
  assert.match(first, /class="next"[^>]*data-go="2"/);
  assert.ok(first.includes(e.stories[0].title));
  const last = html.slice(html.indexOf(`data-n="${total}"`));
  assert.doesNotMatch(last, /class="next"/);
});

test('reader pages show status, chips, the disclaimer and http(s)-only sources, escaped', () => {
  const e = real();
  e.lead_story.title = '<img src=x onerror=alert(1)>';
  e.lead_story.may_affect = ['nvda'];
  e.lead_story.sources = [
    { name: 'Zły link', url: 'javascript:alert(1)', primary: false },
    { name: 'Dobry link', url: 'https://example.com/ok', primary: true },
  ];
  const html = renderReader(e, profiles, 1);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.match(html, /class="badge status-potwierdzone"/);
  assert.match(html, /Może dotyczyć: <button class="entity" data-entity="nvda">NVIDIA<\/button>/);
  assert.ok(html.includes('To nie jest porada inwestycyjna.'));
  assert.ok(!html.includes('javascript:'));
  assert.match(html, /href="https:\/\/example\.com\/ok"/);
  assert.match(html, /Dla Ciebie/);
});

test('the reader adds the weekly supplement as a last page with its paragraphs and takeaways', () => {
  const e = real();
  e.weekly = { title: 'Tydzień pełen premier', body: 'Akapit pierwszy.\n\nAkapit drugi.', takeaways: ['a', 'b', 'c'], race_map: [{ area: 'kod', leader: 'Firma X', note: 'n' }] };
  const html = renderReader(e, profiles, 1);
  const last = html.slice(html.lastIndexOf('class="page"'));
  assert.ok(last.includes('Tydzień w AI'));
  assert.ok(last.includes('<p>Akapit drugi.</p>'));
  assert.ok(last.includes('Warto zapamiętać'));
  assert.ok(last.includes('Firma X'));
});

test('reader hero images link their credit to the source', () => {
  const e = real();
  e.lead_story.image = { url: 'https://img.example/a.jpg', credit: 'The Verge', link: 'https://theverge.com/x' };
  const html = renderReader(e, profiles, 1);
  assert.match(html, /fot\. <a href="https:\/\/theverge\.com\/x"[^>]*>The Verge<\/a>/);
});
