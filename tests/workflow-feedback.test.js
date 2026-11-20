import test from 'node:test';
import assert from 'node:assert/strict';
import { codeNodeSource, runCodeNode } from './helpers/code-node.js';

const WF = 'n8n/workflows/feedback.workflow.js';
const KEY = 'k-123';
const body = { k: KEY, date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok' };
const check = (incoming, settings = [{ url: 'https://h.example/w', key: KEY }]) =>
  runCodeNode(codeNodeSource(WF, 'Check feedback'), { nodes: { 'Feedback in': [incoming], 'Read feedback settings': settings } })[0].json;

test('check feedback accepts a good rating from the site', () => {
  assert.deepEqual(check({ body }), { ok: true, row: { date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok', note: '' } });
  assert.equal(check({ body: JSON.stringify(body) }).ok, true);
});

test('check feedback rejects a wrong key, broken JSON and a missing settings row', () => {
  assert.deepEqual(check({ body: { ...body, k: 'nope' } }), { ok: false, status: 401 });
  assert.deepEqual(check({ body: '{nope' }), { ok: false, status: 400 });
  assert.deepEqual(check({ body }, [{}]), { ok: false, status: 503 });
  assert.deepEqual(check({ body }, [{ error: { message: 'table gone' } }]), { ok: false, status: 503 });
  assert.deepEqual(check({}), { ok: false, status: 400 });
});
