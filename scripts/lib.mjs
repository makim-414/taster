// Shared helpers for build-docs.mjs and validate.mjs. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SKILL_DATA = path.join(ROOT, 'skills', 'taster', 'data');

export const PATTERN_SECTIONS = ['When to use', 'Anatomy', 'Do', "Don't", 'Swap recipe', 'Tokens'];

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export function writeJson(rel, data) {
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(data, null, 2) + '\n');
}

// Minimal frontmatter: `key: value` lines, flow lists `[a, b]`.
export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new Error(`bad frontmatter line: ${line}`);
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).replace(/\s+#.*$/, '').trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner ? inner.split(',').map((s) => s.trim()).filter(Boolean) : [];
    } else {
      data[key] = value;
    }
  }
  return { data, body: m[2] };
}

export function loadPatterns() {
  const dir = path.join(ROOT, 'patterns');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const fm = parseFrontmatter(text);
      return { file: f, text, ...(fm || { data: null, body: '' }) };
    });
}

// Files copied into the skill bundle, as [source, destination] relative to ROOT.
export function bundleFiles() {
  const pairs = [
    ['taxonomy/taxonomy.json', 'skills/taster/data/taxonomy.json'],
    ['rules/rules.json', 'skills/taster/data/rules.json'],
    ['rules/detect.js', 'skills/taster/data/detect.js'],
    ['registry/registry.json', 'skills/taster/data/registry.json'],
    ['patterns/INDEX.json', 'skills/taster/data/patterns/INDEX.json'],
  ];
  for (const p of loadPatterns()) pairs.push([`patterns/${p.file}`, `skills/taster/data/patterns/${p.file}`]);
  return pairs;
}
