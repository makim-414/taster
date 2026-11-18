// Copy registry components into an app, standalone: no shadcn CLI, no components.json, no account. Resolves every
// relative import a component makes (helpers, other components, icons), adds the token files once, and reports the
// npm packages to install. Works from this repository or from a hosted copy (`--from https://...`), which serves the
// same file list as JSON at /r/<id>.json (apps/web/app/r/[...id]/route.ts).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REGISTRY_DIR = join(ROOT, 'packages/registry');
const EXTS = ['.tsx', '.ts', '.js', '.cjs', '.css'];
// The folders under packages/registry/src a bundle writes into (a test keeps this equal to the groups in registry.json), and
// the files that sit at the top of the bundle: the tokens, the Tailwind preset and the notices.
export const GROUPS = ['blocks', 'marketing', 'motion', 'content', 'chat', 'commerce', 'media', 'icons', 'scene'];
const TOP_FILES = ['tokens.css', 'tailwind-preset.cjs', 'THIRD_PARTY_NOTICES.md'];
const GROUP_PATH = new RegExp(`^(?:${GROUPS.join('|')})\\/`);

export function loadRegistry() {
  return JSON.parse(readFileSync(join(REGISTRY_DIR, 'registry.json'), 'utf8'));
}

// The source without block comments and whole-line comments, so an import shown in a JSDoc example is not read as one.
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Relative imports in a source file: import ... from './x', export ... from '../y', import './z.css'.
function relativeImports(source) {
  const out = new Set();
  for (const m of code(source).matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)) out.add(m[1]);
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
 * Everything one or more components need, as files relative to packages/registry/src, plus npm packages and credits.
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
    for (const m of code(content).matchAll(/from\s+['"]([^.'"/][^'"]*)['"]/g)) {
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

/**
 * What to do once the files are in `dir`, printed last by `add`: the tokens import and the Tailwind preset, which the
 * components need to be styled at all (without it the app still builds), and the :root names an app's own starter
 * CSS tends to define after the tokens.
 */
export function nextSteps(dir) {
  const slash = (p) => p.split(/[\\/]/).join('/');
  const preset = slash(join(dir, 'tailwind-preset.cjs'));
  const fromRoot = isAbsolute(dir) || preset.startsWith('.') ? preset : `./${preset}`;
  return [
    `Then import ${slash(join(dir, 'tokens.css'))} once at your app root.`,
    'The components are styled with Tailwind classes, so the app needs Tailwind CSS with the Taster preset. In tailwind.config.cjs at the app root:',
    `  module.exports = { presets: [require('${fromRoot}')], content: ['./index.html', './src/**/*.{ts,tsx}'] };`,
    'Tailwind v3 reads that file as is. Tailwind v4 reads it from the top of the stylesheet in src/ that loads Tailwind:',
    '  @import "tailwindcss";',
    '  @config "../tailwind.config.cjs";',
    'tokens.css defines --bg, --text, --border and --accent on :root. A stylesheet of your app that defines the same names after it wins: remove or rename them in your starter CSS.',
  ];
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

// ---- Wiring: the import line and the JSX for each component, so an agent places it with one edit per file -------

/** Top-level members of a TypeScript object type body: [{ name, optional, type }]. */
function members(body) {
  const out = [];
  const text = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  let depth = 0;
  let cur = '';
  const flush = () => {
    const m = /^\s*(?:readonly\s+)?(['"]?)([\w$-]+)\1(\?)?\s*:\s*([\s\S]+?)\s*[;,]?\s*$/.exec(cur);
    if (m) out.push({ name: m[2], optional: Boolean(m[3]), type: m[4].replace(/\s+/g, ' ') });
    cur = '';
  };
  for (const c of text) {
    if ('{(<['.includes(c)) depth++;
    else if ('})>]'.includes(c) && depth > 0) depth--;
    if (depth === 0 && (c === '\n' || c === ';')) {
      if (cur.trim()) flush();
      continue;
    }
    cur += c;
  }
  if (cur.trim()) flush();
  return out;
}

/** The body of `interface Name ... {}` or `type Name = {}` (or `... & {}`) in a file, or null. */
function typeBody(source, name) {
  const m = new RegExp(`(?:interface\\s+${name}\\b[^{]*|type\\s+${name}\\s*=[^{;]*)\\{`).exec(source);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(m.index + m[0].length, i);
  }
  return null;
}

const pascal = (file) => posix.basename(file).replace(/\.[jt]sx?$/, '').split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');

/**
 * How to use a copied component: its main export, the import line from `fromFile` and a JSX snippet with the props
 * it needs. `filePath` is where the component is in the app, `fromFile` the file that will import it.
 */
export function usageFor(content, filePath, fromFile) {
  const src = code(content);
  const exports = [...src.matchAll(/export\s+(?:function|const)\s+([A-Z]\w*)/g)].map((m) => m[1]);
  if (!exports.length) {
    // A hook or a helper: the import, and a call.
    const fn = /export\s+function\s+(\w+)/.exec(src)?.[1];
    if (!fn) return null;
    let spec = posix.relative(posix.dirname(fromFile), filePath).replace(/\.[jt]sx?$/, '');
    if (!spec.startsWith('.')) spec = `./${spec}`;
    return { name: fn, import: `import { ${fn} } from '${spec}'`, jsx: `${fn}(...)`, props: [], optional: [] };
  }
  const name = exports.includes(pascal(filePath)) ? pascal(filePath) : exports[0];
  const sig = new RegExp(`export\\s+function\\s+${name}\\s*\\([^)]*?:\\s*(\\w+)\\s*\\)|export\\s+const\\s+${name}\\s*=\\s*React\\.forwardRef<[^,>]+(?:<[^>]*>)?\\s*,\\s*(\\w+)`).exec(src);
  const propsName = sig && (sig[1] || sig[2]);
  const props = propsName ? members(typeBody(src, propsName) || '') : [];
  const required = props.filter((p) => !p.optional);
  const localTypes = new Set([...src.matchAll(/export\s+(?:interface|type)\s+(\w+)/g)].map((m) => m[1]));
  const types = [];
  const propLines = [];
  const notes = [];
  for (const p of required) {
    const used = [...localTypes].filter((t) => new RegExp(`\\b${t}\\b`).test(p.type) && t !== propsName);
    for (const t of used) {
      if (!types.includes(t)) types.push(t);
      const fields = members(typeBody(src, t) || '');
      const field = (f) => {
        const inner = /^\{([\s\S]*)\}$/.exec(f.type.trim());
        const sub = inner ? members(inner[1]) : [];
        return `${f.name}${f.optional ? '?' : ''}${sub.length ? `: { ${sub.map((x) => `${x.name}${x.optional ? '?' : ''}`).join(', ')} }` : ''}`;
      };
      if (fields.length) notes.push(`${t} is { ${fields.map(field).join(', ')} }`);
    }
    propLines.push(`${p.name}: ${p.type}`);
  }
  let spec = posix.relative(posix.dirname(fromFile), filePath).replace(/\.[jt]sx?$/, '');
  if (!spec.startsWith('.')) spec = `./${spec}`;
  const importLine = `import { ${[name, ...types.map((t) => `type ${t}`)].join(', ')} } from '${spec}'`;
  const attrs = required.filter((p) => p.name !== 'children').map((p) => ` ${p.name}={${p.name}}`).join('');
  const jsx = required.some((p) => p.name === 'children') ? `<${name}${attrs}>...</${name}>` : `<${name}${attrs} />`;
  return { name, import: importLine, jsx, props: [...propLines, ...notes], optional: props.filter((p) => p.optional).map((p) => p.name) };
}

/** Wiring lines for the components asked for: the guidance, then per component the import, the JSX and its props. */
export function wiringSteps(ids, bundle, dir, fromFile) {
  const slash = (p) => p.split(/[\\/]/).join('/');
  const registry = loadRegistry();
  const lines = [
    `Wire each one in with your Edit tool, one file per edit: the import line at the top of ${fromFile}, then the JSX where the section goes.`,
    'Do not write these files with a shell heredoc, sed or a script: that asks the user for permission, and the live viewer only sees edits made with Edit or Write.',
  ];
  const usage = [];
  for (const id of ids) {
    const c = registry.components.find((x) => x.id === id);
    const rel = c ? c.file.replace(/^src\//, '') : null;
    const f = rel && bundle.files.find((x) => x.path === rel);
    if (!f) continue;
    const u = usageFor(f.content, slash(join(dir, rel)), slash(fromFile));
    if (!u) continue;
    usage.push({ id, ...u });
    lines.push(`  ${id}:`, `    ${u.import}`, `    ${u.jsx}`);
    for (const n of u.props) lines.push(`    ${n}`);
    if (u.optional.length) lines.push(`    optional: ${u.optional.join(', ')}`);
  }
  return { lines, usage };
}
