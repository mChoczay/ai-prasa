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

// Artificial Analysis free API (/api/v2/language/models/free):
// {data: [{name, model_creator: {name}, evaluations: {artificial_analysis_intelligence_index}}]}.
function parseAaModels(input) {
  const data = _json(input);
  if (!data || !Array.isArray(data.data)) return null;
  const rows = data.data
    .filter((m) => m && typeof m.name === 'string' && m.evaluations && Number.isFinite(m.evaluations.artificial_analysis_intelligence_index))
    .sort((a, b) => b.evaluations.artificial_analysis_intelligence_index - a.evaluations.artificial_analysis_intelligence_index)
    .map((m) => ({
      model: m.name,
      org: String((m.model_creator && m.model_creator.name) || ''),
      score: m.evaluations.artificial_analysis_intelligence_index,
    }));
  return _ranked(rows);
}

export { parseLmarena, parseHfTrending, parseAaModels };
