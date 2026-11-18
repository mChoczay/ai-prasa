import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, dedupeCandidates, extractArticleText, entityId } from '../n8n/lib/news.js';

test('normalizeUrl strips www, tracking params, hash and trailing slash', () => {
  assert.equal(normalizeUrl('https://www.Example.com/a/?utm_source=x&id=2#top'), 'https://example.com/a?id=2');
});

test('normalizeUrl strips ref and fbclid and keeps root path', () => {
  assert.equal(normalizeUrl('https://example.com/?ref=hn&fbclid=abc'), 'https://example.com/');
});

const item = (title, url) => ({ title, url, source: 's', published_at: '2026-11-18T06:00:00Z' });

test('dedupeCandidates drops a URL duplicate and a title duplicate, keeping the first', () => {
  const items = [
    item('OpenAI ships a new model', 'https://example.com/a'),
    item('Totally different headline', 'https://www.example.com/a/?utm_medium=rss'),
    item('openai ships a NEW model!', 'https://other.com/b'),
    item('Mistral raises a round', 'https://news.com/c'),
  ];
  const kept = dedupeCandidates(items);
  assert.deepEqual(kept.map((i) => i.url), ['https://example.com/a', 'https://news.com/c']);
});

test('dedupeCandidates treats diacritics as equal in titles', () => {
  const kept = dedupeCandidates([item('Łódź startuje', 'https://a.pl/1'), item('Lodz startuje', 'https://b.pl/2')]);
  assert.equal(kept.length, 1);
});

test('extractArticleText drops scripts and navigation and decodes entities', () => {
  assert.equal(
    extractArticleText('<html><script>x()</script><nav>menu</nav><p>Ala &amp; kot</p></html>'),
    'Ala & kot',
  );
});

test('extractArticleText drops style, header, footer, aside and collapses whitespace', () => {
  const html = '<style>p{}</style><header>H</header><p>One&nbsp;two\n\n  three &quot;q&quot; &#39;s&#39; &lt;b&gt;</p><aside>A</aside><footer>F</footer>';
  assert.equal(extractArticleText(html), 'One two three "q" \'s\' <b>');
});

test('extractArticleText truncates to maxChars', () => {
  const out = extractArticleText(`<p>${'a'.repeat(50)}</p>`, 10);
  assert.equal(out, 'a'.repeat(10));
});

test('entityId simple', () => {
  assert.equal(entityId('Mistral AI'), 'mistral-ai');
});

test('entityId with Polish characters and dots', () => {
  assert.equal(entityId('Żabka Łódź 2.0'), 'zabka-lodz-2-0');
});

test('entityId trims separators', () => {
  assert.equal(entityId('  --GPT (5)--  '), 'gpt-5');
});
