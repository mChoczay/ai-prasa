import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/vulns.workflow.js';
const src = readFileSync(new URL(`../${WF}`, import.meta.url), 'utf8');
const run = (name, ctx) => runCodeNode(codeNodeSource(WF, name), ctx).map((i) => i.json);

const edition = (date) => ({
  date,
  lead_story: { title: 'Lead', lede: 'l', body: 'b', sources: [{ url: 'https://example.com/a' }] },
  stories: [{ title: 'GPGME 2.3.1', lede: 'l', body: 'CVE-2026-129975', sources: [{ url: 'https://example.com/g' }] }],
});
const finding = { cve_id: 'CVE-2026-129975', product: 'GPGME', packages: [], affected: '', fixed_in: '', severity_article: '', summary: 's', agent_text: 'a', story_ref: '2026-11-22#2' };

test('Plan run reads the given date, or the unprocessed days of the last week', () => {
  const manual = run('Plan run', { nodes: { 'Run for a date': [{ date: '2026-11-22' }], 'Read state': [{ paused: false }], 'Read runs': [{ date: '2026-11-22' }] } });
  assert.deepEqual(manual.map((j) => j.fetch), ['2026-11-22']);
  assert.deepEqual(manual[0].dates, ['2026-11-22']);
  assert.equal(manual[0].today, '2026-11-22');
  assert.equal(manual[0].paused, false);
  const scheduled = run('Plan run', { nodes: { 'Read state': [{ paused: true }], 'Read runs': [{}] } });
  assert.ok(scheduled.length >= 1 && scheduled.length <= 2);
  assert.equal(scheduled[0].paused, true);
  assert.match(scheduled[0].fetch, /^\d{4}-\d{2}-\d{2}$/);
});

test('Vulns prompt uses only planned editions that loaded, and skips when paused or empty', () => {
  const plan = [{ today: '2026-11-23', dates: ['2026-11-21', '2026-11-22'], paused: false, fetch: '2026-11-21' }, { today: '2026-11-23', dates: ['2026-11-21', '2026-11-22'], paused: false, fetch: '2026-11-22' }];
  const fetched = [{ statusCode: 404, data: 'Not found' }, { statusCode: 200, data: JSON.stringify(edition('2026-11-22')) }];
  const [ok] = run('Vulns prompt', { nodes: { 'Plan run': plan }, input: fetched });
  assert.equal(ok.skip, false);
  assert.deepEqual(ok.loaded, ['2026-11-22']);
  assert.match(ok.user, /\[2026-11-22#2\] GPGME 2\.3\.1/);
  assert.deepEqual(ok.schema.required, ['vulns']);
  const [paused] = run('Vulns prompt', { nodes: { 'Plan run': plan.map((p) => ({ ...p, paused: true })) }, input: fetched });
  assert.equal(paused.skip, true);
  assert.deepEqual(paused.loaded, []);
  const [none] = run('Vulns prompt', { nodes: { 'Plan run': plan }, input: [{ statusCode: 404, data: '' }, { statusCode: 500, data: '' }] });
  assert.equal(none.skip, true);
  const [broken] = run('Vulns prompt', { nodes: { 'Plan run': plan }, input: [{ statusCode: 200, data: '{oops' }, { statusCode: 200, data: '' }] });
  assert.equal(broken.skip, true);
});

test('Merge findings adds rows, marks loaded editions processed, survives a failed call and stops on credits', () => {
  const prompt = { skip: false, loaded: ['2026-11-22'], editions: [edition('2026-11-22')] };
  const nodes = { 'Vulns prompt': [prompt], 'Read log': [{}] };
  const [ok] = run('Merge findings', { nodes, input: [{ ok: true, data: { vulns: [finding] } }] });
  assert.deepEqual(ok.rows.map((r) => r.cve_id), ['CVE-2026-129975']);
  assert.equal(ok.changed.length, 1);
  assert.deepEqual(ok.processed, [{ date: '2026-11-22', found: 1 }]);
  const [failed] = run('Merge findings', { nodes, input: [{ error: 'TRUNCATED: vulns' }] });
  assert.deepEqual(failed.rows, []);
  assert.deepEqual(failed.processed, []);
  const [skipped] = run('Merge findings', { nodes: { 'Vulns prompt': [{ skip: true, loaded: [], editions: [] }], 'Read log': [{}] }, input: [{ skip: true }] });
  assert.deepEqual(skipped.processed, []);
  assert.throws(() => run('Merge findings', { nodes, input: [{ error: { message: 'CREDITS: vulns HTTP 400' } }] }), /CREDITS:/);
});

test('Check queue emits one item per CVE to look up, or a single none', () => {
  const row = { vuln_key: 'CVE-2026-129975', cve_id: 'CVE-2026-129975', status: 'open', first_date: '2026-11-22', checked_at: '' };
  assert.deepEqual(run('Check queue', { nodes: { 'Merge findings': [{ rows: [row], changed: [], processed: [] }] } }), [{ cve_id: 'CVE-2026-129975' }]);
  assert.deepEqual(run('Check queue', { nodes: { 'Merge findings': [{ rows: [], changed: [], processed: [] }] } }), [{ none: true }]);
});

test('Apply checks pairs answers with CVEs by order and survives error bodies', () => {
  const row = { vuln_key: 'CVE-2026-125396', cve_id: 'CVE-2026-125396', status: 'open', first_date: '2026-11-22', checked_at: '', fixed_in: '', severity: '' };
  const osv = readFileSync(new URL('./fixtures/osv-CVE-2026-125396.json', import.meta.url), 'utf8');
  const nodes = {
    'Merge findings': [{ rows: [row], changed: [], processed: [{ date: '2026-11-22', found: 1 }] }],
    'Check queue': [{ cve_id: 'CVE-2026-125396' }],
    OSV: [{ statusCode: 200, data: osv }],
  };
  const [out] = run('Apply checks', { nodes, input: [{ statusCode: 403, data: 'Forbidden' }] });
  assert.equal(out.rows[0].status, 'patched');
  assert.equal(out.rows[0].fixed_in, '10.08.0');
  assert.equal(out.changed.length, 1);
  assert.deepEqual(out.processed, [{ date: '2026-11-22', found: 1 }]);
  const [none] = run('Apply checks', { nodes: { ...nodes, 'Check queue': [{ none: true }], OSV: [{ statusCode: 404, data: '' }] }, input: [{ statusCode: 404, data: '' }] });
  assert.equal(none.rows[0].checked_at, '');
  assert.deepEqual(none.changed, []);
});

test('Changed rows and Processed runs feed the tables', () => {
  const row = { vuln_key: 'K', cve_id: 'CVE-2026-1', packages: '[]' };
  assert.deepEqual(run('Changed rows', { input: [{ rows: [row], changed: [row], processed: [] }] }), [row]);
  assert.deepEqual(run('Changed rows', { input: [{ rows: [], changed: [], processed: [] }] }), []);
  const runs = run('Processed runs', { input: [{ rows: [], changed: [], processed: [{ date: '2026-11-22', found: 2 }] }] });
  assert.equal(runs[0].date, '2026-11-22');
  assert.equal(runs[0].found, 2);
  assert.match(runs[0].processed_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('Build files says same when the site already has these files', () => {
  const row = { vuln_key: 'CVE-2026-1', cve_id: 'CVE-2026-1', product: 'P', summary: 's', severity: '', status: 'open', fixed_in: '', first_date: '2026-11-22', checked_at: '', patched_at: '', story_date: '2026-11-22', story_n: 2, story_title: 't', packages: '[]', sources: '[]', affected: '', agent_text: '' };
  const nodes = (json, md) => ({
    'Apply checks': [{ rows: [row], changed: [], processed: [] }],
    'Plan run': [{ today: '2026-11-23' }],
    'GitHub: main ref': [{ object: { sha: 'head1' } }],
    'GitHub: base commit': [{ tree: { sha: 'tree1' } }],
    'GitHub: current luki.json': [json],
    'GitHub: current luki.md': [md],
  });
  const [first] = run('Build files', { nodes: nodes({ statusCode: 404, data: '' }, { statusCode: 404, data: '' }) });
  assert.equal(first.same, false);
  assert.equal(first.head, 'head1');
  assert.equal(first.base_tree, 'tree1');
  assert.equal(first.message, 'Update the vulnerability log for 2026-11-23.');
  assert.equal(first.tree.length, 2);
  const [again] = run('Build files', { nodes: nodes({ statusCode: 200, data: first.tree[0].content }, { statusCode: 200, data: first.tree[1].content }) });
  assert.equal(again.same, true);
});

test('the workflow runs at 06:30, waits 7 s between NVD calls, uses Haiku through PPAI · claude and its own tables', () => {
  assert.match(src, /triggerAtHour: 6, triggerAtMinute: 30/);
  assert.match(src, /batchSize: 1, batchInterval: 7000/);
  assert.match(src, /cachedResultName: 'PPAI · claude'/);
  assert.match(src, /step: 'vulns'/);
  assert.match(src, /model: 'claude-haiku-5-5'/);
  assert.match(src, /cachedResultName: 'vuln_log'/);
  assert.match(src, /cachedResultName: 'vuln_runs'/);
  assert.match(src, /operation: 'upsert'/);
  assert.match(src, /keyName: 'vuln_key'/);
  assert.match(src, /workflow\('ppai-vulns', 'PPAI · luki'\)/);
});
