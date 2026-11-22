import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const prompt = (name) => readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), 'utf8');

test('the writer knows the reader is a layperson outside development and AI', () => {
  const w = prompt('write');
  assert.match(w, /layperson/);
  assert.match(w, /security/i);
  assert.doesNotMatch(w, /no hand-holding on basics/);
});

test('the writer may write less than the length range and never talks about its input', () => {
  const w = prompt('write');
  assert.match(w, /never pad/i);
  assert.match(w, /dostarczony materiał/);
  assert.match(w, /restate/);
});

test('the glossary starts with terms from the title and knows the reader', () => {
  const g = prompt('glossary');
  assert.match(g, /title first/);
  assert.match(g, /security/);
});

test('the supplement is short, in parts with "## " subheads, and its table is tight', () => {
  const p = prompt('period');
  assert.match(p, /450-650 words/);
  assert.match(p, /## /);
  assert.match(p, /at most 6/);
  assert.doesNotMatch(p, /800-1200/);
});

test('the editor keeps facts and numbers and may only cut and clarify', () => {
  const e = prompt('edit');
  assert.match(e, /Never add a fact, number, name or quote/);
  assert.match(e, /## /);
  assert.match(e, /Polish/);
});
