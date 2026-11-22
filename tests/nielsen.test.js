// Fixes from the Nielsen heuristics review (2026-11-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderFront } from '../site/js/front.js';
import { renderArchive, mastheadNav, renderError } from '../site/js/render.js';
import { renderVulns, VULN_DEFAULTS } from '../site/js/vulns.js';
import { renderReader, parseRoute } from '../site/js/reader.js';
import { renderAbout } from '../site/js/about.js';
import { tabTitle } from '../site/js/shape.js';

const real = () => JSON.parse(readFileSync(new URL('./fixtures/edition-2026-11-19.json', import.meta.url), 'utf8'));
const css = () => readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');
const HOME = '<h1><a class="mast-home" href="#/">Poranna prasa AI</a></h1>';

test('1: the paper\'s name in every masthead leads to today\'s edition', () => {
  assert.ok(renderFront(real(), {}).includes(HOME));
  assert.ok(renderArchive({ editions: [] }).includes(HOME));
  assert.ok(renderVulns(null, VULN_DEFAULTS).includes(HOME));
  assert.ok(renderAbout().includes(HOME));
  assert.match(css(), /\.mast-home\s*\{[^}]*color:\s*inherit[^}]*text-decoration:\s*none/);
});

test('2: an "O gazecie" page explains the paper and its labels, linked from the menu', () => {
  assert.deepEqual(parseRoute('#/o-gazecie'), { view: 'about', date: null, page: null, category: null });
  assert.match(mastheadNav('about'), /<a href="#\/o-gazecie" aria-current="page">O gazecie<\/a>/);
  assert.match(mastheadNav('edition'), /<a href="#\/o-gazecie">O gazecie<\/a>/);
  assert.equal(tabTitle('about'), 'O gazecie · Prasa AI');
  const html = renderAbout();
  for (const words of ['Co to jest', 'potwierdzone', 'plotka', 'opinia', 'Sprawdzamy', 'fakt', 'hipoteza', 'Może dotyczyć', 'Luki', 'To nie jest porada inwestycyjna', 'Skąd są wiadomości']) {
    assert.ok(html.includes(words), words);
  }
});

test('3: terms and companies are marked where they first appear in the text', () => {
  const e = real();
  e.lead_story.body = 'Nowy układ H200 trafi do Chin. Kolejne H200 też.\n\nNVIDIA potwierdziła, a H2000 to inna nazwa.';
  e.lead_story.terms = ['h200', 'dsafer'];
  e.lead_story.may_affect = ['nvda'];
  const terms = { h200: { id: 'h200', term: 'H200', explain: 'Układ.' }, dsafer: { id: 'dsafer', term: '-dSAFER', explain: 'Tryb.' } };
  const html = renderReader(e, { nvda: { id: 'nvda', name: 'NVIDIA' } }, 1, { terms });
  const first = html.slice(html.indexOf('class="page" data-n="1"'), html.indexOf('class="page" data-n="2"'));
  const body = first.slice(first.indexOf('<div class="body">'), first.indexOf('</div>', first.indexOf('<div class="body">')));
  assert.equal(body.split('data-term="h200"').length - 1, 1);
  assert.ok(body.includes('Nowy układ <button type="button" class="inline-term" data-term="h200">H200</button> trafi'));
  assert.ok(body.includes('<button type="button" class="inline-term" data-entity="nvda">NVIDIA</button> potwierdziła'));
  assert.ok(body.includes('H2000 to inna'));
  assert.ok(!body.includes('data-term="dsafer"'));
  assert.ok(first.includes('<p class="terms">Pojęcia:'));
});

test('3: marking never breaks escaping or matches inside markup', () => {
  const e = real();
  e.lead_story.body = 'Plik <script> i -dSAFER oraz "cudzysłów".';
  e.lead_story.terms = ['dsafer', 'p'];
  const terms = { dsafer: { id: 'dsafer', term: '-dSAFER', explain: 'x' }, p: { id: 'p', term: 'p', explain: 'x' } };
  const html = renderReader(e, {}, 1, { terms });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('<button type="button" class="inline-term" data-term="dsafer">-dSAFER</button>'));
  assert.ok(!html.includes('<<button'));
});

test('4: empty sections are left out', () => {
  const e = real();
  e.rumors = [];
  const html = renderFront(e, {});
  assert.ok(!html.includes('Plotki i przecieki'));
  assert.ok(!html.includes('Dziś cisza'));
});

test('5: the error screen says what happened and offers a retry', () => {
  const offline = renderError({ offline: true });
  assert.ok(offline.includes('Brak połączenia z internetem'));
  assert.ok(offline.includes('<button type="button" class="retry" data-retry>Spróbuj ponownie</button>'));
  assert.ok(offline.includes('href="#/archiwum"'));
  const server = renderError({ offline: false });
  assert.ok(server.includes('Nie udało się wczytać wydania'));
  assert.ok(server.includes('data-retry'));
});

test('6: story labels read as a kicker, not as coloured badges', () => {
  const e = real();
  e.lead_story.is_update = true;
  const html = renderReader(e, {}, 1);
  const first = html.slice(html.indexOf('class="page" data-n="1"'), html.indexOf('class="page" data-n="2"'));
  assert.ok(!first.includes('class="badge'));
  assert.match(first, /<p class="story-kicker">[^<]+ · <span class="status status-potwierdzone">potwierdzone<\/span> · aktualizacja<\/p>/);
});

test('6: ranking area filters look like the masthead menu, not pills', () => {
  const c = css();
  assert.match(c, /button\.chip\s*\{[^}]*border:\s*0[^}]*border-bottom:\s*1\.5px solid transparent/);
  assert.match(c, /\.chip\[aria-pressed="true"\]\s*\{[^}]*border-bottom-color:\s*var\(--accent\)/);
  assert.doesNotMatch(c, /\.chip\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--ink\)/);
});
