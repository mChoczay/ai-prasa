// News candidate helpers. Dependency-free: inlined into n8n Code nodes.

const _TRACKING_PARAMS = new Set(['ref', 'fbclid']);

function normalizeUrl(url) {
  const u = new URL(url);
  const host = u.host.toLowerCase().replace(/^www\./, '');
  const params = new URLSearchParams();
  for (const [key, value] of u.searchParams) {
    if (key.toLowerCase().startsWith('utm_') || _TRACKING_PARAMS.has(key.toLowerCase())) continue;
    params.append(key, value);
  }
  let path = u.pathname;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  const search = params.toString();
  return `${u.protocol}//${host}${path}${search ? `?${search}` : ''}`;
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
