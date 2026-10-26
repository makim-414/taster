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
