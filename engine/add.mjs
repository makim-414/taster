// Copy registry components into an app, standalone: no shadcn CLI, no components.json, no account. Resolves every
// relative import a component makes (helpers, other components, icons), adds the token files once, and reports the
// npm packages to install. Works from this repository or from a hosted copy (`--from https://...`), which serves the
// same file list as JSON at /r/<id>.json (web/app/r/[...id]/route.ts).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REGISTRY_DIR = join(ROOT, 'registry');
const EXTS = ['.tsx', '.ts', '.js', '.cjs', '.css'];

export function loadRegistry() {
  return JSON.parse(readFileSync(join(REGISTRY_DIR, 'registry.json'), 'utf8'));
}

// Relative imports in a source file: import ... from './x', export ... from '../y', import './z.css'.
function relativeImports(source) {
  const out = new Set();
  for (const m of source.matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)) out.add(m[1]);
  return [...out];
}

function resolveRelative(fromRel, spec) {
  const base = posix.normalize(posix.join(posix.dirname(fromRel), spec));
  for (const candidate of [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => `${base}/index${e}`)]) {
    const abs = join(REGISTRY_DIR, candidate);
    if (existsSync(abs) && statSync(abs).isFile()) return candidate;
  }
  throw new Error(`${fromRel} imports ${spec}, which is not in the registry`);
}

/**
 * Everything one or more components need, as files relative to registry/src, plus npm packages and credits.
 * @param {string[]} ids registry ids such as blocks/button
 * @param {{ tokens?: boolean }} [options] tokens: include tokens.css and the Tailwind preset (default true)
 */
export function resolveComponents(ids, { tokens = true } = {}) {
  const registry = loadRegistry();
  const byFile = new Map(registry.components.map((c) => [c.file, c]));
  const files = new Map();
  const npm = new Set();
  const credits = [];
  const hints = [];
  const queue = [];
  for (const id of ids) {
    const c = registry.components.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown component ${id}. Run with --list to see every id.`);
    queue.push(c.file);
  }
  while (queue.length) {
    const rel = queue.shift();
    if (files.has(rel)) continue;
    const content = readFileSync(join(REGISTRY_DIR, rel), 'utf8');
    files.set(rel, content);
    const comp = byFile.get(rel);
    if (comp) {
      for (const d of comp.deps || []) if (!/^(blocks|motion|marketing|icons)\//.test(d)) npm.add(d);
      if (comp.credit) credits.push({ id: comp.id, license: comp.license, credit: comp.credit });
      if (comp.hint) hints.push(comp.hint);
    }
    for (const spec of relativeImports(content)) queue.push(resolveRelative(rel, spec));
  }
  if (tokens) for (const t of ['src/tokens.css', 'src/tailwind-preset.cjs']) if (!files.has(t)) files.set(t, readFileSync(join(REGISTRY_DIR, t), 'utf8'));
  // Credited upstream code travels with its notice (the MIT terms ask for it).
  if (credits.length) files.set('THIRD_PARTY_NOTICES.md', readFileSync(join(REGISTRY_DIR, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
  // React is assumed; everything else a file imports by bare name must be in some component's deps.
  for (const [rel, content] of files) {
    if (!/\.(tsx?|jsx?)$/.test(rel)) continue;
    for (const m of content.matchAll(/from\s+['"]([^.'"/][^'"]*)['"]/g)) {
      const pkg = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
      if (pkg !== 'react' && pkg !== 'react-dom') npm.add(pkg);
    }
  }
  return {
    ids,
    files: [...files].map(([path, content]) => ({ path: path.replace(/^src\//, ''), content })),
    npm: [...npm].sort(),
    credits,
    hints,
  };
}

/** Write a resolved bundle (local or fetched) into `dir`, keeping the blocks/, motion/, icons/ layout. */
export function writeBundle(bundle, dir, { overwrite = false } = {}) {
  const written = [];
  const skipped = [];
  for (const f of bundle.files) {
    const target = normalize(join(dir, f.path));
    if (!target.startsWith(normalize(dir))) throw new Error(`Refusing to write outside ${dir}: ${f.path}`);
    if (existsSync(target) && !overwrite && readFileSync(target, 'utf8') !== f.content) {
      skipped.push(f.path);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
    written.push(f.path);
  }
  return { written, skipped };
}

/** Fetch the same bundle from a hosted Taster (the web app's /r/<id>.json), one request per id, merged. */
export async function fetchBundle(ids, from) {
  const files = new Map();
  const npm = new Set();
  const credits = [];
  const hints = [];
  for (const id of ids) {
    const url = new URL(`/r/${id}.json`, from);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const b = await res.json();
    for (const f of b.files) files.set(f.path, f.content);
    for (const p of b.npm) npm.add(p);
    credits.push(...(b.credits || []));
    hints.push(...(b.hints || []));
  }
  return { ids, files: [...files].map(([path, content]) => ({ path, content })), npm: [...npm].sort(), credits, hints };
}
