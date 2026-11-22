import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRoute, clampPage, renderReader, isTypingTarget } from '../site/js/reader.js';

const real = () => JSON.parse(readFileSync(new URL('./fixtures/edition-2026-11-19.json', import.meta.url), 'utf8'));
const count = (html, needle) => html.split(needle).length - 1;
const profiles = { nvda: { id: 'nvda', name: 'NVIDIA' } };

test('parseRoute reads the front page, reader pages and the archive', () => {
  assert.deepEqual(parseRoute('#/2026-11-19/3'), { view: 'reader', date: '2026-11-19', page: 3, category: null });
  assert.deepEqual(parseRoute('#/'), { view: 'front', date: null, page: null, category: null });
  assert.deepEqual(parseRoute(''), { view: 'front', date: null, page: null, category: null });
  assert.deepEqual(parseRoute('#/2026-11-19'), { view: 'front', date: '2026-11-19', page: null, category: null });
  assert.deepEqual(parseRoute('#/archiwum?kat=modele'), { view: 'archive', date: null, page: null, category: null });
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

test('page 0 in a deep link opens the reader and is clamped to the first page', () => {
  assert.deepEqual(parseRoute('#/2026-11-19/0'), { view: 'reader', date: '2026-11-19', page: 0, category: null });
  assert.equal(clampPage(0, 7), 1);
});

test('parseRoute reads the feedback activation link', () => {
  assert.deepEqual(parseRoute('#/oceny?u=https%3A%2F%2Fx.example%2Fh&k=abc'), { view: 'feedback', date: null, page: null, category: null, url: 'https://x.example/h', key: 'abc', off: false });
  assert.equal(parseRoute('#/oceny').off, true);
  assert.equal(parseRoute('#/oceny?off=1').off, true);
  assert.equal(parseRoute('#/oceny?u=https%3A%2F%2Fx.example%2Fh').off, false);
  assert.equal(parseRoute('#/oceny?u=https%3A%2F%2Fx.example%2Fh&k=').off, false);
});

test('the reader shows the rating block only when enabled and only on story pages', () => {
  const e = real();
  e.weekly = { title: 'W', body: 'b', takeaways: [] };
  const total = 1 + e.stories.length + 1;
  assert.doesNotMatch(renderReader(e, profiles, 1), /Jak dla Ciebie/);
  const html = renderReader(e, profiles, 1, { feedback: true, ratings: { 1: 'less' } });
  assert.equal(count(html, 'Jak dla Ciebie?'), total - 1);
  assert.match(html.slice(html.indexOf('data-n="1"'), html.indexOf('data-n="2"')), /data-rate="less"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(html.slice(html.indexOf(`class="page" data-n="${total}"`)), /Jak dla Ciebie/);
});

test('the rating block sits after the sources and before the page navigation', () => {
  const html = renderReader(real(), profiles, 1, { feedback: true });
  const first = html.slice(html.indexOf('class="page" data-n="1"'), html.indexOf('class="page" data-n="2"'));
  assert.ok(first.indexOf('class="feedback"') > first.indexOf('class="sources"'));
  assert.ok(first.indexOf('class="feedback"') < first.indexOf('class="page-nav"'));
});

test('typing targets do not turn pages', () => {
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'BUTTON', isContentEditable: false }), false);
  assert.equal(isTypingTarget(null), false);
});

test('the reader with ratings on still escapes story data', () => {
  const e = real();
  e.lead_story.title = '<script>alert(1)</script>';
  const html = renderReader(e, profiles, 1, { feedback: true, ratings: { 1: '"><script>' } });
  assert.ok(!html.includes('<script>'));
});

test('the reader bar has a short back link, the page counter and a progress line', () => {
  const e = real();
  const total = 1 + e.stories.length;
  const html = renderReader(e, profiles, 5);
  assert.ok(html.includes('<a class="back" href="#/2026-11-19" aria-label="Wróć do wydania z 19 listopada">Prasa AI</a>'));
  assert.ok(html.includes(`<span class="count">5 / ${total}</span>`));
  assert.ok(html.includes('class="progress"'));
  assert.ok(!html.includes('pierwsza strona'));
  assert.ok(!html.includes('page-meta'));
});

test('reader pages keep a gap under the progress line when they do not open with a picture', () => {
  const css = readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.page-inner\s*\{[^}]*padding:\s*14px 16px 32px/);
  assert.match(css, /\.page \.img-hero:first-child\s*\{[^}]*margin-top:\s*-14px/);
});

test('a story shows its known terms under the article', () => {
  const e = real();
  e.lead_story.terms = ['h200', 'missing'];
  const terms = { h200: { id: 'h200', term: 'H200', explain: 'Układ.' } };
  const html = renderReader(e, profiles, 1, { terms });
  assert.ok(html.includes('<p class="terms">Pojęcia: <button class="term" data-term="h200">H200</button></p>'));
  assert.ok(!html.includes('missing'));
  e.lead_story.terms = ['missing'];
  assert.ok(!renderReader(e, profiles, 1, { terms }).includes('class="terms"'));
  assert.ok(!renderReader(real(), profiles, 1).includes('class="terms"'));
});

test('supplement paragraphs starting with "## " become subheads, escaped', () => {
  const e = real();
  e.weekly = { title: 'W', body: '## Rynek\n\nAkapit o rynku.\n\n## <b>Modele</b>\n\nAkapit o modelach.', takeaways: [], race_map: [] };
  const html = renderReader(e, profiles, 1);
  const last = html.slice(html.lastIndexOf('class="page"'));
  assert.ok(last.includes('<h3>Rynek</h3><p>Akapit o rynku.</p>'));
  assert.ok(last.includes('<h3>&lt;b&gt;Modele&lt;/b&gt;</h3>'));
  assert.ok(!last.includes('##'));
});

test('story bodies keep "## " as text, not as a subhead', () => {
  const e = real();
  e.lead_story.body = '## nie nagłówek';
  assert.ok(renderReader(e, profiles, 1).includes('<p>## nie nagłówek</p>'));
});

test('the race map has the area in one column and the leader over its note in the other', () => {
  const e = real();
  e.weekly = { title: 'W', body: 'b', takeaways: [], race_map: [{ area: 'Kod', leader: 'Firma <X>', note: 'prowadzi w SWE' }] };
  const html = renderReader(e, profiles, 1);
  assert.ok(html.includes('<table class="race"><tbody><tr><th scope="row">Kod</th><td><strong>Firma &lt;X&gt;</strong><span>prowadzi w SWE</span></td></tr></tbody></table>'));
});

test('a subhead block may carry its first paragraph on the next line, and ### works too', () => {
  const e = real();
  e.weekly = { title: 'W', body: '## Rynek\nNvidia spadła.\n\n### Modele\n\nAkapit.', takeaways: [], race_map: [] };
  const last = renderReader(e, profiles, 1).slice(-3000);
  assert.ok(last.includes('<h3>Rynek</h3><p>Nvidia spadła.</p>'));
  assert.ok(last.includes('<h3>Modele</h3><p>Akapit.</p>'));
});

test('the back link reads clearly in the ink colour, not as a small grey date', () => {
  const css = readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.reader-bar \.back\s*\{[^}]*color:\s*var\(--ink\)[^}]*font:\s*700 18px\/1 var\(--serif\)/);
});
