import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadConfig,
  saveConfig,
  clearConfig,
  storedRating,
  rememberRating,
  feedbackBlock,
  buildRequest,
  initFeedback,
} from '../site/js/feedback.js';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('saveConfig keeps only https urls with a key', () => {
  const s = mem();
  assert.equal(saveConfig(s, 'http://x.example/h', 'k'), false);
  assert.equal(saveConfig(s, 'https://x.example/h', ''), false);
  assert.equal(saveConfig(s, 'javascript:alert(1)', 'k'), false);
  assert.equal(loadConfig(s), null);
  assert.equal(saveConfig(s, 'https://x.example/h', 'k1'), true);
  assert.deepEqual(loadConfig(s), { url: 'https://x.example/h', key: 'k1' });
  clearConfig(s);
  assert.equal(loadConfig(s), null);
});

test('loadConfig ignores a broken or forged stored value', () => {
  const s = mem();
  s.setItem('ppai.feedback', '{nope');
  assert.equal(loadConfig(s), null);
  s.setItem('ppai.feedback', JSON.stringify({ url: 'http://x.example/h', key: 'k' }));
  assert.equal(loadConfig(s), null);
});

test('ratings are remembered per edition page', () => {
  const s = mem();
  rememberRating(s, '2026-11-19', 2, 'less');
  assert.equal(storedRating(s, '2026-11-19', 2), 'less');
  assert.equal(storedRating(s, '2026-11-19', 3), '');
  rememberRating(s, '2026-11-19', 2, '');
  assert.equal(storedRating(s, '2026-11-19', 2), '');
  s.setItem('ppai.rating.2026-11-19.4', 'bogus');
  assert.equal(storedRating(s, '2026-11-19', 4), '');
});

test('feedbackBlock has the three buttons, the note link and marks the chosen rating', () => {
  const html = feedbackBlock(2, 'more');
  assert.match(html, /Jak dla Ciebie\?/);
  assert.match(html, /data-rate="more"[^>]*aria-pressed="true"[^>]*>więcej takich/);
  assert.match(html, /data-rate="ok"[^>]*aria-pressed="false"[^>]*>w sam raz/);
  assert.match(html, /data-rate="less"[^>]*aria-pressed="false"[^>]*>mniej takich/);
  assert.match(html, /dodaj uwagę/);
  assert.match(html, /maxlength="1000"/);
  assert.match(html, /trafi do jutrzejszego wydania/);
  assert.match(html, /placeholder="np\. za dużo o giełdzie, a za mało o tym, jak tego użyć"/);
  assert.match(html, />Zapisz</);
});

test('feedbackBlock escapes its inputs', () => {
  const html = feedbackBlock('<script>', '"><script>');
  assert.ok(!html.includes('<script>'));
});

test('buildRequest posts text/plain JSON with the key and only known fields', () => {
  const r = buildRequest({ url: 'https://x.example/h', key: 'k1' }, { date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok', extra: 1 });
  assert.equal(r.url, 'https://x.example/h');
  assert.equal(r.init.method, 'POST');
  assert.equal(r.init.headers['Content-Type'], 'text/plain');
  assert.deepEqual(JSON.parse(r.init.body), { k: 'k1', date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok' });
  const note = buildRequest({ url: 'https://x.example/h', key: 'k1' }, { date: '2026-11-19', n: 2, title: 'T', category: 'modele', note: 'uwaga' });
  assert.deepEqual(JSON.parse(note.init.body), { k: 'k1', date: '2026-11-19', n: 2, title: 'T', category: 'modele', note: 'uwaga' });
});

// --- rating controller (fake DOM) ---
import { readFileSync } from 'node:fs';
import { El, fakeBlock, memStorage } from './helpers/fake-dom.js';

const resp = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const flush = () => new Promise((r) => setImmediate(r));
const setup = (respond) => {
  const storage = memStorage();
  saveConfig(storage, 'https://x.example/h', 'k1');
  const root = new El('div', { cls: 'reader' });
  const b1 = fakeBlock(1);
  const b2 = fakeBlock(2);
  root.append(b1.block, b2.block);
  const life = new El('window');
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(init);
    return respond(init);
  };
  const pages = [
    { n: 1, kind: 'story', story: { title: 'A', category: 'modele' } },
    { n: 2, kind: 'story', story: { title: 'B', category: 'modele' } },
  ];
  const dispose = initFeedback(root, { config: loadConfig(storage), edition: { date: '2026-11-19' }, pages, storage, fetchFn, onDisabled: () => {}, lifecycle: life });
  return { storage, root, b1, b2, life, calls, dispose };
};

test('a rejected key keeps a typed note on screen with the message instead of dropping it', async () => {
  const s = setup(() => resp(401, { ok: false, reason: 'key' }));
  s.b1.textarea.value = 'długa uwaga';
  s.root.dispatch('click', s.b1.save);
  await flush();
  await flush();
  assert.ok(s.root.querySelectorAll('.feedback').includes(s.b1.block));
  assert.equal(s.b1.textarea.value, 'długa uwaga');
  assert.equal(s.b1.block.querySelector('.fb-msg').textContent, 'Oceny wyłączone, włącz je linkiem z maila');
  assert.equal(s.b1.block.querySelector('.fb-row').hidden, true);
  assert.ok(!s.root.querySelectorAll('.feedback').includes(s.b2.block));
  assert.equal(loadConfig(s.storage), null);
});

test('focus in the note field marks the reader as typing so swipes stop', () => {
  const s = setup(() => resp(200, { ok: true }));
  s.root.dispatch('focusin', s.b1.textarea);
  assert.ok(s.root.classList.contains('typing'));
  s.root.dispatch('focusout', s.b1.textarea);
  assert.ok(!s.root.classList.contains('typing'));
  const css = readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.reader\.typing \.pages\s*\{[^}]*overflow-x:\s*hidden/);
});

test('a pending rating is sent at once with keepalive when the page is hidden', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = setup(() => resp(200, { ok: true }));
  s.root.dispatch('click', s.b1.rates[0]);
  assert.equal(s.calls.length, 0);
  s.life.dispatch('pagehide');
  await flush();
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].keepalive, true);
  assert.equal(JSON.parse(s.calls[0].body).rating, 'more');
  t.mock.timers.tick(3000);
  await flush();
  assert.equal(s.calls.length, 1);
});

test('a server without its settings answers 503 and the site keeps ratings on', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = setup(() => resp(503, { ok: false }));
  s.root.dispatch('click', s.b1.rates[2]);
  t.mock.timers.tick(2000);
  await flush();
  await flush();
  assert.equal(s.b1.block.querySelector('.fb-msg').textContent, 'Nie zapisano, spróbuj jeszcze raz');
  assert.notEqual(loadConfig(s.storage), null);
});

test('storage that refuses writes never throws out of saveConfig or rememberRating', () => {
  const bad = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  assert.equal(saveConfig(bad, 'https://x.example/h', 'k'), false);
  assert.doesNotThrow(() => rememberRating(bad, '2026-11-19', 1, 'more'));
});

test('requests are sent with keepalive so they survive the tab closing', () => {
  assert.equal(buildRequest({ url: 'https://x.example/h', key: 'k' }, { date: '2026-11-19', n: 1, title: 'T', category: 'c', rating: 'ok' }).init.keepalive, true);
});

test('a failed older send does not undo a newer rating', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let release;
  const s = setup((init) => (JSON.parse(init.body).rating === 'more' ? new Promise((r) => { release = () => r(resp(500, { ok: false })); }) : resp(200, { ok: true })));
  s.root.dispatch('click', s.b1.rates[0]);
  t.mock.timers.tick(2000);
  await flush();
  s.root.dispatch('click', s.b1.rates[2]);
  release();
  await flush();
  await flush();
  assert.equal(s.b1.rates[2].getAttribute('aria-pressed'), 'true');
  assert.equal(s.b1.rates[0].getAttribute('aria-pressed'), 'false');
  assert.equal(storedRating(s.storage, '2026-11-19', 1), 'less');
  t.mock.timers.tick(2000);
  await flush();
  await flush();
  assert.equal(s.b1.rates[2].getAttribute('aria-pressed'), 'true');
  assert.equal(JSON.parse(s.calls.at(-1).body).rating, 'less');
});
