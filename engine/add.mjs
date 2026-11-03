// Copy registry components into an app, standalone: no shadcn CLI, no components.json, no account. Resolves every
// relative import a component makes (helpers, other components, icons), adds the token files once, and reports the
// npm packages to install. Works from this repository or from a hosted copy (`--from https://...`), which serves the
// same file list as JSON at /r/<id>.json (web/app/r/[...id]/route.ts).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REGISTRY_DIR = join(ROOT, 'registry');
const EXTS = ['.tsx', '.ts', '.js', '.cjs', '.css'];
// The folders under registry/src a bundle writes into (a test keeps this equal to the groups in registry.json), and
// the files that sit at the top of the bundle: the tokens, the Tailwind preset and the notices.
export const GROUPS = ['blocks', 'marketing', 'motion', 'content', 'chat', 'commerce', 'media', 'icons', 'scene'];
const TOP_FILES = ['tokens.css', 'tailwind-preset.cjs', 'THIRD_PARTY_NOTICES.md'];
const GROUP_PATH = new RegExp(`^(?:${GROUPS.join('|')})\\/`);

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
      for (const d of comp.deps || []) if (!GROUP_PATH.test(d)) npm.add(d);
      if (comp.credit) credits.push({ id: comp.id, license: comp.license, credit: comp.credit });
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
  };
}

/** True for a path a bundle may carry: a source file inside one of the groups, or one of the top files. */
export function isRegistryPath(path) {
  if (typeof path !== 'string') return false;
  if (TOP_FILES.includes(path)) return true;
  const parts = path.split('/');
  // Every segment is a plain name: no empty, dot or dot-dot segment, no hidden file, no backslash.
  return parts.length >= 2 && GROUPS.includes(parts[0]) && parts.every((s) => /^[\w-][\w.-]*$/.test(s)) && EXTS.includes(posix.extname(path));
}

/** Write a resolved bundle (local or fetched) into `dir`, keeping the blocks/, motion/, icons/ layout. */
export function writeBundle(bundle, dir, { overwrite = false } = {}) {
  const base = resolve(dir);
  // Every path is checked before anything is written, so a bad bundle leaves nothing behind. A path must be
  // relative, without .. segments, and land inside `dir`: comparing resolved paths, not string prefixes, so a
  // sibling such as taster-evil/ next to taster/ is outside too.
  const refuse = (f) => new Error(`Refusing to write outside ${dir}: ${f.path}`);
  const targets = bundle.files.map((f) => {
    const p = f.path;
    if (typeof p !== 'string' || posix.isAbsolute(p) || win32.isAbsolute(p) || p.split(/[\\/]/).includes('..')) throw refuse(f);
    const target = resolve(base, p);
    const rel = relative(base, target);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw refuse(f);
    return target;
  });
  const written = [];
  const skipped = [];
  bundle.files.forEach((f, i) => {
    const target = targets[i];
    if (existsSync(target) && !overwrite && readFileSync(target, 'utf8') !== f.content) {
      skipped.push(f.path);
      return;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
    written.push(f.path);
  });
  // Taster's own MIT notice travels with the copied files, as its terms ask. A copy already there is kept.
  const license = join(base, 'TASTER_LICENSE.txt');
  if (!existsSync(license)) {
    mkdirSync(base, { recursive: true });
    writeFileSync(license, readFileSync(join(ROOT, 'LICENSE'), 'utf8'));
    written.push('TASTER_LICENSE.txt');
  }
  return { written, skipped };
}

/** Fetch the same bundle from a hosted Taster (the web app's /r/<id>.json), one request per id, merged. */
export async function fetchBundle(ids, from) {
  const files = new Map();
  const npm = new Set();
  const credits = [];
  for (const id of ids) {
    const url = new URL(`/r/${id}.json`, from);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const b = await res.json();
    // A hosted copy is not trusted to name where files go: only registry paths with text content are taken.
    for (const f of b.files) {
      if (!isRegistryPath(f.path) || typeof f.content !== 'string') throw new Error(`${url} lists ${JSON.stringify(f.path)}, which is not a registry path`);
      files.set(f.path, f.content);
    }
    for (const p of b.npm) npm.add(p);
    credits.push(...(b.credits || []));
  }
  return { ids, files: [...files].map(([path, content]) => ({ path, content })), npm: [...npm].sort(), credits };
}
