// The taxonomy decision key as a pure function. See taxonomy/SCHEMA.md, "Decision key".
//
//   classify(['is_page_section', 'is_first_section'])  -> { category: 'hero', step: 12, fallback: false }
//
// Features are the ids in taxonomy.features and describe the part itself, never the parts nested inside it.
// Steps run in order and the first step whose `all` features are all present and whose `none` features are all
// absent decides the category. The last step has no conditions, so every input gets exactly one category.
import taxonomy from './taxonomy.json' with { type: 'json' };

export function createClassifier(spec) {
  const known = new Set(spec.features.map((f) => f.id));
  const steps = spec.classify;
  return function classify(features) {
    const list = Array.isArray(features) ? features : Object.keys(features).filter((k) => features[k] === true);
    for (const f of list) if (!known.has(f)) throw new Error(`Unknown feature ${f}. Known: ${[...known].join(', ')}`);
    const has = new Set(list);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.all.every((f) => has.has(f)) && s.none.every((f) => !has.has(f))) {
        return { category: s.category, step: i, fallback: s.fallback === true };
      }
    }
    // Unreachable when the last step is the unconditional fallback, which scripts/check-taxonomy.mjs enforces.
    throw new Error('Decision key has no fallback step');
  };
}

export const classify = createClassifier(taxonomy);
