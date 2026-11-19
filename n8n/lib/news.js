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

function extractArticleText(html, maxChars = 12000) {
  const text = (html || '')
    .replace(/<(script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxChars);
}

function entityId(name) {
  return _fold(name || '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export { normalizeUrl, dedupeCandidates, extractArticleText, entityId };
