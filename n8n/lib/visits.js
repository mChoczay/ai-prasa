// Visitor numbers for the morning mail: on Mondays the past Monday–Sunday week, on the 1st the past month,
// both in Warsaw time, read from GoatCounter's /api/v0/stats/total. Dependency-free: inlined into n8n Code
// nodes (no URL / URLSearchParams there).

const VISITS_API = 'https://api-prasa.goatcounter.com/api/v0/stats/total';
const _DAY_MS = 86_400_000;

function _parts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function _isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Milliseconds Warsaw is ahead of UTC at instant t.
function _warsawOffset(t) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - t;
}

// Warsaw midnight starting the given calendar day, as a UTC ISO string rounded to the hour.
function _warsawMidnight(y, m, d) {
  const utcMidnight = Date.UTC(y, m - 1, d);
  // Clock changes happen at 01:00 UTC on a Sunday, never within hours of a Warsaw midnight.
  const ms = utcMidnight - _warsawOffset(utcMidnight - 2 * 3_600_000);
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

// GoatCounter includes the hour that starts at `end`, so a range stops one hour before the next period.
function _lastHourBefore(iso) {
  return new Date(Date.parse(iso) - 3_600_000).toISOString().replace('.000Z', 'Z');
}

function _range(kind, start, end) {
  return { kind, start, end, url: `${VISITS_API}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` };
}

function visitRanges(dateStr) {
  const p = _parts(dateStr);
  if (!p) return [];
  const [y, m, d] = p;
  const ranges = [];
  if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1) {
    const from = new Date(Date.UTC(y, m - 1, d) - 7 * _DAY_MS);
    ranges.push(_range('week', _warsawMidnight(from.getUTCFullYear(), from.getUTCMonth() + 1, from.getUTCDate()), _lastHourBefore(_warsawMidnight(y, m, d))));
  }
  if (d === 1) {
    const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
    ranges.push(_range('month', _warsawMidnight(py, pm, 1), _lastHourBefore(_warsawMidnight(y, m, 1))));
  }
  return ranges;
}

// bodies[i] answers ranges[i]; a body without a numeric total is skipped. Null when nothing is usable.
function visitSummary(ranges, bodies) {
  const out = {};
  (ranges || []).forEach((r, i) => {
    const b = (bodies || [])[i];
    if (!b || typeof b !== 'object' || !Number.isFinite(b.total)) return;
    if (r.kind === 'week') {
      // The start is the Warsaw midnight opening the past Monday (22:00 or 23:00 UTC on Sunday); noon after it is that Monday.
      const monday = Date.parse(r.start) + 12 * 3_600_000;
      const first = _isoDay(monday);
      const byDay = Object.fromEntries((Array.isArray(b.stats) ? b.stats : []).map((s) => [s && s.day, s && Number(s.daily)]));
      const days = [0, 1, 2, 3, 4, 5, 6].map((k) => {
        const v = byDay[_isoDay(Date.parse(first + 'T00:00:00Z') + k * _DAY_MS)];
        return Number.isFinite(v) ? v : 0;
      });
      out.week = { first, last: _isoDay(Date.parse(first + 'T00:00:00Z') + 6 * _DAY_MS), total: b.total, days };
    } else if (r.kind === 'month') {
      const mid = new Date(Date.parse(r.start) + 12 * 3_600_000);
      out.month = { year: mid.getUTCFullYear(), month: mid.getUTCMonth() + 1, total: b.total };
    }
  });
  return Object.keys(out).length ? out : null;
}

export { visitRanges, visitSummary };
