// Validates schemas, cross links, the skill bundle and text hygiene. Prints VALIDATE OK on success.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATTERN_SECTIONS, readJson, loadPatterns, bundleFiles, parseFrontmatter } from './lib.mjs';

const errors = [];
const err = (m) => errors.push(m);
const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Taxonomy
const tax = readJson('taxonomy/taxonomy.json');
const famIds = new Set(tax.families.map((f) => f.id));
const catIds = new Set(tax.categories.map((c) => c.id));
const useIds = new Set(tax.uses.map((u) => u.id));
const surfIds = new Set(tax.surfaces.map((s) => s.id));
for (const [name, list] of [['family', tax.families], ['category', tax.categories], ['use', tax.uses], ['surface', tax.surfaces]]) {
  const ids = list.map((x) => x.id);
  if (new Set(ids).size !== ids.length) err(`duplicate ${name} id`);
  for (const id of ids) if (!kebab.test(id)) err(`${name} id not kebab-case: ${id}`);
}
for (const c of tax.categories) if (!famIds.has(c.family)) err(`category ${c.id} has unknown family ${c.family}`);
for (const f of tax.families) for (const c of f.categories) {
  if (!catIds.has(c)) err(`family ${f.id} lists unknown category ${c}`);
  else if (tax.categories.find((x) => x.id === c).family !== f.id) err(`category ${c} family mismatch`);
}

// Rules
const rules = readJson('rules/rules.json').rules;
const ruleIds = new Set(rules.map((r) => r.id));
if (ruleIds.size !== rules.length) err('duplicate rule id');
for (const r of rules) {
  for (const k of ['id', 'name', 'what', 'why', 'fix', 'severity']) if (!r[k]) err(`rule ${r.id} missing ${k}`);
  if (!['deterministic', 'heuristic', 'manual'].includes(r.detect?.level)) err(`rule ${r.id} bad detect.level`);
  if (!r.fix_patterns?.length) err(`rule ${r.id} has no fix pattern (run build-docs after adding patterns)`);
}

// Registry
const registry = readJson('registry/registry.json').components;
const compIds = new Set(registry.map((c) => c.id));
for (const c of registry) {
  if (!fs.existsSync(path.join(ROOT, 'registry', c.file))) err(`registry ${c.id} file missing: ${c.file}`);
  if (!catIds.has(c.category)) err(`registry ${c.id} unknown category ${c.category}`);
}

// Patterns
const index = readJson('patterns/INDEX.json');
const files = loadPatterns();
const fileIds = new Set(files.map((p) => p.file.replace(/\.md$/, '')));
for (const s of index) if (!fileIds.has(s.id)) err(`INDEX pattern without file: ${s.id}`);
for (const p of files) {
  const id = p.file.replace(/\.md$/, '');
  if (!p.data) { err(`${p.file} has no frontmatter`); continue; }
  const d = p.data;
  if (d.id !== id) err(`${p.file} id mismatch ${d.id}`);
  if (!kebab.test(id)) err(`${p.file} id not kebab-case`);
  if (!index.find((s) => s.id === id)) err(`${p.file} not in INDEX.json`);
  if (!catIds.has(d.category)) err(`${id} unknown category ${d.category}`);
  for (const u of d.uses || []) if (!useIds.has(u)) err(`${id} unknown use ${u}`);
  for (const s of d.surfaces || []) if (!surfIds.has(s)) err(`${id} unknown surface ${s}`);
  for (const r of d.replaces || []) if (!ruleIds.has(r)) err(`${id} unknown rule ${r}`);
  for (const c of d.components || []) if (!compIds.has(c)) err(`${id} unknown component ${c}`);
  if (!(d.uses || []).length || !(d.surfaces || []).length) err(`${id} needs uses and surfaces`);
  for (const u of d.inspiration || []) if (!/^https:\/\//.test(u)) err(`${id} inspiration must be https URL: ${u}`);
  const heads = [...p.body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  if (heads.join('|') !== PATTERN_SECTIONS.join('|')) err(`${id} sections must be ${PATTERN_SECTIONS.join(', ')}; got ${heads.join(', ')}`);
  const sections = p.body.split(/^## .+$/m).slice(1);
  sections.forEach((s, i) => { if (s.trim().length < 40) err(`${id} section "${PATTERN_SECTIONS[i]}" too short`); });
}

// Skill
const skill = fs.readFileSync(path.join(ROOT, 'skills/taster/SKILL.md'), 'utf8');
const sfm = parseFrontmatter(skill);
if (!sfm?.data.name || !sfm?.data.description) err('SKILL.md needs name and description');
for (const ref of skill.matchAll(/\]\((references\/[^)]+|data\/[^)]+)\)/g)) {
  if (!fs.existsSync(path.join(ROOT, 'skills/taster', ref[1]))) err(`SKILL.md links missing ${ref[1]}`);
}
for (const [src, dst] of bundleFiles()) {
  const a = path.join(ROOT, src), b = path.join(ROOT, dst);
  if (!fs.existsSync(b) || !fs.readFileSync(a).equals(fs.readFileSync(b))) err(`skill bundle out of date: ${dst} (run node scripts/build-docs.mjs)`);
}

// Manifests
const mk = readJson('.claude-plugin/marketplace.json');
const cx = readJson('.codex-plugin/plugin.json');
if (mk.plugins[0].version !== cx.version) err('plugin versions differ between .claude-plugin and .codex-plugin');
for (const s of mk.plugins[0].skills) if (!fs.existsSync(path.join(ROOT, s, 'SKILL.md'))) err(`marketplace skill path missing ${s}`);

// The registry's own default type must pass the repo's own font rules: not a stock default (AC-15), not one of the
// usual substitutes (TYP-02), and a Hangul family in the stack (KO-02).
{
  const tokens = fs.readFileSync(path.join(ROOT, 'registry/src/tokens.css'), 'utf8');
  const detect = fs.readFileSync(path.join(ROOT, 'rules/detect.js'), 'utf8');
  const list = (name) => {
    const m = detect.match(new RegExp(`var ${name} = \\{([\\s\\S]*?)\\};`));
    return m ? [...m[1].matchAll(/'([^']+)'|(\b[a-z][\w-]*)\s*:/g)].map((x) => (x[1] || x[2]).toLowerCase()) : null;
  };
  const favorites = list('FAVORITE_FONTS');
  const defaults = list('DEFAULT_FONTS');
  const korean = new RegExp(detect.match(/var KOREAN_FONT_RE = \/(.+)\/i;/)[1], 'i');
  if (!favorites || !favorites.includes('geist') || !defaults || !defaults.includes('arial')) err('could not read the font lists from rules/detect.js');
  for (const token of ['--font', '--font-mono']) {
    const stack = (tokens.match(new RegExp(`${token}:\\s*([^;]+);`)) || [])[1];
    if (!stack) { err(`tokens.css has no ${token}`); continue; }
    const names = stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
    if (favorites?.includes(names[0])) err(`tokens.css ${token} starts with ${names[0]}, which TYP-02 flags`);
    if (defaults?.includes(names[0])) err(`tokens.css ${token} starts with ${names[0]}, which AC-15 flags`);
    if (token === '--font' && !names.some((n) => korean.test(n))) err('tokens.css --font has no Hangul family (KO-02)');
  }
}

// Text hygiene: long dashes and emoji are banned in this repo.
const dash = new RegExp('[' + String.fromCharCode(0x2014, 0x2013) + ']');
const emoji = /\p{Extended_Pictographic}/u;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'shots', '.next'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(md|json|tsx?|jsx?|mjs|css|html|ya?ml)$/.test(e.name)) continue;
    const t = fs.readFileSync(p, 'utf8');
    if (dash.test(t)) err(`dash character in ${path.relative(ROOT, p)}`);
    if (emoji.test(t)) err(`emoji in ${path.relative(ROOT, p)}`);
  }
})(ROOT);

if (errors.length) {
  console.log(errors.slice(0, 80).join('\n'));
  console.log(`VALIDATE FAIL ${errors.length}`);
  process.exit(1);
}
console.log(`VALIDATE OK patterns=${files.length} rules=${rules.length} components=${registry.length} uses=${useIds.size}`);
