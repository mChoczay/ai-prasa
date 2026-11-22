import test from 'node:test';
import assert from 'node:assert/strict';
import { VULN_DEFAULTS, filterVulns, sortVulns, renderVulns } from '../site/js/vulns.js';
import { parseRoute } from '../site/js/reader.js';
import { mastheadNav } from '../site/js/render.js';
import { tabTitle } from '../site/js/shape.js';

const v = (cve, extra = {}) => ({
  key: cve,
  cve_id: cve,
  product: 'Program',
  summary: 'Opis.',
  severity: '',
  status: 'open',
  fixed_in: '',
  first_date: '2026-11-22',
  checked_at: '2026-11-23T05:30:00.000Z',
  patched_at: '',
  story: { date: '2026-11-22', n: 3, title: 'Tytuł' },
  ...extra,
});
const data = () => ({
  updated_at: '2026-11-23T05:30:00.000Z',
  vulns: [
    v('CVE-2026-129975', { product: 'GPGME', severity: 'krytyczna' }),
    v('CVE-2026-125396', { product: 'Ghostscript', status: 'patched', fixed_in: '10.08.0', severity: 'wysoka', first_date: '2026-11-21', story: { date: '2026-11-22', n: 3, title: 'Upload2Shell' }, summary: 'Plik PDF może uruchomić polecenia.' }),
    v('CVE-2026-121481', { product: 'OpenSSL', severity: 'średnia', first_date: '2026-11-20' }),
    v('CVE-2026-100001', { product: 'zlib', severity: '', first_date: '2026-11-19' }),
  ],
});

test('an entry shows its status, severity, product, CVE, summary, dates and article link', () => {
  const html = renderVulns(data(), { ...VULN_DEFAULTS, status: 'patched' });
  assert.ok(html.includes('załatana od 10.08.0'));
  assert.ok(html.includes('wysoka'));
  assert.ok(html.includes('Ghostscript · CVE-2026-125396'));
  assert.ok(html.includes('Plik PDF może uruchomić polecenia.'));
  assert.ok(html.includes('21 lis'));

  assert.ok(html.includes('href="#/2026-11-22/3"'));
  const open = renderVulns(data(), VULN_DEFAULTS);
  assert.ok(open.includes('niezałatana'));
  assert.ok(open.includes('nieznana'));
});

test('the header counts open entries in the whole log and the footer links the agent file', () => {
  const html = renderVulns(data(), { ...VULN_DEFAULTS, status: 'patched' });
  assert.ok(html.includes('Luki · 3 niezałatane'));
  assert.ok(html.includes('<a href="data/luki.md">plik dla agenta</a>'));
  assert.ok(renderVulns({ vulns: [v('CVE-2026-1', { status: 'patched' })] }, VULN_DEFAULTS).includes('Luki · 0 niezałatanych'));
  assert.ok(renderVulns({ vulns: [v('CVE-2026-1')] }, VULN_DEFAULTS).includes('Luki · 1 niezałatana'));
});

test('with every status shown, patched entries wait under a toggle unless opened', () => {
  const html = renderVulns(data(), VULN_DEFAULTS);
  const details = html.indexOf('<details class="patched">');
  assert.ok(details > html.indexOf('GPGME'));
  assert.ok(html.includes('<summary>Pokaż załatane (1)</summary>'));
  assert.ok(html.indexOf('Ghostscript') > details);
  assert.ok(renderVulns(data(), { ...VULN_DEFAULTS, showPatched: true }).includes('<details class="patched" open>'));
  assert.ok(!renderVulns(data(), { ...VULN_DEFAULTS, status: 'patched' }).includes('<details'));
});

test('filterVulns by status, severity and search text', () => {
  const all = data().vulns;
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, status: 'open' }).map((x) => x.product), ['GPGME', 'OpenSSL', 'zlib']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, status: 'patched' }).map((x) => x.product), ['Ghostscript']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, severity: 'unknown' }).map((x) => x.product), ['zlib']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, severity: 'krytyczna' }).map((x) => x.product), ['GPGME']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, q: 'gpg' }).map((x) => x.product), ['GPGME']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, q: '125396' }).map((x) => x.product), ['Ghostscript']);
  assert.deepEqual(filterVulns(all, { ...VULN_DEFAULTS, q: 'PDF' }).map((x) => x.product), ['Ghostscript']);
});

test('sortVulns by newest, severity and product', () => {
  const all = data().vulns;
  assert.deepEqual(sortVulns(all, 'newest').map((x) => x.product), ['GPGME', 'Ghostscript', 'OpenSSL', 'zlib']);
  assert.deepEqual(sortVulns(all, 'severity').map((x) => x.product), ['GPGME', 'Ghostscript', 'OpenSSL', 'zlib']);
  assert.deepEqual(sortVulns([...all].reverse(), 'severity').map((x) => x.product), ['GPGME', 'Ghostscript', 'OpenSSL', 'zlib']);
  assert.deepEqual(sortVulns(all, 'product').map((x) => x.product), ['Ghostscript', 'GPGME', 'OpenSSL', 'zlib']);
});

test('filters and sorting show which choice is active', () => {
  const html = renderVulns(data(), { ...VULN_DEFAULTS, status: 'open', sort: 'severity' });
  assert.match(html, /data-vf="status:open"[^>]*aria-pressed="true"/);
  assert.match(html, /data-vf="status:all"[^>]*aria-pressed="false"/);
  assert.match(html, /data-vs="severity"[^>]*aria-pressed="true"/);
  assert.match(html, /<input[^>]*data-vq[^>]*>/);
});

test('data from the log is escaped and a story without a date has no link', () => {
  const html = renderVulns({ vulns: [v('CVE-2026-1', { product: '<script>x</script>', summary: '<img src=x onerror=1>', story: { date: '', n: 0, title: '' } })] }, VULN_DEFAULTS);
  assert.ok(!html.includes('<script>x'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('czytaj artykuł'));
  assert.ok(!renderVulns(data(), { ...VULN_DEFAULTS, q: '"><script>' }).includes('"><script>'));
});

test('an empty or missing log says so', () => {
  for (const d of [null, { vulns: [] }, {}]) assert.ok(renderVulns(d, VULN_DEFAULTS).includes('Na razie żadnych luk w dzienniku.'));
  assert.ok(renderVulns(data(), { ...VULN_DEFAULTS, q: 'nic-takiego' }).includes('Nic nie pasuje do filtrów.'));
});

test('the Luki page has its route, menu entry and tab title', () => {
  assert.deepEqual(parseRoute('#/luki'), { view: 'vulns', date: null, page: null, category: null });
  assert.match(mastheadNav('vulns'), /<a href="#\/luki" aria-current="page">Luki<\/a>/);
  assert.match(mastheadNav('archive'), /<a href="#\/luki">Luki<\/a>/);
  assert.equal(tabTitle('vulns'), 'Luki · Prasa AI');
});

test('review: entries no longer show a per-entry check date; the header explains the daily check', () => {
  const html = renderVulns(data(), VULN_DEFAULTS);
  assert.ok(!html.includes('sprawdzono'));
  assert.ok(html.includes('Status sprawdzany codziennie w NVD i OSV.'));
});
