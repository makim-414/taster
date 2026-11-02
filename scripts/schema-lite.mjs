// A small JSON Schema (2020-12 subset) validator, so the repository checks stay dependency free.
// It throws on any keyword it does not implement, so a schema can never rely on a rule that is silently skipped.
const IGNORED = new Set(['$schema', '$id', '$comment', 'title', 'description', '$defs', 'examples']);
const KNOWN = new Set([
  '$ref', 'type', 'required', 'properties', 'additionalProperties', 'propertyNames', 'items', 'minItems', 'maxItems',
  'uniqueItems', 'enum', 'const', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'minProperties',
]);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t);

export function validateSchema(root, value) {
  const errors = [];
  const resolve = (ref) => {
    if (!ref.startsWith('#/')) throw new Error(`schema-lite: only local $ref is supported, got ${ref}`);
    return ref.slice(2).split('/').reduce((o, k) => o?.[k], root) ?? (() => { throw new Error(`schema-lite: missing ${ref}`); })();
  };
  (function check(schema, v, at) {
    for (const k of Object.keys(schema)) if (!KNOWN.has(k) && !IGNORED.has(k)) throw new Error(`schema-lite: unsupported keyword ${k} at ${at}`);
    if (schema.$ref) return check(resolve(schema.$ref), v, at);
    const err = (m) => errors.push(`${at || '/'}: ${m}`);
    if (schema.type) {
      const types = [].concat(schema.type);
      if (!types.some((t) => isType(v, t))) return err(`expected ${types.join(' or ')}, got ${typeOf(v)}`);
    }
    if (schema.const !== undefined && JSON.stringify(v) !== JSON.stringify(schema.const)) err(`must equal ${JSON.stringify(schema.const)}`);
    if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) err(`must be one of ${schema.enum.join(', ')}`);
    if (typeof v === 'string') {
      if (schema.pattern && !new RegExp(schema.pattern, 'u').test(v)) err(`"${v}" does not match ${schema.pattern}`);
      if (schema.minLength !== undefined && v.length < schema.minLength) err(`shorter than ${schema.minLength}`);
      if (schema.maxLength !== undefined && v.length > schema.maxLength) err(`longer than ${schema.maxLength}`);
    }
    if (typeof v === 'number') {
      if (schema.minimum !== undefined && v < schema.minimum) err(`${v} is below ${schema.minimum}`);
      if (schema.maximum !== undefined && v > schema.maximum) err(`${v} is above ${schema.maximum}`);
    }
    if (Array.isArray(v)) {
      if (schema.minItems !== undefined && v.length < schema.minItems) err(`needs at least ${schema.minItems} items`);
      if (schema.maxItems !== undefined && v.length > schema.maxItems) err(`allows at most ${schema.maxItems} items`);
      if (schema.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) err('items must be unique');
      if (schema.items) v.forEach((x, i) => check(schema.items, x, `${at}/${i}`));
    }
    if (typeOf(v) === 'object') {
      const keys = Object.keys(v);
      if (schema.minProperties !== undefined && keys.length < schema.minProperties) err(`needs at least ${schema.minProperties} properties`);
      for (const r of schema.required || []) if (!(r in v)) err(`missing ${r}`);
      for (const k of keys) {
        if (schema.propertyNames) check(schema.propertyNames, k, `${at}/${k} (name)`);
        if (schema.properties && k in schema.properties) check(schema.properties[k], v[k], `${at}/${k}`);
        else if (schema.additionalProperties === false) err(`unexpected property ${k}`);
        else if (typeof schema.additionalProperties === 'object') check(schema.additionalProperties, v[k], `${at}/${k}`);
      }
    }
  })(root, value, '');
  return errors;
}
