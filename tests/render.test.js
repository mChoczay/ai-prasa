import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  escapeHtml,
  renderMarket,
  renderRankings,
  renderArchive,
  renderProfileCard,
  entityChip,
} from '../site/js/render.js';

const profiles = [
  {
    id: 'nvda',
    type: 'company',
    name: 'NVIDIA',
    aliases: 'Nvidia,NVDA',
    summary: 'Producent układów GPU.',
    owner: 'spółka giełdowa (Nasdaq)',
    key_products: 'GPU, CUDA',
    why_it_matters: 'Dostarcza większość akceleratorów AI.',
    updated_at: '2026-11-01',
  },
  {
    id: 'model-x',
    type: 'model',
    name: 'Model X',
    aliases: '',
    summary: 'Model językowy firmy X.',
    owner: 'Firma X',
    key_products: '',
    why_it_matters: 'Tani model do agentów.',
    updated_at: '2026-11-01',
  },
];
const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));

const marketRows = [
  { ticker: 'NVDA', name: 'NVIDIA', close: 190.5, change_1d: 2.1, change_7d: 5, change_30d: 12.345, last_trade_date: '2026-11-17' },
  { ticker: 'CRWV', name: 'CoreWeave', close: 80, change_1d: -3.2, change_7d: -1, change_30d: 0, last_trade_date: '2026-11-17' },
];

test('escapeHtml escapes the five HTML-special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('renderMarket formats Polish percentages with up and down classes', () => {
  const html = renderMarket({ commentary: 'c', disclaimer: 'To nie jest porada inwestycyjna.', rows: marketRows });
  assert.match(html, /class="up"[^>]*>\+2,10%</);
  assert.match(html, /class="down"[^>]*>−3,20%</);
  assert.match(html, /12,35%/);
  assert.match(html, /2026-11-17/);
  assert.match(html, /To nie jest porada inwestycyjna\./);
});

test('renderMarket without data says dane niedostępne', () => {
  assert.match(renderMarket(null), /dane niedostępne/);
  assert.match(renderMarket({ commentary: 'c', disclaimer: 'd', rows: null }), /dane niedostępne/);
});

test('renderRankings marks missing boards as dane niedostępne and shows moves', () => {
  const html = renderRankings({ commentary: 'k', lmarena: [{ rank: 3, model: 'Model X', org: 'Firma X', score: 1450, delta: 2 }], aa: null, hf_trending: [] });
  assert.match(html, /LMArena/);
  assert.match(html, /▲ 2/);
  assert.match(html, /Artificial Analysis[\s\S]*dane niedostępne/);
});

const ARCHIVE = {
  editions: [
    { date: '2026-11-20', kind: 'daily', lead_title: 'Anthropic na Nasdaq', minutes: 14, categories: ['inwestycje'] },
    { date: '2026-11-19', kind: 'weekly', lead_title: 'Tydzień modeli', minutes: 13, categories: ['modele'] },
    { date: '2026-10-31', kind: 'special', lead_title: '<script>x</script>', minutes: 5, categories: ['inne'] },
  ],
};

test('renderArchive groups editions by month with the day, title and reading time', () => {
  const html = renderArchive(ARCHIVE, {});
  const months = [...html.matchAll(/<h3 class="month">([^<]+)<\/h3>/g)].map((m) => m[1]);
  assert.deepEqual(months, ['listopad 2026', 'październik 2026']);
  assert.ok(html.includes('<b>20</b><small>pt</small>'));
  assert.ok(html.includes('ok. 13 min · Tydzień w AI'));
  assert.ok(html.includes('ok. 5 min'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('<script>x'));
  assert.match(html, /href="#\/2026-11-20"/);
  assert.ok(html.includes('class="mast-nav"'));
  assert.match(html, /<a href="#\/archiwum"[^>]*aria-current="page"[^>]*>Archiwum/);
});

test('renderArchive marks the active chip and filters by category', () => {
  const all = renderArchive(ARCHIVE, {});
  assert.match(all, /<a class="chip" href="#\/archiwum" aria-current="page">wszystkie<\/a>/);
  const html = renderArchive(ARCHIVE, { category: 'modele' });
  assert.match(html, /<a class="chip" href="#\/archiwum\?kat=modele" aria-current="page">modele<\/a>/);
  assert.ok(html.includes('Tydzień modeli'));
  assert.ok(!html.includes('Anthropic na Nasdaq'));
  const empty = renderArchive(ARCHIVE, { category: 'regulacje' });
  assert.ok(empty.includes('Brak wydań w tej kategorii.'));
  assert.ok(empty.includes('class="mast-nav"'));
  assert.ok(empty.includes('class="chips"'));
});

test('renderProfileCard shows the profile and its update date', () => {
  const html = renderProfileCard(profilesById.nvda);
  assert.match(html, /NVIDIA/);
  assert.match(html, /Dostarcza większość akceleratorów AI\./);
  assert.match(html, /2026-11-01/);
});

test('entityChip falls back to escaped text for unknown ids', () => {
  assert.equal(entityChip('nvda', profilesById), '<button class="entity" data-entity="nvda">NVIDIA</button>');
  assert.equal(entityChip('<x>', profilesById), '<span class="entity-unknown">&lt;x&gt;</span>');
});
