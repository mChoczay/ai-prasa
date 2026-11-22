import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editionDatesToRead, storyRefs, vulnsPrompt, mergeFindings, checksToRun, osvFix, nvdFacts, applyChecks } from '../n8n/lib/vulns.js';

const NOW = '2026-11-23T05:30:00.000Z';
const story = (title, extra = {}) => ({ title, lede: `Lead ${title}.`, body: `Treść ${title}.`, sources: [{ name: 's', url: `https://example.com/${encodeURIComponent(title)}` }], ...extra });
const edition = (date = '2026-11-22') => ({
  date,
  lead_story: story('OpenRouter: incydenty'),
  stories: [story('Upload2Shell: luka w Ghostscripcie'), story('GPGME 2.3.1: krytyczny double free')],
});
const finding = (extra = {}) => ({
  cve_id: 'CVE-2026-125396',
  product: 'Ghostscript',
  packages: [{ ecosystem: 'apt', name: 'ghostscript' }],
  affected: 'przed 10.08.0',
  fixed_in: '10.08.0',
  severity_article: '',
  summary: 'Spreparowany PDF może uruchomić polecenia na serwerze.',
  agent_text: '### Jak wykryć\n`dpkg -l ghostscript`',
  story_ref: '2026-11-22#2',
  ...extra,
});
const gpgme = (extra = {}) => finding({ cve_id: 'CVE-2026-129975', product: 'GPGME', packages: [{ ecosystem: 'apt', name: 'libgpgme11' }], affected: '2.3.0', fixed_in: '', story_ref: '2026-11-22#3', ...extra });

test('editionDatesToRead takes the oldest unprocessed days of the last week', () => {
  assert.deepEqual(editionDatesToRead('2026-11-23', ['2026-11-19', '2026-11-20']), ['2026-11-17', '2026-11-18']);
  const all = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
  assert.deepEqual(editionDatesToRead('2026-11-23', all), []);
  assert.deepEqual(editionDatesToRead('2026-11-23', [], { max: 5 }), ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
});

test('storyRefs numbers stories as reader pages, the lead first', () => {
  assert.deepEqual(storyRefs(edition()).map((s) => s.ref), ['2026-11-22#1', '2026-11-22#2', '2026-11-22#3']);
  assert.equal(storyRefs(edition())[2].n, 3);
  assert.deepEqual(storyRefs({ date: '2026-11-22', lead_story: null, stories: [story('A')] }).map((s) => s.ref), ['2026-11-22#2']);
});

test('vulnsPrompt lists each story with its ref and cuts long bodies', () => {
  const e = edition();
  e.stories[1].body = 'x'.repeat(3000);
  const text = vulnsPrompt([e]);
  assert.match(text, /\[2026-11-22#3\] GPGME 2\.3\.1/);
  assert.match(text, /Sources: https:\/\/example\.com\//);
  assert.ok(!text.includes('x'.repeat(1501)));
  assert.ok(text.includes('x'.repeat(1500)));
});

test('mergeFindings adds new CVEs, patched when the article names the fix', () => {
  const { rows, changed } = mergeFindings([], { vulns: [finding(), gpgme()] }, [edition()], NOW);
  assert.equal(rows.length, 2);
  assert.equal(changed.length, 2);
  const gs = rows.find((r) => r.cve_id === 'CVE-2026-125396');
  assert.equal(gs.vuln_key, 'CVE-2026-125396');
  assert.equal(gs.status, 'patched');
  assert.equal(gs.status_source, 'article');
  assert.equal(gs.patched_at, NOW);
  assert.equal(gs.story_n, 2);
  assert.equal(gs.story_date, '2026-11-22');
  assert.equal(gs.first_date, '2026-11-22');
  assert.equal(gs.story_title, 'Upload2Shell: luka w Ghostscripcie');
  assert.deepEqual(JSON.parse(gs.packages), [{ ecosystem: 'apt', name: 'ghostscript' }]);
  assert.equal(JSON.parse(gs.sources)[0].url, 'https://example.com/Upload2Shell%3A%20luka%20w%20Ghostscripcie');
  assert.equal(gs.checked_at, '');
  const gp = rows.find((r) => r.cve_id === 'CVE-2026-129975');
  assert.equal(gp.status, 'open');
  assert.equal(gp.patched_at, '');
});

test('mergeFindings normalises or skips bad findings', () => {
  const answer = {
    vulns: [
      finding({ cve_id: 'cve-2026-125396', severity_article: 'bardzo' }),
      finding({ cve_id: '' }),
      finding({ cve_id: 'n/a' }),
      gpgme({ story_ref: '2026-11-22#9' }),
      null,
    ],
  };
  const { rows } = mergeFindings([], answer, [edition()], NOW);
  assert.deepEqual(rows.map((r) => r.cve_id), ['CVE-2026-125396']);
  assert.equal(rows[0].severity, '');
  assert.deepEqual(mergeFindings([], null, [edition()], NOW).rows, []);
  assert.deepEqual(mergeFindings([], { vulns: 'x' }, [edition()], NOW).rows, []);
});

test('mergeFindings keeps one row per CVE and the first article', () => {
  const first = mergeFindings([], { vulns: [gpgme(), gpgme({ summary: 'inne' })] }, [edition()], NOW);
  assert.equal(first.rows.length, 1);
  const later = edition('2026-11-24');
  const again = mergeFindings(first.rows, { vulns: [gpgme({ story_ref: '2026-11-24#1' })] }, [later], NOW);
  assert.equal(again.rows.length, 1);
  assert.deepEqual(again.changed, []);
  assert.equal(again.rows[0].story_date, '2026-11-22');
  const fixed = mergeFindings(first.rows, { vulns: [gpgme({ story_ref: '2026-11-24#1', fixed_in: '2.3.1' })] }, [later], '2026-11-24T05:30:00.000Z');
  assert.equal(fixed.rows[0].status, 'patched');
  assert.equal(fixed.rows[0].fixed_in, '2.3.1');
  assert.equal(fixed.rows[0].story_date, '2026-11-22');
  assert.equal(fixed.changed.length, 1);
});

test('the vulns schema asks for a list of CVE findings', () => {
  const schema = JSON.parse(readFileSync(new URL('../schemas/vulns.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.required, ['vulns']);
  const item = schema.properties.vulns.items;
  assert.deepEqual(item.required, ['cve_id', 'product', 'packages', 'affected', 'fixed_in', 'severity_article', 'summary', 'agent_text', 'story_ref']);
  assert.deepEqual(item.properties.severity_article.enum, ['krytyczna', 'wysoka', 'średnia', 'niska', '']);
  const prompt = readFileSync(new URL('../prompts/vulns.md', import.meta.url), 'utf8');
  assert.match(prompt, /CVE/);
  assert.match(prompt, /Jak wykryć/);
});

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const row = (cve, extra = {}) => ({ ...mergeFindings([], { vulns: [gpgme({ cve_id: cve })] }, [edition()], NOW).rows[0], ...extra });

test('checksToRun puts never-checked CVEs first, then open ones by oldest check', () => {
  const rows = [
    row('CVE-2026-1001', { checked_at: '2026-11-20T05:30:00.000Z' }),
    row('CVE-2026-1002', { checked_at: '2026-11-18T05:30:00.000Z' }),
    row('CVE-2026-1003', { status: 'patched', checked_at: '' }),
    row('CVE-2026-1004', { status: 'patched', checked_at: '2026-11-18T05:30:00.000Z' }),
    row('CVE-2026-1005', { first_date: '2026-05-01', checked_at: '2026-11-20T05:30:00.000Z' }),
    row('CVE-2026-1006', { first_date: '2026-05-01', checked_at: '2026-11-15T05:30:00.000Z' }),
    row('CVE-2026-1007', { checked_at: '' }),
  ];
  assert.deepEqual(checksToRun(rows, NOW), ['CVE-2026-1003', 'CVE-2026-1007', 'CVE-2026-1006', 'CVE-2026-1002', 'CVE-2026-1001']);
  assert.deepEqual(checksToRun(rows, NOW, 2), ['CVE-2026-1003', 'CVE-2026-1007']);
});

test('osvFix reads a fix and its version, never a commit hash as a version', () => {
  assert.deepEqual(osvFix(fixture('osv-CVE-2026-125396.json')), { patched: true, fixed_in: '10.08.0' });
  assert.deepEqual(osvFix({ affected: [{ ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '2.3.1' }] }] }] }), { patched: true, fixed_in: '2.3.1' });
  assert.deepEqual(osvFix({ affected: [{ ranges: [{ type: 'GIT', events: [{ introduced: '0' }, { fixed: '05631c2cba4e578fdd6bd25cae6f0939436de848' }] }] }] }), { patched: true, fixed_in: '' });
  for (const body of [{ code: 5, message: 'Vulnerability not found' }, null, {}, 'oops']) assert.deepEqual(osvFix(body), { patched: false, fixed_in: '' });
});

test('nvdFacts reads severity, a patch reference and "before X"', () => {
  assert.deepEqual(nvdFacts(fixture('nvd-CVE-2026-125396.json')), { severity: 'wysoka', patched: true, fixed_in: '10.08.0' });
  const tagged = { vulnerabilities: [{ cve: { descriptions: [{ lang: 'en', value: 'A flaw in libfoo.' }], metrics: { cvssMetricV31: [{ cvssData: { baseSeverity: 'CRITICAL' } }] }, references: [{ url: 'https://x', tags: ['Patch', 'Vendor Advisory'] }] } }] };
  assert.deepEqual(nvdFacts(tagged), { severity: 'krytyczna', patched: true, fixed_in: '' });
  const v2 = { vulnerabilities: [{ cve: { descriptions: [], metrics: { cvssMetricV2: [{ baseSeverity: 'MEDIUM', cvssData: {} }] }, references: [] } }] };
  assert.deepEqual(nvdFacts(v2), { severity: 'średnia', patched: false, fixed_in: '' });
  for (const body of [{ totalResults: 0, vulnerabilities: [] }, { message: 'Forbidden' }, null, 'oops']) assert.deepEqual(nvdFacts(body), { severity: '', patched: false, fixed_in: '' });
});

test('applyChecks patches with evidence, keeps the status without it, and always stamps the check', () => {
  const later = '2026-11-24T05:30:00.000Z';
  const rows = [row('CVE-2026-1001'), row('CVE-2026-1002', { severity: 'krytyczna', severity_source: 'article' }), row('CVE-2026-1003'), row('CVE-2026-1004', { status: 'patched', status_source: 'article', fixed_in: '1.0', patched_at: NOW }), row('CVE-2026-1005')];
  const results = [
    { cve_id: 'CVE-2026-1001', osv: fixture('osv-CVE-2026-125396.json'), nvd: null },
    { cve_id: 'CVE-2026-1002', osv: null, nvd: { vulnerabilities: [{ cve: { descriptions: [], metrics: {}, references: [{ url: 'u', tags: ['Patch'] }] } }] } },
    { cve_id: 'CVE-2026-1003', osv: { code: 5 }, nvd: { message: 'Forbidden' } },
    { cve_id: 'CVE-2026-1004', osv: null, nvd: fixture('nvd-CVE-2026-125396.json') },
  ];
  const { rows: out, changed } = applyChecks(rows, results, later);
  const by = Object.fromEntries(out.map((r) => [r.cve_id, r]));
  assert.equal(by['CVE-2026-1001'].status, 'patched');
  assert.equal(by['CVE-2026-1001'].status_source, 'osv');
  assert.equal(by['CVE-2026-1001'].fixed_in, '10.08.0');
  assert.equal(by['CVE-2026-1001'].patched_at, later);
  assert.equal(by['CVE-2026-1002'].status, 'patched');
  assert.equal(by['CVE-2026-1002'].status_source, 'nvd');
  assert.equal(by['CVE-2026-1002'].severity, 'krytyczna');
  assert.equal(by['CVE-2026-1002'].severity_source, 'article');
  assert.equal(by['CVE-2026-1003'].status, 'open');
  assert.equal(by['CVE-2026-1003'].checked_at, later);
  assert.equal(by['CVE-2026-1004'].status, 'patched');
  assert.equal(by['CVE-2026-1004'].status_source, 'article');
  assert.equal(by['CVE-2026-1004'].fixed_in, '1.0');
  assert.equal(by['CVE-2026-1004'].severity, 'wysoka');
  assert.equal(by['CVE-2026-1004'].severity_source, 'nvd');
  assert.equal(by['CVE-2026-1005'].checked_at, '');
  assert.deepEqual(changed.map((r) => r.cve_id).sort(), ['CVE-2026-1001', 'CVE-2026-1002', 'CVE-2026-1003', 'CVE-2026-1004']);
});
