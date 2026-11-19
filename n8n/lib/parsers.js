// Parsers for leaderboard sources. Each returns [{rank, model, org, score}] with rank = 1..n, or null on an
// unexpected shape. They never throw. Dependency-free: inlined into n8n Code nodes.

function _json(input) {
  if (input && typeof input === 'object') return input;
  try {
    return JSON.parse(String(input));
  } catch {
    return null;
  }
}

function _ranked(rows) {
  if (!rows.length) return null;
  return rows.map((r, i) => ({ rank: i + 1, model: r.model, org: r.org, score: r.score }));
}

// LMArena official dataset (huggingface.co/datasets/lmarena-ai/leaderboard-dataset), datasets-server /rows or
// /filter response: {rows: [{row: {model_name, organization, rating, rank, category}}]}.
function parseLmarena(input) {
  const data = _json(input);
  if (!data || !Array.isArray(data.rows)) return null;
  const rows = data.rows
    .map((r) => r && r.row)
    .filter((r) => r && r.category === 'overall' && typeof r.model_name === 'string' && Number.isFinite(r.rating))
    .sort((a, b) => (a.rank - b.rank) || (b.rating - a.rating))
    .map((r) => ({ model: r.model_name, org: String(r.organization || ''), score: r.rating }));
  return _ranked(rows);
}

// Hugging Face models API (?sort=trendingScore): [{id: 'org/name', trendingScore}].
function parseHfTrending(input) {
  const data = _json(input);
  if (!Array.isArray(data)) return null;
  const rows = data
    .filter((m) => m && typeof m.id === 'string' && Number.isFinite(m.trendingScore))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .map((m) => ({ model: m.id, org: m.id.includes('/') ? m.id.split('/')[0] : '', score: m.trendingScore }));
  return _ranked(rows);
}

// Artificial Analysis free API (/api/v2/language/models/free), one page or an array of pages:
// {data: [{name, model_creator: {name}, evaluations: {artificial_analysis_intelligence_index}}]}.
function parseAaModels(input) {
  const parsed = _json(input);
  const pages = Array.isArray(parsed) ? parsed : [parsed];
  if (!pages.length || !pages.every((p) => p && Array.isArray(p.data))) return null;
  const rows = pages
    .flatMap((p) => p.data)
    .filter((m) => m && typeof m.name === 'string' && m.evaluations && Number.isFinite(m.evaluations.artificial_analysis_intelligence_index))
    .sort((a, b) => b.evaluations.artificial_analysis_intelligence_index - a.evaluations.artificial_analysis_intelligence_index)
    .map((m) => ({
      model: m.name,
      org: String((m.model_creator && m.model_creator.name) || ''),
      score: m.evaluations.artificial_analysis_intelligence_index,
    }));
  return _ranked(rows);
}

// Massive (formerly Polygon) daily aggregates, /v2/aggs/ticker/{T}/range/1/day/{from}/{to}:
// {results: [{t: bar start in ms, c: close}]} -> [{date: 'YYYY-MM-DD', close}] ascending, or null.
function parseMassiveAggs(input) {
  const data = _json(input);
  if (!data || !Array.isArray(data.results) || !data.results.length) return null;
  const rows = data.results
    .filter((b) => b && Number.isFinite(b.t) && Number.isFinite(b.c))
    .map((b) => ({ date: new Date(b.t).toISOString().slice(0, 10), close: b.c }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows.length ? rows : null;
}

// Massive grouped daily (/v2/aggs/grouped/locale/us/market/stocks/{date}), one or several days:
// [{results: [{T: ticker, t: ms, c: close}]}] -> {TICKER: [{date, close}] ascending}, or null.
function parseMassiveGrouped(input) {
  const parsed = _json(input);
  const days = (Array.isArray(parsed) ? parsed : [parsed]).filter((d) => d && Array.isArray(d.results));
  if (!days.length) return null;
  const series = {};
  for (const day of days) {
    for (const bar of day.results) {
      if (!bar || typeof bar.T !== 'string' || !Number.isFinite(bar.t) || !Number.isFinite(bar.c)) continue;
      (series[bar.T] = series[bar.T] || []).push({ date: new Date(bar.t).toISOString().slice(0, 10), close: bar.c });
    }
  }
  for (const list of Object.values(series)) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return series;
}

// Leaderboards list the same model in several settings ('X (High)', 'X (Max)'). Keep the best-ranked row per
// base name, label it with the base name, remember the setting in `variant`, and re-rank 1..n.
function collapseVariants(rows) {
  if (!Array.isArray(rows)) return null;
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const m = String(r.model).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    const base = m ? m[1].trim() : String(r.model).trim();
    if (seen.has(base.toLowerCase())) continue;
    seen.add(base.toLowerCase());
    out.push({ rank: out.length + 1, model: base, org: r.org, score: r.score, variant: m ? m[2].trim() : null });
  }
  return out;
}

export { parseLmarena, parseHfTrending, parseAaModels, parseMassiveAggs, parseMassiveGrouped, collapseVariants };
