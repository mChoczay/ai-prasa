import test from 'node:test';
import assert from 'node:assert/strict';
import {
  profileTargets,
  wikiSearchUrl,
  parseWikiSearch,
  profilePrompt,
  hasReference,
  profileRow,
  profilesJson,
  finishEdition,
  historyRows,
  commonsCreditUrl,
  parseCommonsCredit,
} from '../n8n/lib/profiles.js';

const edition = {
  date: '2026-11-19',
  lead_story: { title: 'Lead', category: 'gielda', status: 'potwierdzone', lede: 'Apple ships a chip.', body: 'Nowa Firma bought it. Nothing else here.', may_affect: ['aapl'], may_affect_pending: ['Nowa Firma'], sources: [{ url: 'https://a.example/1' }] },
  stories: [{ title: 'Second', category: 'modele', status: 'potwierdzone', lede: 'Gemini 4 Neon is out.', body: '', may_affect: [], may_affect_pending: [], sources: [{ url: 'https://a.example/2' }, { url: 'https://a.example/3' }] }],
  big_moves: [{ entity_id: 'nvda' }],
};

test('profileTargets builds search queries by type and collects context', () => {
  const targets = profileTargets({
    edition,
    newEntityNames: ['Nowa Firma'],
    watchlist: [{ ticker: 'AAPL', name: 'Apple', active: true }],
    leaderboardTop: ['Gemini 4 Neon'],
    profiles: [],
    rankings: { lmarena: [{ rank: 2, model: 'Gemini 4 Neon', org: 'google' }], aa: null, hf_trending: [] },
    today: '2026-11-19',
  });
  assert.deepEqual(targets.map((t) => [t.id, t.query]), [
    ['aapl', 'Apple company AAPL'],
    ['nowa-firma', 'Nowa Firma artificial intelligence'],
    ['gemini-4-neon', 'Gemini 4 Neon google AI model'],
  ]);
  assert.equal(targets[0].ticker, 'AAPL');
  assert.deepEqual(targets[1].mentions, ['Nowa Firma bought it.']);
  assert.deepEqual(targets[2].boards, [{ board: 'lmarena', rank: 2, org: 'google' }]);
});

test('profileTargets skips entities that already have a profile under entity_id', () => {
  const targets = profileTargets({ edition, newEntityNames: [], watchlist: [{ ticker: 'AAPL', name: 'Apple', active: true }], leaderboardTop: [], profiles: [{ entity_id: 'aapl', name: 'Apple', updated_at: '2026-11-01' }], rankings: null, today: '2026-11-19' });
  assert.deepEqual(targets, []);
});

test('wikiSearchUrl encodes the query and parseWikiSearch reads the first page', () => {
  assert.match(wikiSearchUrl('Apple company AAPL'), /gsrsearch=Apple%20company%20AAPL$/);
  const wiki = parseWikiSearch({ query: { pages: { 856: { title: 'Apple Inc.', extract: ' Apple Inc. is a company. ', fullurl: 'https://en.wikipedia.org/wiki/Apple_Inc.' } } } });
  assert.deepEqual(wiki, { title: 'Apple Inc.', extract: 'Apple Inc. is a company.', url: 'https://en.wikipedia.org/wiki/Apple_Inc.', image: null });
  assert.equal(parseWikiSearch({ batchcomplete: '' }), null);
  assert.equal(parseWikiSearch(null), null);
});

test('profilePrompt lists the reference text and hasReference tells when a card can be written', () => {
  const t = { name: 'Apple', type: 'company', ticker: 'AAPL', boards: [], mentions: ['Apple ships a chip.'] };
  const text = profilePrompt(t, { title: 'Apple Inc.', extract: 'Apple Inc. is a company.' });
  assert.match(text, /Stock ticker: AAPL/);
  assert.match(text, /Wikipedia, "Apple Inc\.": Apple Inc\. is a company\./);
  assert.match(text, /From today's news: Apple ships a chip\./);
  assert.equal(hasReference({ mentions: [], boards: [] }, null), false);
  assert.equal(hasReference(t, null), true);
});

test('profileRow and profilesJson convert between the card, the table and the site file', () => {
  const row = profileRow(
    { id: 'aapl', name: 'Apple', type: 'company', ticker: 'AAPL' },
    { type: 'company', name: 'Apple Inc.', owner: 'spółka giełdowa (Nasdaq)', summary: 'S.', key_products: ['iPhone', 'Mac'], why_it_matters: 'W.', aliases: ['Apple Inc.'] },
    { url: 'https://en.wikipedia.org/wiki/Apple_Inc.' },
    '2026-11-19',
  );
  assert.equal(row.entity_id, 'aapl');
  assert.equal(row.name, 'Apple');
  assert.equal(row.aliases, 'Apple Inc.,AAPL');
  assert.equal(row.key_products, 'iPhone, Mac');
  const site = profilesJson([{ ...row, last_spotlight_at: '2026-10-01T00:00:00.000Z' }, {}]);
  assert.equal(site.profiles.length, 1);
  assert.deepEqual(site.profiles[0].key_products, ['iPhone', 'Mac']);
  assert.equal(site.profiles[0].id, 'aapl');
  assert.equal(site.profiles[0].last_spotlight_at, '2026-10-01');
});

test('finishEdition resolves pending names and picks the spotlight from today entities', () => {
  const rows = [
    { entity_id: 'aapl', type: 'company', name: 'Apple', aliases: 'AAPL' },
    { entity_id: 'nowa-firma', type: 'company', name: 'Nowa Firma', aliases: '', last_spotlight_at: '2026-11-10' },
    { entity_id: 'gemini-4-neon', type: 'model', name: 'Gemini 4 Neon', aliases: '' },
  ];
  const { edition: e, spotlightIds, profiles } = finishEdition(edition, rows, '2026-11-19');
  assert.deepEqual(e.lead_story.may_affect, ['aapl', 'nowa-firma']);
  assert.equal('may_affect_pending' in e.lead_story, false);
  assert.deepEqual(e.spotlight, { company_id: 'aapl', model_id: 'gemini-4-neon' });
  assert.deepEqual(spotlightIds, ['aapl', 'gemini-4-neon']);
  assert.equal(profiles.profiles.length, 3);
  assert.equal(finishEdition(edition, [], '2026-11-19').edition.spotlight, null);
});

test('historyRows gives one topic per story and one tag per affected entity', () => {
  const { topics, tags } = historyRows({ ...edition, lead_story: { ...edition.lead_story, may_affect: ['aapl', 'nowa-firma'] } });
  assert.deepEqual(topics.map((t) => [t.title, t.source_urls]), [['Lead', 'https://a.example/1'], ['Second', 'https://a.example/2 https://a.example/3']]);
  assert.deepEqual(tags, [
    { date: '2026-11-19', story_title: 'Lead', entity_id: 'aapl' },
    { date: '2026-11-19', story_title: 'Lead', entity_id: 'nowa-firma' },
  ]);
});

const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Apple_Park.jpg/800px-Apple_Park.jpg';

test('wiki search asks for the page image and keeps it only from Commons', () => {
  assert.match(wikiSearchUrl('Apple'), /prop=extracts%7Cinfo%7Cpageimages&piprop=thumbnail%7Cname&pithumbsize=800/);
  const page = (source) => ({ query: { pages: { 1: { title: 'Apple Inc.', extract: 'Apple is a company.', fullurl: 'https://en.wikipedia.org/wiki/Apple_Inc.', pageimage: 'Apple_Park.jpg', thumbnail: { source } } } } });
  assert.deepEqual(parseWikiSearch(page(COMMONS)).image, { thumb: COMMONS, file: 'Apple_Park.jpg' });
  assert.equal(parseWikiSearch(page('https://upload.wikimedia.org/wikipedia/en/a/ab/Apple_logo.svg')).image, null);
  assert.equal(parseWikiSearch({ query: { pages: { 1: { title: 'X', extract: 'x' } } } }).image, null);
});

test('commonsCreditUrl and parseCommonsCredit give a plain-text author and licence credit', () => {
  assert.equal(
    commonsCreditUrl('Apple Park.jpg'),
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName&titles=File:Apple%20Park.jpg',
  );
  const body = (artist, license) => ({ query: { pages: { '-1': { title: 'File:Apple Park.jpg', imageinfo: [{ extmetadata: { Artist: { value: artist }, LicenseShortName: { value: license } } }] } } } });
  assert.deepEqual(parseCommonsCredit(body('<a href="//commons.wikimedia.org/wiki/User:Jan">Jan <b>K</b></a>', 'CC BY-SA 4.0')), {
    credit: 'Jan K / CC BY-SA 4.0, Wikimedia Commons',
    page: 'https://commons.wikimedia.org/wiki/File:Apple_Park.jpg',
  });
  assert.equal(parseCommonsCredit(body('', 'CC0')).credit, 'autor nieznany / CC0, Wikimedia Commons');
  assert.equal(parseCommonsCredit({ batchcomplete: '' }), null);
});

test('profile rows and the site file carry the Commons image with its credit', () => {
  const wiki = { title: 'Apple Inc.', extract: 'x', url: 'https://en.wikipedia.org/wiki/Apple_Inc.', image: { thumb: COMMONS, file: 'Apple_Park.jpg' } };
  const card = { type: 'company', name: 'Apple', owner: 'o', summary: 'S.', key_products: [], why_it_matters: 'W.', aliases: [] };
  const credit = { credit: 'Jan K / CC BY-SA 4.0, Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/File:Apple_Park.jpg' };
  const row = profileRow({ id: 'aapl', name: 'Apple', type: 'company', ticker: 'AAPL' }, card, wiki, '2026-11-20', credit);
  assert.deepEqual([row.image_url, row.image_credit, row.image_page], [COMMONS, credit.credit, credit.page]);
  const bare = profileRow({ id: 'x', name: 'X', type: 'org' }, card, null, '2026-11-20', null);
  assert.deepEqual([bare.image_url, bare.image_credit, bare.image_page], ['', '', '']);
  const site = profilesJson([row, bare]).profiles;
  assert.deepEqual(site.find((p) => p.id === 'aapl').image, { url: COMMONS, credit: credit.credit, link: credit.page });
  assert.equal(site.find((p) => p.id === 'x').image, null);
});

test('finishEdition gives stories without an article image the image of their first profiled entity', () => {
  const rows = [
    { entity_id: 'aapl', type: 'company', name: 'Apple', aliases: 'AAPL', image_url: COMMONS, image_credit: 'c', image_page: 'p' },
    { entity_id: 'nowa-firma', type: 'company', name: 'Nowa Firma', aliases: '' },
  ];
  const e = {
    date: '2026-11-20',
    lead_story: { title: 'L', may_affect: ['nowa-firma', 'aapl'], may_affect_pending: [], image: null },
    stories: [{ title: 'S', may_affect: [], may_affect_pending: [], image: { url: 'https://img.example/s.jpg' } }],
    big_moves: [],
  };
  const done = finishEdition(e, rows, '2026-11-20').edition;
  assert.deepEqual(done.lead_story.image_fallback, { url: COMMONS, credit: 'c', link: 'p' });
  assert.equal(done.stories[0].image_fallback, null);
});

test('Commons images served from thumb.wikimedia.org are accepted too', () => {
  const thumb = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Oracle_Campus.jpg/960px-Oracle_Campus.jpg?utm_source=en.wikipedia.org';
  const body = { query: { pages: { 1: { title: 'Oracle Corporation', extract: 'x', pageimage: 'Oracle_Campus.jpg', thumbnail: { source: thumb } } } } };
  assert.deepEqual(parseWikiSearch(body).image, { thumb, file: 'Oracle_Campus.jpg' });
  assert.deepEqual(profilesJson([{ entity_id: 'orcl', image_url: thumb, image_credit: 'c', image_page: 'p' }]).profiles[0].image, { url: thumb, credit: 'c', link: 'p' });
  assert.equal(profilesJson([{ entity_id: 'x', image_url: 'https://thumb.wikimedia.org/wikipedia/en/a.png' }]).profiles[0].image, null);
});

test('a Commons image is published only together with its author and licence', () => {
  const site = profilesJson([
    { entity_id: 'intc', image_url: COMMONS, image_credit: 'Wikimedia Commons', image_page: '' },
    { entity_id: 'aapl', image_url: COMMONS, image_credit: 'Jan / CC0, Wikimedia Commons', image_page: 'https://commons.wikimedia.org/wiki/File:A.jpg' },
  ]).profiles;
  assert.equal(site.find((p) => p.id === 'intc').image, null);
  assert.equal(site.find((p) => p.id === 'aapl').image.credit, 'Jan / CC0, Wikimedia Commons');
});

test('parseCommonsCredit decodes entities and translates an unknown author', () => {
  const body = (artist) => ({ query: { pages: { '-1': { title: 'File:A.jpg', imageinfo: [{ extmetadata: { Artist: { value: artist }, LicenseShortName: { value: 'CC BY 4.0' } } }] } } } });
  assert.equal(parseCommonsCredit(body('Jan &#039;K&#039; &quot;Kowal&quot;')).credit, 'Jan \'K\' "Kowal" / CC BY 4.0, Wikimedia Commons');
  assert.equal(parseCommonsCredit(body('<span class="x">Unknown author</span>')).credit, 'autor nieznany / CC BY 4.0, Wikimedia Commons');
});
