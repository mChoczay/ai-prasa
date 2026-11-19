// News candidates from RSS items, the Haiku triage prompt, and applying the triage.
// Imports are stripped by scripts/inline-lib.mjs; inline news.js alongside this file.
import { dedupeCandidates } from './news.js';

// No global URL in the n8n Code sandbox: read the host with a regex.
function _host(url) {
  const m = String(url || '').match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

function _clean(text, max) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// RSS Read node items -> [{idx, title, url, source, published_at, snippet}], newest first.
function buildCandidateList(items, { now = new Date(), maxAgeHours = 30, max = 150 } = {}) {
  const oldest = now.getTime() - maxAgeHours * 3_600_000;
  const fresh = (items || [])
    .filter((it) => it && typeof it.title === 'string' && it.title.trim() && typeof it.link === 'string' && it.link)
    .map((it) => {
      const ms = Date.parse(it.isoDate || it.pubDate || '');
      return {
        title: _clean(it.title, 300),
        url: it.link,
        source: _host(it.link),
        published_ms: ms,
        snippet: _clean(it.contentSnippet || it.content || it.summary || '', 300),
      };
    })
    .filter((c) => Number.isFinite(c.published_ms) && c.published_ms >= oldest && c.published_ms <= now.getTime() + 3_600_000);
  return dedupeCandidates(fresh)
    .sort((a, b) => b.published_ms - a.published_ms)
    .slice(0, max)
    .map((c, idx) => ({
      idx,
      title: c.title,
      url: c.url,
      source: c.source,
      published_at: new Date(c.published_ms).toISOString(),
      snippet: c.snippet,
    }));
}

function filterPrompt(candidates, history) {
  const covered = (history || []).map((h) => `- ${h.title}`).join('\n') || '- (none)';
  const list = (candidates || [])
    .map((c) => `[${c.idx}] ${c.title} — ${c.source} — ${String(c.published_at).slice(0, 16)}\n    ${c.snippet}`)
    .join('\n');
  return `Topics already covered in the last 7 days:\n${covered}\n\nCandidates:\n${list}`;
}

// Merge Haiku's triage into the candidates: keep=true only, importance clamped 1..5, sorted by importance
// then recency, capped at max.
function applyTriage(candidates, triage, { max = 15 } = {}) {
  if (!triage || !Array.isArray(triage.items)) return [];
  const byIdx = new Map((candidates || []).map((c) => [c.idx, c]));
  return triage.items
    .filter((t) => t && t.keep && byIdx.has(t.idx))
    .map((t) => ({ ...byIdx.get(t.idx), category: t.category, importance: Math.min(5, Math.max(1, Math.round(Number(t.importance) || 1))) }))
    .sort((a, b) => b.importance - a.importance || String(b.published_at).localeCompare(String(a.published_at)))
    .slice(0, max);
}

export { buildCandidateList, filterPrompt, applyTriage };
