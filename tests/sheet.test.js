import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { closesSheet } from '../site/js/sheet.js';

// A fake element: `inside` lists the selectors it sits within.
const el = (...inside) => ({ closest: (sel) => (inside.includes(sel) ? {} : null) });
const css = () => readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');
const index = () => readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');

test('a tap that starts and ends outside the card closes it', () => {
  assert.equal(closesSheet(el(), el()), true);
});

test('a tap on the card, or a drag that starts on it, keeps it open', () => {
  assert.equal(closesSheet(el('.sheet'), el('.sheet')), false);
  assert.equal(closesSheet(el('.sheet'), el()), false);
});

test('the cross always closes the card', () => {
  assert.equal(closesSheet(el('.sheet', '.sheet-close'), el('.sheet', '.sheet-close')), true);
  // Enter or Space on the cross: a click without a pointerdown before it.
  assert.equal(closesSheet(null, el('.sheet', '.sheet-close')), true);
});

test('missing targets do not close the card', () => {
  assert.equal(closesSheet(null, el()), false);
  assert.equal(closesSheet(el(), null), false);
});

test('the card sits inside a full-screen dialog that is its own dimmed backdrop', () => {
  const html = index();
  const dialog = html.slice(html.indexOf('<dialog id="profile-dialog"'), html.indexOf('</dialog>'));
  assert.match(dialog, /<div class="sheet">\s*<button type="button" class="sheet-close"/);
  assert.ok(dialog.indexOf('class="sheet"') < dialog.indexOf('id="profile-body"'));
  assert.match(css(), /dialog\s*\{[^}]*inset:\s*0[^}]*\}/);
  assert.match(css(), /dialog\s*\{[^}]*cursor:\s*pointer/);
});

test('the note box uses 16px text so phones do not zoom in while typing', () => {
  assert.match(css(), /\.fb-note textarea\s*\{[^}]*font:\s*16px/);
});

test('reader paragraphs are justified with Polish hyphenation', () => {
  assert.match(css(), /\.page \.body p\s*\{[^}]*text-align:\s*justify[^}]*hyphens:\s*auto/);
});
