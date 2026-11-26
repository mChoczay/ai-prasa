import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findLeaks } from './helpers/leaks.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
// A made-up instance, built from parts so this file does not match its own patterns.
const host = ['example-instance', '.app.', 'n8n', '.cloud'].join('');

test('findLeaks catches an n8n host, API keys, tokens and real e-mail addresses', () => {
  assert.deepEqual(findLeaks(`url: 'https://${host}/webhook/abc'`), ['n8n instance host']);
  assert.deepEqual(findLeaks('key = "sk-ant-' + 'api03-abcdefghijklmnopqrstuvwxyz012345"'), ['Anthropic API key']);
  assert.deepEqual(findLeaks('token: gh' + 'p_' + 'a'.repeat(36)), ['GitHub token']);
  assert.deepEqual(findLeaks('github_' + 'pat_' + 'A1'.repeat(20)), ['GitHub token']);
  assert.deepEqual(findLeaks('Authorization: Bearer ' + 'x'.repeat(40)), ['Bearer token']);
  assert.deepEqual(findLeaks('mail to someone' + '@' + 'gmail.com please'), ['e-mail address']);
  // A role mailbox on a free-mail domain can be anyone's private address.
  assert.deepEqual(findLeaks('security' + '@' + 'gmail.com'), ['e-mail address']);
});

test('findLeaks lets public role mailboxes quoted in the news through', () => {
  // Editions quote where to report a bug, e.g. the Linux kernel security team.
  for (const ok of ['zgłoszenia na security@kernel.org', 'psirt@cisco.com', 'abuse@example.net', 'press@openai.com']) {
    assert.deepEqual(findLeaks(ok), [], ok);
  }
});

test('findLeaks lets placeholders and project text through', () => {
  for (const ok of [
    "url: 'https://n8n.example/webhook/x'",
    "to: 'owner@example.com'",
    "value: 'Bearer <klucz>'",
    'Authorization: Bearer TU_WKLEJ_KLUCZ',
    'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>',
    "credentials: { httpCustomAuth: { id: 'QYvsrmr12EumLOFG', name: 'GoatCunter' } }",
    'https://api-prasa.goatcounter.com/count',
  ]) {
    assert.deepEqual(findLeaks(ok), [], ok);
  }
});

test('no tracked file leaks the n8n host, keys, tokens or a private e-mail', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const leaks = [];
  for (const file of files) {
    if (/\.(png|jpg|jpeg|gif|ico|webp)$/i.test(file)) continue;
    const text = readFileSync(ROOT + file, 'utf8');
    for (const kind of findLeaks(text)) leaks.push(`${file}: ${kind}`);
  }
  assert.deepEqual(leaks, []);
});
