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
