import test from 'node:test';
import assert from 'node:assert/strict';
import { El } from './helpers/fake-dom.js';
import { selectArea } from '../site/js/front.js';

function section() {
  const root = new El('section', { cls: 'rankings' });
  for (const key of ['webdev', 'polish']) {
    root.append(new El('button', { cls: 'chip area-chip', attrs: { 'aria-pressed': String(key === 'webdev') }, dataset: { area: key } }));
    const list = new El('ol', { cls: 'area-list', dataset: { area: key } });
    list.hidden = key !== 'webdev';
    root.append(list);
  }
  return root;
}
const state = (root) => ({
  pressed: root.querySelectorAll('.area-chip').map((b) => b.getAttribute('aria-pressed')),
  hidden: root.querySelectorAll('.area-list').map((l) => l.hidden),
});

test('selectArea presses the chosen pill and shows only its list', () => {
  const root = section();
  assert.equal(selectArea(root, 'polish'), true);
  assert.deepEqual(state(root), { pressed: ['false', 'true'], hidden: [true, false] });
});

test('selectArea ignores an unknown area', () => {
  const root = section();
  assert.equal(selectArea(root, 'nope'), false);
  assert.deepEqual(state(root), { pressed: ['true', 'false'], hidden: [false, true] });
});
