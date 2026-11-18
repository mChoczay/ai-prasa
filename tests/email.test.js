import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkEditionRules } from '../n8n/lib/edition.js';
import { renderEmailHtml, renderErrorEmail } from '../n8n/lib/email.js';

const SITE = 'https://mchoczay.github.io/ai-prasa/';
const edition = () => {
  const raw = JSON.parse(readFileSync(new URL('./fixtures/edition.sample.json', import.meta.url), 'utf8'));
  return checkEditionRules(raw, []).edition;
};

test('morning mail subject is exactly the lead title, with Polish characters kept', () => {
  const e = edition();
  e.lead_story.title = 'Łódź i Kraków: żółw wygrywa';
  assert.equal(renderEmailHtml(e, SITE).subject, 'Poranna prasa AI: Łódź i Kraków: żółw wygrywa');
});

test('morning mail links the button to the edition', () => {
  const { html } = renderEmailHtml(edition(), SITE);
  assert.match(html, /<a href="https:\/\/mchoczay\.github\.io\/ai-prasa\/#\/2026-11-18"[^>]*>Czytaj wydanie<\/a>/);
});

test('morning mail lists the greeting and every story title with status', () => {
  const e = edition();
  const { html } = renderEmailHtml(e, SITE);
  assert.ok(html.includes('Dzień dobry.'));
  for (const s of [e.lead_story, ...e.stories]) assert.ok(html.includes(s.title), s.title);
  assert.match(html, /potwierdzone/);
  assert.match(html, /opinia/);
  assert.match(html, /max-width:\s*600px/);
});

test('morning mail escapes titles', () => {
  const e = edition();
  e.stories[0].title = '<script>alert(1)</script>';
  const { html } = renderEmailHtml(e, SITE);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('credits error mail', () => {
  const { subject, html } = renderErrorEmail({ step: 'PPAI · claude', message: 'CREDITS: low', kind: 'credits' });
  assert.equal(subject, 'Poranna prasa AI: wstrzymane – brak kredytów API');
  assert.match(html, /Console/);
  assert.match(html, /paused/);
});

test('auth error mail', () => {
  const { subject, html } = renderErrorEmail({ step: 'PPAI · claude', message: 'AUTH: 401', kind: 'auth' });
  assert.equal(subject, 'Poranna prasa AI: wstrzymane – klucz API nieważny');
  assert.match(html, /Anthropic account 2/);
});

test('budget stop mail', () => {
  const { subject } = renderErrorEmail({ step: 'bramka', message: 'budget', kind: 'budget' });
  assert.equal(subject, 'Poranna prasa AI: wstrzymane – miesięczny budżet wyczerpany');
});

test('generic error mail names the step and escapes the message', () => {
  const { subject, html } = renderErrorEmail({ step: 'Pobierz RSS', message: '<b>boom</b>', kind: null });
  assert.equal(subject, 'Poranna prasa AI: błąd w kroku Pobierz RSS');
  assert.ok(html.includes('&lt;b&gt;boom&lt;/b&gt;'));
});
