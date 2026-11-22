import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/edit.workflow.js';
const src = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const words = (n) => Array.from({ length: n }, () => 'słowo').join(' ');
const payload = {
  date: '2026-11-22',
  run_id: 'r',
  relay: true,
  stop_after: '',
  flags: { weekly: false, monthly: false },
  feedback: 'Notes from the reader: masło maślane',
  edition: { date: '2026-11-22', lead_story: { title: 'Lead', lede: 'l', body: `Badacze: 2 mln. ${words(60)}`, for_you: 'f' }, stories: [], weekly: null, monthly: null, minutes: 5 },
};

test('the edit prompt carries the stories, the schema and the reader feedback', () => {
  const [{ json }] = runCodeNode(codeNodeSource(WF, 'Build edit prompt'), { nodes: { 'Edit request': [payload] } });
  assert.match(json.user, /### Story idx 0\nTitle: Lead/);
  assert.match(json.user, /## Reader feedback\nNotes from the reader: masło maślane/);
  assert.deepEqual(json.schema.required, ['stories', 'supplements']);
});

test('apply edits uses a good edit, keeps the payload and lists what was kept', () => {
  const code = codeNodeSource(WF, 'Apply edits');
  const answer = { ok: true, data: { stories: [{ idx: 0, lede: 'Nowy.', body: `Badacze: 2 mln. ${words(40)}`, for_you: 'f' }], supplements: [] } };
  const [{ json }] = runCodeNode(code, { nodes: { 'Edit request': [payload] }, input: [answer] });
  assert.equal(json.edition.lead_story.lede, 'Nowy.');
  assert.equal(json.feedback, payload.feedback);
  assert.equal(json.relay, true);
  assert.deepEqual(json.edit_kept, []);
  assert.equal(json.edited, true);
});

test('apply edits passes the edition on unchanged when the editor failed, but stops on credits', () => {
  const code = codeNodeSource(WF, 'Apply edits');
  const [{ json }] = runCodeNode(code, { nodes: { 'Edit request': [payload] }, input: [{ error: 'TRUNCATED: edit' }] });
  assert.deepEqual(json.edition, payload.edition);
  assert.equal(json.edited, false);
  assert.throws(() => runCodeNode(code, { nodes: { 'Edit request': [payload] }, input: [{ error: { message: 'CREDITS: edit HTTP 400' } }] }), /CREDITS:/);
});

test('the editor runs on Sonnet with its own prompt and schema, and hands on to profiles', () => {
  const wf = src(WF);
  assert.match(wf, /model: 'claude-sonnet-5-5'/);
  assert.match(wf, /system: TEXT\('prompts\/edit\.md'\)/);
  assert.match(wf, /JSONTEXT\('schemas\/edit\.schema\.json'\)/);
  assert.match(wf, /onError: 'continueRegularOutput'/);
  assert.match(wf, /value: 'JlzjHDGeEemYMhQr', cachedResultName: 'PPAI · profiles'/);
  assert.match(wf, /stop_after !== 'edit'/);
});

test('front and period hand the edition to the editor instead of profiles', () => {
  for (const file of ['n8n/workflows/front.workflow.js', 'n8n/workflows/period.workflow.js']) {
    const wf = src(file);
    assert.match(wf, /name: 'Hand to editor'/, file);
    assert.match(wf, /cachedResultName: 'PPAI · redakcja'/, file);
    assert.doesNotMatch(wf, /cachedResultName: 'PPAI · profiles'/, file);
  }
});
