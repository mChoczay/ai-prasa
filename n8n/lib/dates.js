// Warsaw-time edition dates. Dependency-free: inlined into n8n Code nodes.

function _dateParts(dateOrIso, tz) {
  const d = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type).value;
  return { y: get('year'), m: get('month'), d: get('day') };
}

function editionDate(now, tz = 'Europe/Warsaw') {
  const { y, m, d } = _dateParts(now, tz);
  return `${y}-${m}-${d}`;
}

function monthKey(dateOrIso, tz = 'Europe/Warsaw') {
  const { y, m } = _dateParts(dateOrIso, tz);
  return `${y}-${m}`;
}

function _utcMidnight(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function editionFlags(dateStr) {
  const dt = new Date(_utcMidnight(dateStr));
  return { weekly: dt.getUTCDay() === 0, monthly: dt.getUTCDate() === 1 };
}

function daysBetween(a, b) {
  return Math.round((_utcMidnight(b) - _utcMidnight(a)) / 86_400_000);
}

export { editionDate, monthKey, editionFlags, daysBetween };
