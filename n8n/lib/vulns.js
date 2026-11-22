// The vulnerability log ("Luki"): CVEs written about in published editions, their fix status kept current
// from NVD and OSV, published as site/data/luki.json (the page) and site/data/luki.md (for an agent).
// Dependency-free: inlined into n8n Code nodes by scripts/inline-lib.mjs.

const VULN_CVE = /^CVE-\d{4}-\d{4,}$/;
const VULN_SEVERITIES = Object.freeze(['krytyczna', 'wysoka', 'średnia', 'niska']);
const VULN_BODY_CHARS = 1500;
const _VULN_DAY_MS = 86_400_000;

function _vShift(date, days) {
  const [y, m, d] = String(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * _VULN_DAY_MS).toISOString().slice(0, 10);
}

function _vText(value) {
  return value == null ? '' : String(value).trim();
}

// The oldest days of the last week (today included) that have not been read yet.
function editionDatesToRead(today, processedDates, { daysBack = 7, max = 2 } = {}) {
  const done = new Set(processedDates || []);
  const out = [];
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const date = _vShift(today, -i);
    if (!done.has(date)) out.push(date);
  }
  return out.slice(0, max);
}

// Each story of an edition with its reader page: the lead is page 1, then the stories in order.
function storyRefs(edition) {
  const e = edition || {};
  const slots = [e.lead_story || null, ...(e.stories || [])];
  const out = [];
  slots.forEach((s, i) => {
    if (!s) return;
    const n = i + 1;
    out.push({ ref: `${e.date}#${n}`, date: e.date, n, title: _vText(s.title), lede: _vText(s.lede), body: _vText(s.body), sources: Array.isArray(s.sources) ? s.sources : [] });
  });
  return out;
}

function vulnsPrompt(editions) {
  const blocks = [];
  for (const e of editions || []) {
    for (const s of storyRefs(e)) {
      const urls = s.sources.map((src) => src && src.url).filter(Boolean).join(' ');
      blocks.push(`[${s.ref}] ${s.title}\n${s.lede}\n${s.body.slice(0, VULN_BODY_CHARS)}\nSources: ${urls}`);
    }
  }
  return `Stories (ref in brackets):\n\n${blocks.join('\n\n')}`;
}

function _vEmptyRow(cve) {
  return {
    vuln_key: cve, cve_id: cve, product: '', packages: '[]', affected: '', fixed_in: '', severity: '', severity_source: '',
    status: 'open', status_source: '', summary: '', agent_text: '', first_date: '', story_date: '', story_n: 0, story_title: '',
    sources: '[]', checked_at: '', patched_at: '',
  };
}

// Findings from Haiku merged into the log rows (keyed by CVE). New CVEs are added; a known CVE only gets
// its empty fields filled, and a fix named by a later article patches it. The first article stays linked.
function mergeFindings(rows, answer, editions, now) {
  const byKey = new Map((rows || []).map((r) => [r.vuln_key, { ...r }]));
  const refs = new Map();
  for (const e of editions || []) for (const s of storyRefs(e)) refs.set(s.ref, s);
  const changed = new Set();
  const list = answer && Array.isArray(answer.vulns) ? answer.vulns : [];
  for (const f of list) {
    if (!f) continue;
    const cve = _vText(f.cve_id).toUpperCase();
    const story = refs.get(_vText(f.story_ref));
    if (!VULN_CVE.test(cve) || !story) continue;
    const fresh = !byKey.has(cve);
    const row = fresh ? _vEmptyRow(cve) : byKey.get(cve);
    const before = JSON.stringify(row);
    const fill = (key, value) => {
      if (!row[key] && value) row[key] = value;
    };
    fill('product', _vText(f.product));
    if (row.packages === '[]' && Array.isArray(f.packages) && f.packages.length) {
      row.packages = JSON.stringify(f.packages.filter((p) => p && p.name).map((p) => ({ ecosystem: _vText(p.ecosystem) || 'other', name: _vText(p.name) })));
    }
    fill('affected', _vText(f.affected));
    fill('fixed_in', _vText(f.fixed_in));
    const severity = _vText(f.severity_article);
    if (!row.severity && VULN_SEVERITIES.includes(severity)) {
      row.severity = severity;
      row.severity_source = 'article';
    }
    fill('summary', _vText(f.summary));
    fill('agent_text', _vText(f.agent_text));
    if (!row.first_date) {
      row.first_date = story.date;
      row.story_date = story.date;
      row.story_n = story.n;
      row.story_title = story.title;
      row.sources = JSON.stringify(story.sources.filter((s) => s && s.url).map((s) => ({ name: _vText(s.name), url: _vText(s.url) })));
    }
    if (row.status === 'open' && row.fixed_in) {
      row.status = 'patched';
      row.status_source = 'article';
      row.patched_at = now;
    }
    byKey.set(cve, row);
    if (fresh || JSON.stringify(row) !== before) changed.add(cve);
  }
  return { rows: [...byKey.values()], changed: [...changed].map((k) => byKey.get(k)) };
}

export { VULN_SEVERITIES, editionDatesToRead, storyRefs, vulnsPrompt, mergeFindings };
