// The component catalog for the gallery pages, read from the repository at build time. Server side only.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import registry from '../../registry/registry.json';
import patterns from '../../patterns/INDEX.json';
import taxonomy from '../../taxonomy/taxonomy.json';
import rules from '../../rules/rules.json';

export type CatalogItem = {
  id: string;
  group: string;
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  family: string;
  familyName: string;
  summary: string;
  patterns: { id: string; name: string; summary: string }[];
  uses: string[];
  surfaces: string[];
  fixes: { id: string; name: string }[];
  deps: string[];
  license: string;
  credit: string;
  file: string;
};

type Pattern = { id: string; name: string; summary: string; category: string; uses?: string[]; surfaces?: string[]; replaces?: string[]; components?: string[] };
type Component = { id: string; file: string; category: string; deps?: string[]; license?: string; credit?: string; patterns?: string[] };

const SMALL_WORDS = new Set(['kpi', 'faq']);
function nameOf(id: string): string {
  const words = id.split('/').pop()!.split('-');
  return words.map((w, i) => (SMALL_WORDS.has(w) ? w.toUpperCase() : i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

const ruleName = new Map(rules.rules.map((r) => [r.id, r.name]));
const categoryName = new Map(taxonomy.categories.map((c) => [c.id, c.name]));
const familyOf = new Map(taxonomy.families.flatMap((f) => f.categories.map((c) => [c, f] as const)));

export const CATALOG: CatalogItem[] = (registry.components as Component[]).map((c) => {
  const own = (patterns as Pattern[]).filter((p) => (p.components || []).includes(c.id));
  // The pattern made for this component (same category) describes it best; shared ones come after it.
  own.sort((a, b) => Number(b.category === c.category) - Number(a.category === c.category));
  const family = familyOf.get(c.category);
  const [group, slug] = c.id.split('/');
  return {
    id: c.id,
    group,
    slug,
    name: nameOf(c.id),
    category: c.category,
    categoryName: categoryName.get(c.category) || c.category,
    family: family?.id || 'other',
    familyName: family?.name || 'Other',
    summary: own[0]?.summary || '',
    patterns: own.map((p) => ({ id: p.id, name: p.name, summary: p.summary })),
    uses: [...new Set(own.flatMap((p) => p.uses || []))],
    surfaces: [...new Set(own.flatMap((p) => p.surfaces || []))],
    fixes: [...new Set(own.flatMap((p) => p.replaces || []))].map((id) => ({ id, name: ruleName.get(id) || id })),
    deps: c.deps || [],
    license: c.license || '',
    credit: c.credit || '',
    file: c.file,
  };
});

export const FAMILIES = taxonomy.families
  .map((f) => ({ id: f.id, name: f.name, count: CATALOG.filter((c) => c.family === f.id).length }))
  .filter((f) => f.count > 0);

export const SURFACES = taxonomy.surfaces.map((s) => ({ id: s.id, name: s.name }));

export function sourceOf(item: CatalogItem): string {
  return readFileSync(path.resolve(process.cwd(), '../registry', item.file), 'utf8');
}
