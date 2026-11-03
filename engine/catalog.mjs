// Read-only access to patterns, the registry and the taxonomy, for the MCP swap tools.
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const readText = (rel) => readFileSync(join(ROOT, rel), 'utf8');

export const loadRules = () => readJson('rules/rules.json').rules;
export const loadPatterns = () => readJson('patterns/INDEX.json');
export const loadRegistry = () => readJson('registry/registry.json');
export const loadTaxonomy = () => readJson('taxonomy/taxonomy.json');
export const loadToneRefs = () => readJson('taxonomy/tone-refs.json');

export function patternsForRule(ruleId) {
  const rule = loadRules().find((r) => r.id === ruleId);
  const ids = new Set(rule?.fix_patterns || []);
  for (const p of loadPatterns()) if ((p.replaces || []).includes(ruleId)) ids.add(p.id);
  return loadPatterns().filter((p) => ids.has(p.id));
}

function componentInfo(id, registry) {
  const c = registry.components.find((x) => x.id === id);
  if (!c) return { id, missing: true };
  return { id: c.id, file: `registry/${c.file}`, deps: c.deps || [], license: c.license || null, credit: c.credit || null };
}

export function suggestSwaps(ruleIds) {
  const rules = new Map(loadRules().map((r) => [r.id, r]));
  const registry = loadRegistry();
  return ruleIds.map((raw) => {
    const id = String(raw).toUpperCase();
    const rule = rules.get(id);
    if (!rule) return { ruleId: id, error: 'Unknown rule id' };
    return {
      ruleId: id,
      name: rule.name,
      severity: rule.severity,
      fix: rule.fix,
      patterns: patternsForRule(id).map((p) => ({
        id: p.id,
        name: p.name,
        summary: p.summary,
        category: p.category,
        components: (p.components || []).map((c) => componentInfo(c, registry)),
      })),
    };
  });
}

export function listPatterns({ family, category, use, surface, rule } = {}) {
  const tax = loadTaxonomy();
  let list = loadPatterns();
  if (family) {
    const fam = tax.families.find((f) => f.id === family);
    if (!fam) throw new Error(`Unknown family ${family}. Known: ${tax.families.map((f) => f.id).join(', ')}`);
    list = list.filter((p) => fam.categories.includes(p.category));
  }
  if (category) list = list.filter((p) => p.category === category);
  if (use) list = list.filter((p) => (p.uses || []).includes(use));
  if (surface) list = list.filter((p) => (p.surfaces || []).includes(surface));
  if (rule) list = list.filter((p) => (p.replaces || []).includes(String(rule).toUpperCase()));
  return list;
}

export function getPattern(id) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error('Pattern ids are kebab-case');
  const rel = `patterns/${id}.md`;
  if (!existsSync(join(ROOT, rel))) throw new Error(`Unknown pattern ${id}`);
  return readText(rel);
}

// Component source plus the shared helpers and token files it needs, as Markdown.
export function getComponent(id) {
  const registry = loadRegistry();
  const c = registry.components.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown component ${id}. Known: ${registry.components.map((x) => x.id).join(', ')}`);
  const fence = (rel) => `### registry/${rel}\n\n\`\`\`${extname(rel).slice(1) || 'text'}\n${readText(`registry/${rel}`)}\n\`\`\`\n`;
  const head = { ...componentInfo(id, registry), category: c.category, patterns: c.patterns || [] };
  return [
    '```json',
    JSON.stringify(head, null, 2),
    '```',
    '',
    '## Component',
    fence(c.file),
    '## Shared helpers',
    ...(registry.shared || []).map(fence),
    '## Token files',
    ...(registry.tokens || []).map(fence),
  ].join('\n');
}

// ---- Browsing with pictures: the gallery on the web, the stills in registry/previews ----
const REGISTRY_ROOT = join(ROOT, 'registry');
export const WEB_URL = (process.env.TASTER_WEB_URL || 'https://taster-six.vercel.app').replace(/\/$/, '');
export const stagePath = () => join(REGISTRY_ROOT, 'stage', 'index.html');
export const previewPath = (id, theme = 'dark') => join(REGISTRY_ROOT, 'previews', `${id.replace(/\//g, '-')}.${theme}.jpg`);

// Every value goes through URLSearchParams, so none can add a parameter or end the link. Slashes and commas (component
// ids, the board's list) are allowed in a query as they are, and stay readable.
const queryString = (params) => new URLSearchParams(params).toString().replace(/%2F/gi, '/').replace(/%2C/gi, ',');
const lookParams = ({ theme, brand } = {}) => ({ ...(brand && { brand: String(brand).replace('#', '') }), ...(theme && { theme }) });
export const componentUrl = (id, look) => {
  const q = queryString(lookParams(look));
  return `${WEB_URL}/components/${id}${q ? `?${q}` : ''}`;
};
export const boardUrl = (ids, look) => `${WEB_URL}/board?${queryString({ ids: ids.join(','), ...lookParams(look) })}`;

function words(text) {
  return String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Components that fit a request, best first. Filters combine with AND; the query ranks what is left. */
export function browseComponents({ query, category, family, use, surface, ids, limit = 6 } = {}) {
  const tax = loadTaxonomy();
  const patterns = loadPatterns();
  const categoryName = new Map(tax.categories.map((c) => [c.id, c.name]));
  if (family && !tax.families.some((f) => f.id === family)) throw new Error(`Unknown family ${family}. Known: ${tax.families.map((f) => f.id).join(', ')}`);
  const familyCategories = family ? tax.families.find((f) => f.id === family).categories : null;
  // Words for ranking, by id: the patterns of its own category say what it is; a pattern of another category only uses
  // it as a part (a button inside a hero).
  const tags = new Map();
  let list = loadRegistry().components.map((c) => {
    const own = patterns.filter((p) => (p.components || []).includes(c.id)).sort((a, b) => Number(b.category === c.category) - Number(a.category === c.category));
    tags.set(c.id, {
      own: own.filter((p) => p.category === c.category).flatMap((p) => [p.id, ...(p.uses || []), ...(p.surfaces || [])]),
      partOf: own.filter((p) => p.category !== c.category).flatMap((p) => [p.id, ...(p.uses || [])]),
    });
    return {
      id: c.id,
      category: c.category,
      categoryName: categoryName.get(c.category) || c.category,
      summary: own[0]?.summary || '',
      patterns: own.map((p) => p.id),
      uses: [...new Set(own.flatMap((p) => p.uses || []))],
      surfaces: [...new Set(own.flatMap((p) => p.surfaces || []))],
      fixes: [...new Set(own.flatMap((p) => p.replaces || []))],
      deps: c.deps || [],
      license: c.license || null,
    };
  });
  if (ids?.length) {
    const unknown = ids.filter((id) => !list.some((c) => c.id === id));
    if (unknown.length) throw new Error(`Unknown component: ${unknown.join(', ')}. Use browse_components with a query to find one.`);
    return ids.map((id) => list.find((c) => c.id === id));
  }
  if (category) list = list.filter((c) => c.category === category);
  if (familyCategories) list = list.filter((c) => familyCategories.includes(c.category));
  if (use) list = list.filter((c) => c.uses.includes(use));
  if (surface) list = list.filter((c) => c.surfaces.includes(surface));
  const asked = words(query);
  if (asked.length) {
    // A word in the id or the component's own category and patterns counts most, then its summary. A word only in a
    // pattern of another category (hero for a button) counts least, so a part comes after what it is part of.
    const scored = list.map((c) => {
      const inId = words(c.id);
      const inTags = words([c.category, c.categoryName, ...tags.get(c.id).own].join(' '));
      const inText = words(c.summary);
      const inPartOf = words(tags.get(c.id).partOf.join(' '));
      let score = 0;
      for (const w of asked) {
        if (inId.includes(w)) score += 6;
        if (inTags.includes(w)) score += 3;
        if (inText.includes(w)) score += 1;
        else if (inPartOf.includes(w)) score += 0.5;
      }
      return { c, score };
    }).filter((x) => x.score > 0);
    list = scored.sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id)).map((x) => x.c);
  }
  return list.slice(0, limit);
}
