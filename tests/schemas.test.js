import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate, ALLOWED_KEYWORDS } from './helpers/mini-validate.js';

const NAMES = ['filter', 'select', 'edition', 'period', 'profile'];
const load = (name) => JSON.parse(readFileSync(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'));

const CATEGORIES = ['modele', 'gielda', 'inwestycje', 'rankingi', 'narzedzia', 'regulacje', 'przecieki', 'inne'];
const STATUSES = ['potwierdzone', 'plotka', 'opinia'];
const WHY_TYPES = ['fakt', 'hipoteza', 'brak'];

function walk(node, visit, path = '$') {
  visit(node, path);
  if (node.properties) for (const [k, v] of Object.entries(node.properties)) walk(v, visit, `${path}.${k}`);
  if (node.items) walk(node.items, visit, `${path}[]`);
  if (node.anyOf) node.anyOf.forEach((s, i) => walk(s, visit, `${path}|${i}`));
}

for (const name of NAMES) {
  test(`${name} schema uses only supported keywords`, () => {
    walk(load(name), (node, path) => {
      for (const key of Object.keys(node)) assert.ok(ALLOWED_KEYWORDS.includes(key), `${path}: ${key}`);
    });
  });

  test(`${name} schema objects are closed and require every property`, () => {
    walk(load(name), (node, path) => {
      if (node.type !== 'object') return;
      assert.equal(node.additionalProperties, false, `${path} additionalProperties`);
      assert.deepEqual([...(node.required || [])].sort(), Object.keys(node.properties || {}).sort(), `${path} required`);
    });
  });
}

function collectEnums(schema) {
  const found = {};
  walk(schema, (node, path) => {
    if (node.enum) found[path] = node.enum;
  });
  return found;
}

test('enums match the Global Constraints exactly', () => {
  const edition = collectEnums(load('edition'));
  assert.deepEqual(edition['$.lead_story.category'], CATEGORIES);
  assert.deepEqual(edition['$.stories[].category'], CATEGORIES);
  assert.deepEqual(edition['$.lead_story.status'], STATUSES);
  assert.deepEqual(edition['$.stories[].status'], STATUSES);
  assert.deepEqual(edition['$.big_moves[].why_type'], WHY_TYPES);
  assert.deepEqual(collectEnums(load('filter'))['$.items[].category'], CATEGORIES);
});

// The sample fixture carries fields the workflow adds after Claude answers; drop them to get the model's output shape.
function toModelShape(edition) {
  const e = structuredClone(edition);
  for (const key of ['date', 'edition', 'generated_at', 'quiet_day', 'weekly', 'monthly']) delete e[key];
  for (const s of [e.lead_story, ...e.stories]) delete s.disclaimer;
  delete e.market.disclaimer;
  return e;
}

test('the sample edition validates against edition.schema.json', () => {
  const sample = JSON.parse(readFileSync(new URL('./fixtures/edition.sample.json', import.meta.url), 'utf8'));
  assert.deepEqual(validate(load('edition'), toModelShape(sample)), []);
});

test('sample outputs validate against the smaller schemas', () => {
  assert.deepEqual(
    validate(load('filter'), { items: [{ idx: 0, category: 'modele', importance: 4, keep: true }] }),
    [],
  );
  assert.deepEqual(validate(load('select'), { lead_idx: 0, story_idx: [1, 2], rumor_idx: [], extra_queries: [] }), []);
  assert.deepEqual(
    validate(load('period'), {
      title: 't',
      body: 'b',
      takeaways: ['a', 'b', 'c'],
      race_map: [{ area: 'kod', leader: 'Firma X', note: 'n' }],
    }),
    [],
  );
  assert.deepEqual(
    validate(load('profile'), {
      type: 'company',
      name: 'NVIDIA',
      owner: 'spółka publiczna',
      summary: 's',
      key_products: ['GPU'],
      why_it_matters: 'w',
      aliases: ['Nvidia', 'NVDA'],
    }),
    [],
  );
});

test('the edition schema asks for a Wikipedia topic for the picture of every story', () => {
  const e = load('edition');
  for (const node of [e.properties.lead_story, e.properties.stories.items]) {
    assert.equal(node.properties.image_topic.type, 'string');
    assert.ok(node.required.includes('image_topic'));
  }
  assert.match(readFileSync(new URL('../prompts/write.md', import.meta.url), 'utf8'), /`image_topic`/);
});
