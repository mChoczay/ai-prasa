import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkEditionRules } from '../n8n/lib/edition.js';
import {
  escapeHtml,
  renderEdition,
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

function published() {
  const raw = JSON.parse(readFileSync(new URL('./fixtures/edition.sample.json', import.meta.url), 'utf8'));
  const { edition } = checkEditionRules(raw, profiles);
  edition.minutes = 15;
  edition.market = { ...edition.market, rows: marketRows };
  edition.rankings = {
    ...edition.rankings,
    lmarena: [{ rank: 3, model: 'Model X', org: 'Firma X', score: 1450, delta: 2 }],
    aa: [{ rank: 1, model: 'Model Z', org: 'Firma Z', score: 70, delta: null }],
    hf_trending: [{ rank: 1, model: 'org/model-8b', org: 'org', score: 900, delta: 'new' }],
  };
  edition.big_moves.push({
    entity_id: 'model-x',
    board: 'lmarena',
    change: '+2',
    why: 'Możliwe, że pomogła nowa wersja.',
    why_type: 'hipoteza',
    sources: [],
  });
  edition.follow_ups = [
    { entity_id: 'nvda', move: '+4,1%', related_story: 'Producent chipów raportuje rekordowy kwartał', story_date: '2026-11-15' },
  ];
  edition.rumors[0].status = 'plotka';
  edition.spotlight = { company_id: 'nvda', model_id: 'model-x' };
  return edition;
}

test('escapeHtml escapes the five HTML-special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('renderEdition shows masthead, lead and every story title', () => {
  const e = published();
  const html = renderEdition(e, profilesById);
  assert.match(html, /Poranna prasa AI/);
  assert.ok(html.includes(escapeHtml(e.lead_story.title)));
  for (const s of e.stories) assert.ok(html.includes(escapeHtml(s.title)), s.title);
});

test('renderEdition shows status badges with classes', () => {
  const html = renderEdition(published(), profilesById);
  assert.match(html, /class="badge status-potwierdzone"[^>]*>potwierdzone</);
  assert.match(html, /class="badge status-plotka"[^>]*>plotka</);
  assert.match(html, /class="badge status-opinia"[^>]*>opinia</);
});

test('renderEdition shows Może dotyczyć chips for known entities', () => {
  const html = renderEdition(published(), profilesById);
  assert.match(html, /Może dotyczyć/);
  assert.match(html, /<button class="entity" data-entity="nvda">NVIDIA<\/button>/);
});

test('renderEdition shows Dlaczego? lines with the why type class', () => {
  const html = renderEdition(published(), profilesById);
  assert.match(html, /Dlaczego\?/);
  assert.match(html, /why-hipoteza/);
  assert.match(html, /why-fakt/);
});

test('renderEdition shows Sprawdzamy only when there are follow-ups', () => {
  const e = published();
  assert.match(renderEdition(e, profilesById), /Sprawdzamy/);
  e.follow_ups = [];
  assert.doesNotMatch(renderEdition(e, profilesById), /Sprawdzamy/);
});

test('renderEdition shows the Poznaj block from spotlight profiles', () => {
  const html = renderEdition(published(), profilesById);
  assert.match(html, /Poznaj/);
  assert.match(html, /Producent układów GPU\./);
  assert.match(html, /Model językowy firmy X\./);
});

test('renderEdition shows the reading time', () => {
  assert.match(renderEdition(published(), profilesById), /15 min czytania/);
});

test('renderEdition shows the weekly supplement when present', () => {
  const e = published();
  e.weekly = { title: 'Tydzień pełen premier', body: 'Akapit pierwszy.\n\nAkapit drugi.', takeaways: ['a', 'b', 'c'], race_map: [{ area: 'kod', leader: 'Firma X', note: 'n' }] };
  const html = renderEdition(e, profilesById);
  assert.match(html, /Tydzień w AI/);
  assert.match(html, /<p>Akapit drugi\.<\/p>/);
});

test('renderEdition credits the ranking data sources', () => {
  const html = renderEdition(published(), profilesById);
  assert.match(html, /<footer class="credits">/);
  assert.match(html, /href="https:\/\/artificialanalysis\.ai\/"/);
  assert.match(html, /LMArena[\s\S]*CC BY 4\.0/);
  assert.match(html, /Hugging Face/);
});

test('renderEdition escapes story titles', () => {
  const e = published();
  e.stories[0].title = '<img src=x onerror=alert(1)>';
  const html = renderEdition(e, profilesById);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('source links only allow http and https URLs', () => {
  const e = published();
  e.stories[0].sources = [
    { name: 'Zły link', url: 'javascript:alert(1)', primary: false },
    { name: 'Dobry link', url: 'https://example.com/ok', primary: false },
  ];
  const html = renderEdition(e, profilesById);
  assert.ok(!html.includes('javascript:'));
  assert.match(html, /Zły link/);
  assert.match(html, /href="https:\/\/example\.com\/ok"/);
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

test('renderArchive filters by category', () => {
  const index = {
    editions: [
      { date: '2026-11-18', kind: 'daily', lead_title: 'Modele dziś', minutes: 15, categories: ['modele', 'gielda'] },
      { date: '2026-11-17', kind: 'daily', lead_title: 'Tylko giełda', minutes: 12, categories: ['gielda'] },
    ],
  };
  const html = renderArchive(index, { category: 'modele' });
  assert.match(html, /Modele dziś/);
  assert.doesNotMatch(html, /Tylko giełda/);
  assert.match(renderArchive(index, {}), /Tylko giełda/);
  assert.match(html, /href="#\/2026-11-18"/);
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
