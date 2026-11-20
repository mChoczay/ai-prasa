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

function _isoFromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Last weekday on or before the given day (holidays are not known; a holiday simply yields no data).
function _weekdayOnOrBefore(dateStr) {
  let ms = _utcMidnight(dateStr);
  while ([0, 6].includes(new Date(ms).getUTCDay())) ms -= 86_400_000;
  return _isoFromUtc(ms);
}

// Market reference days for an edition: d0 = last close before the edition, d1 = the close before that,
// d7 / d30 = weekdays on or before d0 minus 7 / 30 calendar days.
function tradingRefDates(editionDateStr) {
  const d0 = _weekdayOnOrBefore(_isoFromUtc(_utcMidnight(editionDateStr) - 86_400_000));
  const d1 = _weekdayOnOrBefore(_isoFromUtc(_utcMidnight(d0) - 86_400_000));
  const d7 = _weekdayOnOrBefore(_isoFromUtc(_utcMidnight(d0) - 7 * 86_400_000));
  const d30 = _weekdayOnOrBefore(_isoFromUtc(_utcMidnight(d0) - 30 * 86_400_000));
  return { d0, d1, d7, d30 };
}

export { editionDate, monthKey, editionFlags, daysBetween, tradingRefDates };
