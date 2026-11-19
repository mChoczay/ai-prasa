// News candidate helpers. Dependency-free: inlined into n8n Code nodes.

const _TRACKING_PARAMS = new Set(['ref', 'fbclid']);

// The n8n Code sandbox has no global URL / URLSearchParams, so URLs are split with a regex.
function _splitUrl(url) {
  const m = String(url || '').match(/^([a-z][a-z0-9+.-]*:)\/\/([^/?#]+)([^?#]*)(\?[^#]*)?/i);
  if (!m) throw new Error(`invalid url: ${url}`);
  return { protocol: m[1].toLowerCase(), host: m[2].toLowerCase(), path: m[3] || '/', query: m[4] ? m[4].slice(1) : '' };
}

function normalizeUrl(url) {
  const u = _splitUrl(url);
  const host = u.host.replace(/^www\./, '');
  const params = u.query
    .split('&')
    .filter(Boolean)
    .filter((pair) => {
      const key = pair.split('=')[0].toLowerCase();
      return !key.startsWith('utm_') && !_TRACKING_PARAMS.has(key);
    });
  let path = u.path;
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/';
  return `${u.protocol}//${host}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

// normalizeUrl that never throws: invalid input comes back as the plain string.
function safeNormalizeUrl(url) {
  try {
    return normalizeUrl(url);
  } catch {
    return String(url || '');
  }
}

function _fold(text) {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function _normalizeTitle(title) {
  return _fold(title)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupeCandidates(items) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const kept = [];
  for (const item of items) {
    let urlKey;
    try {
      urlKey = normalizeUrl(item.url);
    } catch {
      urlKey = item.url;
    }
    const titleKey = _normalizeTitle(item.title || '');
    if (seenUrls.has(urlKey) || (titleKey && seenTitles.has(titleKey))) continue;
    seenUrls.add(urlKey);
    if (titleKey) seenTitles.add(titleKey);
    kept.push(item);
  }
  return kept;
}

const _ENTITIES = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '„', amp: '&' };

function _decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    const named = _ENTITIES[code.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

function _plain(fragment) {
  return _decodeEntities(fragment.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const MIN_PARAGRAPH_CHARS = 60;
const MIN_PARAGRAPH_TEXT = 500;

// Article text from a page: the long <p> paragraphs when they hold enough text (this skips menus and
// teasers), otherwise the whole page without scripts and navigation.
function extractArticleText(html, maxChars = 12000) {
  const page = (html || '').replace(/<(script|style|nav|header|footer|aside|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const paragraphs = [...page.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => _plain(m[1])).filter((t) => t.length > MIN_PARAGRAPH_CHARS);
  const joined = paragraphs.join('\n\n');
  const text = joined.length >= MIN_PARAGRAPH_TEXT ? joined : _plain(page);
  return text.slice(0, maxChars);
}

function entityId(name) {
  return _fold(name || '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export { normalizeUrl, safeNormalizeUrl, dedupeCandidates, extractArticleText, entityId };
