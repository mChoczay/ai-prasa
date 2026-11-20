import test from 'node:test';
import assert from 'node:assert/strict';
import { countVisit } from '../site/js/visits.js';
import { saveConfig } from '../site/js/feedback.js';

const mapStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const imageFactory = () => {
  const made = [];
  return { made, make: () => { const img = { src: '' }; made.push(img); return img; } };
};

test('a visit loads one GoatCounter pixel for the front path', () => {
  const f = imageFactory();
  assert.equal(countVisit(null, f.make, () => 0.5), true);
  assert.equal(f.made.length, 1);
  assert.equal(f.made[0].src, 'https://api-prasa.goatcounter.com/count?p=%2F&rnd=500000000');
});

test('the owner device with ratings enabled is not counted', () => {
  const storage = mapStorage();
  assert.equal(saveConfig(storage, 'https://n8n.example/webhook/x', 'k'), true);
  const f = imageFactory();
  assert.equal(countVisit(storage, f.make), false);
  assert.equal(f.made.length, 0);
});

test('a storage that throws still counts the visit', () => {
  const broken = { getItem: () => { throw new Error('denied'); } };
  const f = imageFactory();
  assert.equal(countVisit(broken, f.make, () => 0.1), true);
  assert.equal(f.made.length, 1);
});

test('a failing image never throws into the page', () => {
  assert.equal(countVisit(null, () => { throw new Error('no Image'); }), false);
});
