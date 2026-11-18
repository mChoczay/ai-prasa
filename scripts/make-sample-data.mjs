// Regenerates site/data/ sample files from tests/fixtures/edition.sample.json. Usage: node scripts/make-sample-data.mjs
// n8n overwrites/adds real editions at runtime; this keeps the preview and first deploy non-empty.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { checkEditionRules, readingMinutes, upsertIndex } from '../n8n/lib/edition.js';

const root = new URL('../', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('tests/fixtures/edition.sample.json', root), 'utf8'));

const profiles = [
  {
    id: 'nvda', type: 'company', name: 'NVIDIA', aliases: 'Nvidia,NVDA', ticker: 'NVDA',
    summary: 'Przykładowa wizytówka: amerykański producent układów GPU, które napędzają większość treningu i uruchamiania modeli AI.',
    owner: 'spółka giełdowa (Nasdaq)', key_products: ['GPU do centrów danych', 'CUDA'],
    why_it_matters: 'Dostarcza większość akceleratorów AI na rynku.', updated_at: '2026-11-18', last_spotlight_at: null,
  },
  {
    id: 'model-x', type: 'model', name: 'Model X', aliases: '', ticker: '',
    summary: 'Przykładowa wizytówka modelu: tańszy model językowy firmy X nastawiony na agentów i wywoływanie narzędzi.',
    owner: 'Firma X', key_products: [], why_it_matters: 'Obniża koszt uruchamiania agentów.', updated_at: '2026-11-18', last_spotlight_at: null,
  },
  {
    id: 'crwv', type: 'company', name: 'CoreWeave', aliases: 'CRWV', ticker: 'CRWV',
    summary: 'Przykładowa wizytówka: dostawca chmury GPU wynajmujący moc obliczeniową laboratoriom AI.',
    owner: 'spółka giełdowa (Nasdaq)', key_products: ['chmura GPU'], why_it_matters: 'Barometr popytu na moc obliczeniową.', updated_at: '2026-11-18', last_spotlight_at: null,
  },
];

const { edition } = checkEditionRules(raw, profiles);
edition.market = {
  ...edition.market,
  rows: [
    { ticker: 'NVDA', name: 'NVIDIA', close: 190.5, change_1d: 4.1, change_7d: 5.2, change_30d: 12.3, last_trade_date: '2026-11-17' },
    { ticker: 'MSFT', name: 'Microsoft', close: 510.2, change_1d: -0.6, change_7d: 1.1, change_30d: 3.4, last_trade_date: '2026-11-17' },
    { ticker: 'CRWV', name: 'CoreWeave', close: 80, change_1d: -3.2, change_7d: -1, change_30d: 0, last_trade_date: '2026-11-17' },
  ],
};
edition.rankings = {
  ...edition.rankings,
  lmarena: [
    { rank: 1, model: 'Model A', org: 'Firma A', score: 1480, delta: null },
    { rank: 2, model: 'Model B', org: 'Firma B', score: 1462, delta: -1 },
    { rank: 3, model: 'Model X', org: 'Firma X', score: 1450, delta: 2 },
  ],
  aa: null,
  hf_trending: [{ rank: 1, model: 'org/open-8b', org: 'org', score: 950, delta: 'new' }],
};
edition.spotlight = { company_id: 'crwv', model_id: 'model-x' };
edition.minutes = readingMinutes(edition);

const categories = [...new Set([edition.lead_story, ...edition.stories].map((s) => s.category))];
const index = upsertIndex({ editions: [] }, {
  date: edition.date, kind: 'daily', lead_title: edition.lead_story.title, minutes: edition.minutes, categories,
});

const dataDir = new URL('site/data/', root);
mkdirSync(dataDir, { recursive: true });
const write = (name, obj) => writeFileSync(new URL(name, dataDir), `${JSON.stringify(obj, null, 2)}\n`);
write(`${edition.date}.json`, edition);
write('index.json', index);
write('profiles.json', { profiles });
console.log(`wrote site/data/${edition.date}.json, index.json, profiles.json`);
