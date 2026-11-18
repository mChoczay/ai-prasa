import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from './helpers/mini-validate.js';

test('type: accepts matching and rejects other types', () => {
  assert.deepEqual(validate({ type: 'string' }, 'a'), []);
  assert.equal(validate({ type: 'string' }, 1).length, 1);
  assert.deepEqual(validate({ type: 'integer' }, 3), []);
  assert.equal(validate({ type: 'integer' }, 3.5).length, 1);
  assert.deepEqual(validate({ type: 'number' }, 3), []);
  assert.deepEqual(validate({ type: 'boolean' }, false), []);
  assert.deepEqual(validate({ type: 'null' }, null), []);
});

test('enum', () => {
  assert.deepEqual(validate({ type: 'string', enum: ['a'] }, 'a'), []);
  assert.equal(validate({ type: 'string', enum: ['a'] }, 'b').length, 1);
});

test('properties, required and additionalProperties false', () => {
  const s = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'], additionalProperties: false };
  assert.deepEqual(validate(s, { a: 'x' }), []);
  assert.match(validate(s, {})[0], /missing a/);
  assert.match(validate(s, { a: 'x', b: 1 })[0], /unexpected b/);
  assert.match(validate(s, { a: 1 })[0], /\$\.a: expected string/);
});

test('items', () => {
  const s = { type: 'array', items: { type: 'integer' } };
  assert.deepEqual(validate(s, [1, 2]), []);
  assert.match(validate(s, [1, 'x'])[0], /\$\[1\]/);
});

test('anyOf for nullable values', () => {
  const s = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  assert.deepEqual(validate(s, null), []);
  assert.deepEqual(validate(s, 'x'), []);
  assert.equal(validate(s, 3).length, 1);
});

test('description is allowed and unsupported keywords are reported', () => {
  assert.deepEqual(validate({ type: 'string', description: 'd' }, 'x'), []);
  assert.match(validate({ type: 'integer', minimum: 1 }, 2)[0], /unsupported keyword minimum/);
});
