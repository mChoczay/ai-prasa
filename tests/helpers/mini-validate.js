// Minimal JSON Schema validator for the subset Claude structured outputs accept and this project uses:
// type, properties, required, additionalProperties (false only), items, enum, anyOf, description.

export const ALLOWED_KEYWORDS = Object.freeze([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'anyOf',
  'description',
]);

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function typeMatches(expected, value) {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return expected === actual;
}

export function validate(schema, value, path = '$') {
  const errors = [];
  for (const key of Object.keys(schema)) {
    if (!ALLOWED_KEYWORDS.includes(key)) errors.push(`${path}: unsupported keyword ${key}`);
  }
  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => validate(s, value, path).length === 0);
    if (!ok) errors.push(`${path}: matches no anyOf branch`);
    return errors;
  }
  if (schema.type && !typeMatches(schema.type, value)) {
    errors.push(`${path}: expected ${schema.type}, got ${typeOf(value)}`);
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  if (schema.type === 'object') {
    const props = schema.properties || {};
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${path}: missing ${req}`);
    }
    for (const key of Object.keys(value)) {
      if (props[key]) errors.push(...validate(props[key], value[key], `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected ${key}`);
    }
  }
  if (schema.type === 'array' && schema.items) {
    value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  return errors;
}
