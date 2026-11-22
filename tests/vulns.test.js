import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editionDatesToRead, storyRefs, vulnsPrompt, mergeFindings } from '../n8n/lib/vulns.js';

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
