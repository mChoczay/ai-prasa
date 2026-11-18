import test from 'node:test';
import assert from 'node:assert/strict';
import { editionDate, monthKey, editionFlags, daysBetween } from '../n8n/lib/dates.js';

test('editionDate rolls over at Warsaw midnight (winter, UTC+1)', () => {
  assert.equal(editionDate(new Date('2026-11-18T23:30:00Z')), '2026-11-19');
});

test('editionDate on DST switch day', () => {
  assert.equal(editionDate(new Date('2026-03-29T00:30:00Z')), '2026-03-29');
});

test('editionDate summer time (UTC+2)', () => {
  assert.equal(editionDate(new Date('2026-07-10T22:30:00Z')), '2026-07-11');
});

test('editionFlags Sunday is weekly', () => {
  assert.deepEqual(editionFlags('2026-11-22'), { weekly: true, monthly: false });
});

test('editionFlags Sunday the 1st is both', () => {
  assert.deepEqual(editionFlags('2026-11-01'), { weekly: true, monthly: true });
});

test('editionFlags 1st on a weekday is monthly only', () => {
  assert.deepEqual(editionFlags('2026-12-01'), { weekly: false, monthly: true });
});

test('editionFlags ordinary day', () => {
  assert.deepEqual(editionFlags('2026-11-18'), { weekly: false, monthly: false });
});

test('daysBetween across a month boundary', () => {
  assert.equal(daysBetween('2026-11-28', '2026-12-03'), 5);
});

test('daysBetween is signed', () => {
  assert.equal(daysBetween('2026-12-03', '2026-11-28'), -5);
});

test('daysBetween across DST change stays integral', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});

test('monthKey uses Warsaw time', () => {
  assert.equal(monthKey('2026-10-31T23:30:00Z'), '2026-11');
});

test('monthKey accepts a Date', () => {
  assert.equal(monthKey(new Date('2026-11-18T12:00:00Z')), '2026-11');
});
