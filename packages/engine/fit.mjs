// Fit copied registry components to the app they land in, so `add` never changes how that app looks.
// The registry styles its components with Taster's own token names (bg-bg-elev, text-text-muted, rounded-card) through
// tokens.css and a Tailwind v3 preset. Both define names an app usually has already (--accent, --border, --radius,
// rounded-lg, ease-out), so loading them restyles the app. When the app has its own Tailwind theme, `add` instead:
//   1. reads the app's Tailwind version and tokens (v4 @theme blocks in its CSS, v3 tailwind.config theme),
//   2. rewrites each Taster token class to the app's own class where a token plays the same part (text-text-muted
//      becomes text-ink-muted when the app has --color-ink-muted), or to a stock Tailwind class of the same value
//      (text-h2 becomes text-2xl, font-med becomes font-medium),
//   3. moves every other token under a tst- prefix (text-tst-caption, var(--tst-dur-press)), defined in one generated
//      taster.css whose values point at the app's tokens where they map and keep Taster's values where they do not,
//   4. leaves tokens.css and tailwind-preset.cjs out, so no name of the app is defined twice.
// Nothing outside the folder `add` writes is changed; the setup lines it prints say where to import taster.css.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oklchToHex } from './brand.mjs';

const REGISTRY_SRC = fileURLToPath(new URL('../registry/src/', import.meta.url));
const requireHere = createRequire(import.meta.url);
export const PREFIX = 'tst';

// ---- Reading source without running it -------------------------------------------------------------------------

const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

/** Index of the bracket that closes the one at `open`, skipping strings. -1 when it never closes. */
function closing(text, open) {
  const pair = { '{': '}', '(': ')', '[': ']' };
  const stack = [pair[text[open]]];
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++;
      continue;
    }
    if (pair[c]) stack.push(pair[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  return -1;
}

/** The top-level entries of a JS object literal body: [{ key, value }] where value is its source text. */
function objectEntries(body) {
  const out = [];
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;
    if (body.startsWith('...', i)) {
      // A spread such as ...defaultTheme.colors: its names are not readable here.
      while (i < body.length && body[i] !== ',') i++;
      continue;
    }
    let key;
    const q = body[i];
    if (q === '"' || q === "'") {
      const end = body.indexOf(q, i + 1);
      key = body.slice(i + 1, end);
      i = end + 1;
    } else {
      const m = /^[\w$-]+/.exec(body.slice(i));
      if (!m) break;
      key = m[0];
      i += key.length;
    }
    while (i < body.length && /\s/.test(body[i])) i++;
    if (body[i] !== ':') {
      // A shorthand property or a method; skip to the next comma at this depth.
      while (i < body.length && body[i] !== ',') i++;
      continue;
    }
    i++;
    while (i < body.length && /\s/.test(body[i])) i++;
    const start = i;
    for (; i < body.length && body[i] !== ','; i++) {
      const c = body[i];
      if ('{(['.includes(c)) i = closing(body, i);
      else if (c === '"' || c === "'" || c === '`') for (i++; i < body.length && body[i] !== c; i++) if (body[i] === '\\') i++;
      if (i < 0) return out;
    }
    out.push({ key, value: body.slice(start, i).trim() });
  }
  return out;
}

/** The object literal that follows `name:` in `text`, as its body text, or null. */
function objectAfter(text, name) {
  const re = new RegExp(`(?:^|[\\s,{])['"]?${name}['"]?\\s*:\\s*\\{`, 'g');
  const m = re.exec(text);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const end = closing(text, open);
  return end < 0 ? null : text.slice(open + 1, end);
}

const stringValue = (v) => {
  const m = /^(['"`])([\s\S]*)\1$/.exec(v.trim());
  return m && !m[2].includes('${') ? m[2] : null;
};

// ---- Colors, for picking a readable text color and the scheme -------------------------------------------------

function parseColor(value) {
  const s = String(value || '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    return p.slice(0, 3).map((x) => (x.endsWith('%') ? (parseFloat(x) * 255) / 100 : parseFloat(x)));
  }
  m = /^hsla?\(([^)]+)\)$/.exec(s);
  if (m) {
    const [h, sat, l] = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    const S = sat / 100;
    const L = l / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return 255 * (L - S * Math.min(L, 1 - L) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return [f(0), f(8), f(4)];
  }
  m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(s);
  if (m) {
    const hex = oklchToHex({ l: Number(m[1]) / (m[2] ? 100 : 1), c: Number(m[3]), h: Number(m[4]) });
    return parseColor(hex);
  }
  if (s === 'white') return [255, 255, 255];
  if (s === 'black') return [0, 0, 0];
  return null;
}
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ---- The app --------------------------------------------------------------------------------------------------

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.vercel', '.turbo', '.cache', '.svelte-kit', '.output']);

function walk(root, test, skip = []) {
  const out = [];
  const visit = (d, depth) => {
    if (depth > 8 || out.length > 3000) return;
    let names = [];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const n of names.sort()) {
      if (SKIP.has(n) || n.startsWith('.')) continue;
      const p = join(d, n);
      if (skip.some((s) => p === s || p.startsWith(s + sep))) continue;
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) visit(p, depth + 1);
      else if (test(n)) out.push(p);
    }
  };
  visit(root, 0);
  return out;
}

/** The folder of the nearest package.json at or above `start`, or `start` itself. */
export function findAppRoot(start) {
  let d = resolve(start);
  for (;;) {
    if (existsSync(join(d, 'package.json'))) return d;
    const up = dirname(d);
    if (up === d) return resolve(start);
    d = up;
  }
}

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// v4 theme namespaces, longest first so --font-weight-x is not read as a font named weight-x.
const V4_SPACES = ['font-weight', 'transition-duration', 'breakpoint', 'color', 'radius', 'shadow', 'font', 'text', 'ease', 'animate', 'spacing'];

function readV4(cssFiles) {
  const theme = {};
  const vars = {};
  let entry = null;
  let usesTaster = false;
  for (const file of cssFiles) {
    const css = stripCssComments(readFileSync(file, 'utf8'));
    if (/@import\s+(?:url\()?['"]tailwindcss['"]/.test(css) && !entry) entry = file;
    if (/tailwind-preset\.cjs|taster\/tokens\.css|@import\s+['"][^'"]*\/tokens\.css['"]/.test(css)) usesTaster = true;
    const re = /@theme\b[^{]*\{/g;
    let m;
    const blocks = [];
    while ((m = re.exec(css))) {
      const end = closing(css, m.index + m[0].length - 1);
      if (end < 0) break;
      blocks.push([m.index, end]);
      for (const d of css.slice(m.index + m[0].length, end).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
        const name = d[1];
        const space = V4_SPACES.find((s) => name.startsWith(`${s}-`));
        if (!space || name.includes('--')) continue;
        const key = name.slice(space.length + 1);
        if (d[2].trim() === 'initial') continue;
        (theme[space] ||= {})[key] ??= { value: d[2].trim(), file };
        vars[`--${name}`] ??= d[2].trim();
      }
    }
    // Plain custom properties anywhere else (a shadcn :root block), to resolve var() in theme values.
    const rest = blocks.reduceRight((s, [a, b]) => s.slice(0, a) + s.slice(b + 1), css);
    for (const d of rest.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) vars[d[1]] ??= d[2].trim();
  }
  return { theme, vars, entry, usesTaster };
}

function flatten(body, prefix, out) {
  for (const { key, value } of objectEntries(body)) {
    const name = key === 'DEFAULT' ? prefix : prefix ? `${prefix}-${key}` : key;
    if (value.startsWith('{')) flatten(value.slice(1, -1), name, out);
    else if (name) out[name] ??= { value: stringValue(value) };
  }
}

const V3_KEYS = { colors: 'color', borderRadius: 'radius', boxShadow: 'shadow', fontFamily: 'font', fontSize: 'text', transitionTimingFunction: 'ease' };

function readV3(configFile) {
  const theme = {};
  const replaced = new Set();
  if (!configFile) return { theme, replaced, usesTaster: false };
  const text = stripJsComments(readFileSync(configFile, 'utf8'));
  const themeBody = objectAfter(text, 'theme');
  if (themeBody) {
    const extend = objectAfter(themeBody, 'extend');
    // Top level theme keys outside extend replace Tailwind's own scale for that key.
    const top = extend == null ? themeBody : themeBody.replace(extend, '');
    for (const [key, space] of Object.entries(V3_KEYS)) {
      for (const [body, isTop] of [[objectAfter(top, key), true], [extend && objectAfter(extend, key), false]]) {
        if (body == null) continue;
        if (isTop) replaced.add(space);
        const out = {};
        flatten(body, '', out);
        for (const [k, v] of Object.entries(out)) {
          // fontSize values are often [size, { lineHeight }]: keep the size.
          const value = v.value ?? (space === 'text' ? null : null);
          (theme[space] ||= {})[k] ??= { value, file: configFile };
        }
      }
    }
  }
  return { theme, replaced, usesTaster: /tailwind-preset\.cjs/.test(text) };
}

/**
 * What `add` needs to know about the app: its Tailwind major version, its tokens and where its Tailwind CSS starts.
 * @param {string} root the app folder (the one with package.json)
 * @param {{ exclude?: string[] }} [options] folders to leave out, such as the one `add` writes into
 */
export function detectHost(root, { exclude = [] } = {}) {
  root = resolve(root);
  const skip = exclude.map((d) => resolve(d));
  const pkg = readJson(join(root, 'package.json')) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const installed = readJson(join(root, 'node_modules/tailwindcss/package.json'))?.version;
  const spec = deps.tailwindcss;
  let tailwind = installed ? Number(installed.split('.')[0]) : spec && /\d+/.test(spec) ? Number(/\d+/.exec(spec)[0]) : null;
  if (!tailwind && (deps['@tailwindcss/vite'] || deps['@tailwindcss/postcss'])) tailwind = 4;

  const cssFiles = walk(root, (n) => n.endsWith('.css'), skip);
  const v4 = readV4(cssFiles);
  const configFile = ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs'].map((n) => join(root, n)).find((p) => existsSync(p)) || null;
  const v3 = readV3(configFile);
  if (!tailwind && v4.entry) tailwind = 4;
  if (!tailwind && configFile) tailwind = 3;
  // A v4 app may still load a JS config with @config; its theme counts too.
  const theme = {};
  for (const src of tailwind === 4 ? [v4.theme, v3.theme] : [v3.theme, v4.theme]) {
    for (const [space, keys] of Object.entries(src)) for (const [k, v] of Object.entries(keys)) (theme[space] ||= {})[k] ??= v;
  }
  const entry = v4.entry || cssFiles.find((f) => /@tailwind\s+(base|utilities)/.test(readFileSync(f, 'utf8'))) || null;
  return {
    root,
    tailwind,
    configFile,
    entry,
    theme,
    vars: v4.vars,
    replaced: v3.replaced,
    usesTaster: v4.usesTaster || v3.usesTaster,
    tokenCount: Object.values(theme).reduce((n, keys) => n + Object.keys(keys).length, 0),
  };
}

/** host when the app has its own Tailwind theme (and does not already load Taster's preset), taster otherwise. */
export function fitMode(host, requested = 'auto') {
  if (requested === 'host' || requested === 'taster') return requested;
  if (!host.tailwind || host.usesTaster) return 'taster';
  return Object.keys(host.theme.color || {}).length ? 'host' : 'taster';
}

// ---- Taster's tokens ------------------------------------------------------------------------------------------

/** Custom properties of one selector block in a Taster token file, in order: [[name, value]]. */
function blockVars(css, selectorTest) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (!selectorTest(m[1].trim())) continue;
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.push([d[1], d[2].trim()]);
  }
  return out;
}

function tasterTokens() {
  const tokens = stripCssComments(readFileSync(join(REGISTRY_SRC, 'tokens.css'), 'utf8'));
  const light = stripCssComments(readFileSync(join(REGISTRY_SRC, 'themes/light.css'), 'utf8'));
  // The top-level :root block (outside any @media) is the dark core; the media blocks are read separately.
  const topLevel = tokens.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const dark = blockVars(topLevel, (s) => s.startsWith(':root'));
  const media = [...tokens.matchAll(/@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)].map((m) => ({ query: m[1].trim(), vars: blockVars(m[2], (s) => s.startsWith(':root')) }));
  const ko = blockVars(topLevel, (s) => s.startsWith(':lang(ko)'));
  const lightVars = blockVars(light, (s) => s.includes('data-theme="light"'));
  return { dark, light: lightVars, media, ko, names: new Set([...dark, ...lightVars].map(([n]) => n)) };
}

const preset = () => requireHere(join(REGISTRY_SRC, 'tailwind-preset.cjs'));

// Taster color key -> the names an app tends to give the token that plays the same part, best first. `then` is the
// Taster key to borrow from when the app has none of the names, so text-subtle falls back to the app's muted text.
const COLOR_ROLES = {
  bg: { names: ['background', 'canvas', 'bg', 'page', 'base'] },
  'bg-elev': { names: ['card', 'surface', 'bg-elev', 'elevated', 'raised', 'panel'], then: 'bg' },
  'bg-sunken': { names: ['muted', 'surface-muted', 'bg-sunken', 'sunken', 'surface-sunken', 'bg-muted', 'surface-subtle', 'subtle', 'secondary'] },
  'bg-popover': { names: ['popover', 'bg-popover', 'overlay'], then: 'bg-elev' },
  border: { names: ['border', 'line', 'divider', 'stroke', 'outline', 'rule'] },
  'border-soft': { names: ['border-soft', 'line-soft', 'border-subtle', 'line-subtle'], then: 'border' },
  'border-input': { names: ['input', 'border-input', 'line-strong', 'border-strong'], then: 'border' },
  text: { names: ['foreground', 'ink', 'text', 'fg', 'content', 'body'] },
  'text-muted': { names: ['muted-foreground', 'ink-muted', 'text-muted', 'fg-muted', 'muted-fg', 'foreground-muted', 'content-muted', 'ink-soft'], then: 'text' },
  'text-subtle': { names: ['ink-subtle', 'text-subtle', 'fg-subtle', 'subtle-foreground', 'foreground-subtle', 'content-subtle', 'ink-faint'], then: 'text-muted' },
  accent: { names: ['brand', 'primary', 'accent'] },
  'accent-fg': { on: 'accent' },
  'accent-soft': { soft: 'accent' },
  highlight: { names: ['highlight'] },
  success: { names: ['success', 'positive'] },
  'success-soft': { soft: 'success' },
  warning: { names: ['warning', 'caution', 'warn'] },
  'warning-soft': { soft: 'warning' },
  danger: { names: ['danger', 'destructive', 'error', 'negative'] },
  'danger-soft': { soft: 'danger' },
  info: { names: ['info'], then: 'text' },
  ring: { names: ['ring', 'focus', 'focus-ring'], then: 'accent' },
  sidebar: { names: ['sidebar'] },
  'sidebar-border': { names: ['sidebar-border'], then: 'border' },
  'delta-up': { names: ['delta-up'], then: 'success' },
  'delta-down': { names: ['delta-down'], then: 'danger' },
  scrim: { names: ['scrim'] },
  'on-scrim': { names: ['on-scrim'] },
  'on-scrim-muted': { names: ['on-scrim-muted'] },
  'on-scrim-ink': { names: ['on-scrim-ink'] },
};
for (let i = 1; i <= 6; i++) COLOR_ROLES[`chart-${i}`] = { names: [`chart-${i}`] };

// Taster's base and alias custom properties for each color key, so var(--brand) follows the same mapping as bg-accent.
const ROLE_VARS = {
  bg: ['--bg', '--background'],
  'bg-elev': ['--bg-elev', '--card'],
  'bg-sunken': ['--bg-sunken', '--muted'],
  'bg-popover': ['--popover'],
  border: ['--border'],
  'border-soft': ['--border-soft'],
  'border-input': ['--input'],
  text: ['--text', '--foreground', '--card-foreground', '--popover-foreground'],
  'text-muted': ['--text-muted', '--muted-foreground'],
  'text-subtle': ['--text-subtle'],
  accent: ['--accent', '--brand'],
  'accent-fg': ['--accent-fg'],
  'accent-soft': ['--accent-soft'],
  highlight: ['--highlight'],
  success: ['--success'],
  'success-soft': ['--success-soft'],
  warning: ['--warning'],
  'warning-soft': ['--warning-soft'],
  danger: ['--danger', '--destructive'],
  'danger-soft': ['--danger-soft'],
  info: ['--info'],
  ring: ['--ring'],
  sidebar: ['--sidebar'],
  'sidebar-border': ['--sidebar-border'],
  'delta-up': ['--delta-up'],
  'delta-down': ['--delta-down'],
};

// Stock Tailwind values (the same in v3 and v4), so a mapping onto a stock class still has a value to fall back on.
const STOCK = {
  text: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem' },
  radius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  shadow: { sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  font: { sans: "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'", mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
};

// Size, radius, shadow and font keys: the app's token of the same name first, then a stock class of the same value.
const TEXT_ROLES = { display: ['display', '4xl'], h1: ['h1', '3xl'], h2: ['h2', '2xl'], title: ['title', 'base'], body: ['body', 'sm'], label: ['label', 'xs'], caption: ['caption'], micro: ['micro'] };
const TEXT_VARS = { display: '--t-display', h1: '--t-h1', h2: '--t-h2', title: '--t-title', body: '--t-body', label: '--t-sm', caption: '--t-xs', micro: '--t-micro' };
const RADIUS_ROLES = { card: ['card', 'lg'], pill: ['pill', 'full'] };
const SHADOW_ROLES = { card: ['card', 'sm'], pop: ['pop', 'float', 'popover', 'overlay', 'lg'] };
const FONT_ROLES = { display: ['display', 'heading', 'sans'] };
const WEIGHTS = { reg: 'normal', med: 'medium', semi: 'semibold' };
const DURATIONS = { press: '--dur-press', tooltip: '--dur-tooltip', dropdown: '--dur-dropdown', modal: '--dur-modal' };
const SCALES = { press: '--press-scale', enter: '--enter-scale' };
const DESK = '(min-width: 1024px) and (not (pointer: coarse))';

const COLOR_PREFIXES = ['bg', 'text', 'border', 'border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y', 'border-s', 'border-e', 'ring', 'ring-offset', 'outline', 'divide', 'fill', 'stroke', 'from', 'via', 'to', 'decoration', 'caret', 'placeholder', 'shadow', 'accent', 'inset-ring'];
const RADIUS_SIDES = ['', '-t', '-b', '-l', '-r', '-s', '-e', '-tl', '-tr', '-bl', '-br', '-ss', '-se', '-es', '-ee'];

/**
 * The mapping for one app: every Taster token and what it becomes there.
 * @returns {{ mode: 'host', tailwind: number, scheme: 'light'|'dark', classes: Map<string,string>, tokens: object[], vars: Map<string,string> }}
 */
export function planFit(host) {
  const v4 = host.tailwind !== 3;
  const has = (space, key) => Boolean(host.theme[space]?.[key]);
  // A stock class exists unless a v3 config replaced the whole scale without it.
  const stockOk = (space, key) => has(space, key) || (!host.replaced?.has(space) && STOCK[space]?.[key] !== undefined) || (space === 'text' && !host.replaced?.has('text'));

  const resolveHost = (expr, depth = 0) => {
    if (expr == null || depth > 6) return null;
    return String(expr).replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (all, name, fb) => {
      const v = host.vars[name];
      return v != null ? resolveHost(v, depth + 1) ?? all : fb ?? all;
    });
  };
  // How the generated CSS refers to the app's token: its CSS variable in v4 (with the literal as fallback), its value in v3.
  const cssOf = (space, key) => {
    const t = host.theme[space]?.[key];
    const literal = t?.value ? resolveHost(t.value) : STOCK[space]?.[key] ?? null;
    if (v4) {
      const name = `--${space}-${key}`;
      return literal && !literal.includes('var(') ? `var(${name}, ${literal})` : `var(${name})`;
    }
    if (t?.value) return t.value.replace(/<alpha-value>/g, '1');
    return literal;
  };
  const rgbOf = (space, key) => parseColor(resolveHost(host.theme[space]?.[key]?.value));

  const tokens = [];
  const color = {};
  const record = (entry) => {
    tokens.push(entry);
    return entry;
  };

  // Colors: the app's own token, a derived one (text on the brand, a soft tint of it), or a tst- token.
  const pick = (role) => {
    if (color[role]) return color[role];
    const spec = COLOR_ROLES[role];
    let out = null;
    const name = (spec.names || []).find((n) => has('color', n));
    if (name) out = { role, kind: 'mapped', to: name, css: cssOf('color', name), via: v4 ? `--color-${name}` : `colors.${name}` };
    else if (spec.on) {
      const base = pick(spec.on);
      if (base.kind === 'mapped') {
        const own = [`${base.to}-foreground`, `${base.to}-fg`, `on-${base.to}`, `${base.to}-ink`, `${base.to}-contrast`].find((n) => has('color', n));
        if (own) out = { role, kind: 'mapped', to: own, css: cssOf('color', own), via: v4 ? `--color-${own}` : `colors.${own}` };
        else {
          const under = rgbOf('color', base.to);
          const options = ['bg-elev', 'bg', 'text'].map((r) => pick(r)).filter((c) => c.kind === 'mapped').map((c) => ({ c, rgb: rgbOf('color', c.to) })).filter((o) => o.rgb);
          if (under && options.length) {
            const best = options.map((o) => ({ ...o, r: ratio(o.rgb, under) })).sort((a, b) => b.r - a.r)[0];
            out = { role, kind: 'mapped', to: best.c.to, css: best.c.css, via: best.c.via, note: `${best.r.toFixed(1)}:1 on ${base.to}` };
          }
        }
      }
    } else if (spec.soft) {
      const base = pick(spec.soft);
      if (base.kind === 'mapped') {
        const own = [`${base.to}-soft`, `${base.to}-subtle`, `${base.to}-muted`, `${base.to}-tint`].find((n) => has('color', n));
        if (own) out = { role, kind: 'mapped', to: own, css: cssOf('color', own), via: v4 ? `--color-${own}` : `colors.${own}` };
        else if (base.css) out = { role, kind: 'namespaced', to: `${PREFIX}-${role}`, css: `color-mix(in oklab, ${base.css} 12%, transparent)`, note: `12% of your ${base.to}` };
      }
    }
    if (!out && spec.then) {
      const from = pick(spec.then);
      if (from.kind === 'mapped') out = { ...from, role, note: `as for ${spec.then}` };
    }
    out ||= { role, kind: 'namespaced', to: `${PREFIX}-${role}`, css: null, note: "Taster's value" };
    out.space = 'color';
    color[role] = out;
    return record(out);
  };
  for (const role of Object.keys(COLOR_ROLES)) pick(role);

  // The scheme decides which of Taster's values the tst- tokens keep: the app's page color, light unless it is dark.
  const bgRgb = color.bg.kind === 'mapped' ? rgbOf('color', color.bg.to) : null;
  const scheme = bgRgb && lum(bgRgb) < 0.4 ? 'dark' : 'light';

  const byName = (space, role, names) => {
    const own = names.find((n) => has(space, n));
    if (own) return record({ space, role, kind: 'mapped', to: own, css: cssOf(space, own), via: v4 ? `--${space}-${own}` : `${space}.${own}` });
    const stock = names.find((n) => stockOk(space, n) && (STOCK[space]?.[n] !== undefined || space === 'font'));
    if (stock) return record({ space, role, kind: 'stock', to: stock, css: cssOf(space, stock), note: STOCK[space]?.[stock] && space !== 'font' && space !== 'shadow' ? STOCK[space][stock] : 'Tailwind stock' });
    return record({ space, role, kind: 'namespaced', to: `${PREFIX}-${role}`, css: null, note: "Taster's value" });
  };
  const text = Object.fromEntries(Object.entries(TEXT_ROLES).map(([role, names]) => [role, byName('text', role, names)]));
  const radius = Object.fromEntries(Object.entries(RADIUS_ROLES).map(([role, names]) => [role, byName('radius', role, names)]));
  const shadow = Object.fromEntries(Object.entries(SHADOW_ROLES).map(([role, names]) => [role, byName('shadow', role, names)]));
  const font = { display: byName('font', 'display', FONT_ROLES.display), sans: byName('font', 'sans', ['sans']), mono: byName('font', 'mono', ['mono']) };
  const drawer = has('ease', 'drawer') ? record({ space: 'ease', role: 'drawer', kind: 'mapped', to: 'drawer', via: v4 ? '--ease-drawer' : 'ease.drawer' }) : record({ space: 'ease', role: 'drawer', kind: 'namespaced', to: `[var(--${PREFIX}-ease-drawer)]`, note: "Taster's curve" });

  // Class rewrites, Taster class -> { to: class in the app, token: the entry above that decided it }.
  const classes = new Map();
  const set = (from, to, token) => classes.set(from, { to, token });
  for (const [role, c] of Object.entries(color)) for (const p of COLOR_PREFIXES) set(`${p}-${role}`, `${p}-${c.to}`, c);
  for (const [role, t] of Object.entries(text)) set(`text-${role}`, `text-${t.to}`, t);
  for (const [role, r] of Object.entries(radius)) for (const side of RADIUS_SIDES) set(`rounded${side}-${role}`, `rounded${side}-${r.to}`, r);
  for (const [role, s] of Object.entries(shadow)) set(`shadow-${role}`, `shadow-${s.to}`, s);
  set('font-display', `font-${font.display.to}`, font.display);
  for (const [k, v] of Object.entries(WEIGHTS)) set(`font-${k}`, `font-${v}`, { space: 'weight', role: k, kind: 'stock', to: v });
  set('ease-drawer', `ease-${drawer.to}`, drawer);
  for (const [k, v] of Object.entries(DURATIONS)) set(`duration-${k}`, `duration-[var(--${PREFIX}-${v.slice(2)})]`, { space: 'duration', role: k, kind: 'namespaced', note: "Taster's motion token" });
  for (const [k, v] of Object.entries(SCALES)) set(`scale-${k}`, `scale-[var(--${PREFIX}-${v.slice(2)})]`, { space: 'scale', role: k, kind: 'namespaced', note: "Taster's press scale" });
  set('desk:', `${PREFIX}-desk:`, { space: 'variant', role: 'desk', kind: 'namespaced', note: 'wide screen without a coarse pointer' });

  // Taster custom property -> what its tst- copy holds in this app, for the ones that map onto the app.
  const vars = new Map();
  for (const [role, names] of Object.entries(ROLE_VARS)) {
    const c = color[role];
    if (c?.kind === 'mapped' || (c?.kind === 'namespaced' && c.css)) for (const n of names) vars.set(n, c.css);
  }
  for (const [role, name] of Object.entries(TEXT_VARS)) if (text[role].kind !== 'namespaced' && text[role].css) vars.set(name, text[role].css);
  if (radius.card.kind !== 'namespaced' && radius.card.css) vars.set('--radius', radius.card.css);
  if (radius.pill.kind !== 'namespaced' && radius.pill.css) vars.set('--r-pill', radius.pill.css);
  if (shadow.card.kind !== 'namespaced' && shadow.card.css) vars.set('--sh-card', shadow.card.css);
  if (shadow.pop.kind !== 'namespaced' && shadow.pop.css) vars.set('--sh-pop', shadow.pop.css);
  if (font.sans.css) vars.set('--font', font.sans.css);
  if (font.mono.css) vars.set('--font-mono', font.mono.css);
  if (font.display.css) vars.set('--font-display', font.display.css);

  return { mode: 'host', tailwind: v4 ? 4 : 3, scheme, classes, tokens, vars, color, text };
}

// ---- Rewriting the copied files -------------------------------------------------------------------------------

const CLASS_TOKEN = /(^|[\s'"`:!{])(-?)([a-z][a-z0-9-]*[a-z0-9])(?=$|[\s'"`/\]}])/g;

/** Rewrite one file's Taster token classes and custom properties. Returns the new text and the classes it changed. */
export function rewriteSource(text, plan, names) {
  const used = new Map();
  let out = text.replace(CLASS_TOKEN, (all, before, neg, cls) => {
    const hit = plan.classes.get(cls);
    if (!hit || hit.to === cls) return all;
    used.set(cls, hit);
    return `${before}${neg}${hit.to}`;
  });
  // The wide-screen variant of the preset, under its tst- name.
  out = out.replace(/(^|[\s'"`:!{])desk:/g, (all, before) => {
    used.set('desk:', plan.classes.get('desk:'));
    return `${before}${PREFIX}-desk:`;
  });
  // Every Taster custom property, read or set, moves under the tst- prefix: var(--sp-2, 8px) -> var(--tst-sp-2, 8px).
  out = out.replace(/(var\(\s*|['"`[]\s*)(--[a-z][\w-]*)(?![\w-])/g, (all, before, name) => (names.has(name) ? `${before}--${PREFIX}-${name.slice(2)}` : all));
  return { text: out, used };
}

const rename = (value) => value.replace(/var\(\s*--([a-z][\w-]*)/g, (all, n) => `var(--${PREFIX}-${n}`);

/** taster.css for this app: every Taster token under tst-, pointing at the app's tokens where they map. */
export function fitCss(plan) {
  const t = tasterTokens();
  const values = new Map(t.dark);
  if (plan.scheme === 'light') for (const [n, v] of t.light) values.set(n, v);
  const lines = [];
  const mapped = [];
  for (const [n, v] of values) {
    const host = plan.vars.get(n);
    if (host) mapped.push(`  --${PREFIX}-${n.slice(2)}: ${host};`);
    else lines.push(`  --${PREFIX}-${n.slice(2)}: ${rename(v)};`);
  }
  const block = (sel, decls) => (decls.length ? `${sel} {\n${decls.join('\n')}\n}\n` : '');
  const parts = [
    `/* Generated by taster add for this app (Tailwind ${plan.tailwind}, ${plan.scheme} page). The copied components read`,
    '   these tst- tokens only, so nothing here redefines a name of yours. Tokens that map onto yours point at them;',
    "   the rest keep Taster's values. Run add again after you change your theme, or edit the values here. */",
    block(':root', [...mapped, ...lines]),
  ];
  for (const m of t.media) {
    const decls = m.vars.filter(([n]) => !plan.vars.has(n)).map(([n, v]) => `    --${PREFIX}-${n.slice(2)}: ${rename(v)};`);
    if (decls.length) parts.push(`@media ${m.query} {\n  :root {\n${decls.join('\n')}\n  }\n}\n`);
  }
  const ko = t.ko.map(([n, v]) => `  --${PREFIX}-${n.slice(2)}: ${rename(v)};`);
  parts.push(block(':lang(ko)', ko));
  if (plan.tailwind === 4) {
    const theme = [];
    for (const c of Object.values(plan.color)) if (c.kind === 'namespaced') theme.push(`  --color-${PREFIX}-${c.role}: var(--${PREFIX}-${(ROLE_VARS[c.role] || [`--${c.role}`])[0].slice(2)});`);
    for (const [role, tt] of Object.entries(plan.text)) {
      if (tt.kind !== 'namespaced') continue;
      theme.push(`  --text-${PREFIX}-${role}: var(--${PREFIX}-${TEXT_VARS[role].slice(2)});`, `  --text-${PREFIX}-${role}--line-height: 1.5;`);
    }
    parts.push(block('@theme inline', theme));
    parts.push(`@custom-variant ${PREFIX}-desk (@media ${DESK});\n`);
  }
  return parts.filter(Boolean).join('\n');
}

/** taster-tailwind.cjs for a v3 app: only the tst- names, added with extend, so no key of the app is replaced. */
export function fitPreset(plan) {
  const colors = {};
  for (const c of Object.values(plan.color)) if (c.kind === 'namespaced') colors[`${PREFIX}-${c.role}`] = `var(--${PREFIX}-${(ROLE_VARS[c.role] || [`--${c.role}`])[0].slice(2)})`;
  const fontSize = {};
  for (const [role, tt] of Object.entries(plan.text)) if (tt.kind === 'namespaced') fontSize[`${PREFIX}-${role}`] = [`var(--${PREFIX}-${TEXT_VARS[role].slice(2)})`, { lineHeight: '1.5' }];
  const config = { theme: { extend: { colors, fontSize, screens: { [`${PREFIX}-desk`]: { raw: DESK } } } } };
  return `// Generated by taster add for this app: the tst- names the copied components use, added with extend, so no\n// key of your theme is replaced. Add it to presets in your Tailwind config; values live in taster.css.\nmodule.exports = ${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Fit a resolved bundle to the app: rewrite its files and add taster.css (and taster-tailwind.cjs for v3).
 * The bundle must have been resolved without the token files.
 */
export function fitBundle(bundle, host) {
  const plan = planFit(host);
  const names = tasterTokens().names;
  const used = new Map();
  const files = bundle.files
    .filter((f) => f.path !== 'tokens.css' && f.path !== 'tailwind-preset.cjs')
    .map((f) => {
      if (!/\.(tsx?|jsx?|css)$/.test(f.path)) return f;
      const r = rewriteSource(f.content, plan, names);
      for (const [k, v] of r.used) used.set(k, v);
      return { ...f, content: r.text };
    });
  files.push({ path: 'taster.css', content: fitCss(plan) });
  if (plan.tailwind === 3) files.push({ path: 'taster-tailwind.cjs', content: fitPreset(plan) });
  return { bundle: { ...bundle, files }, plan, used };
}

const SPACE_LABEL = { color: 'color', text: 'type size', radius: 'radius', shadow: 'shadow', font: 'font', ease: 'easing', weight: 'weight', duration: 'duration', scale: 'scale', variant: 'variant' };

/** The lines `add` prints about the fit: what each Taster token the copied files use became in this app. */
export function fitReport({ plan, used }, host) {
  const rel = (f) => relative(host.root, f).split(sep).join('/');
  const from = [host.entry, host.configFile].filter(Boolean).map(rel).join(' and ') || 'your config';
  const lines = [
    `Fitted to this app: Tailwind ${plan.tailwind}, ${host.tokenCount} tokens of yours read from ${from}.`,
    "Taster's tokens.css and tailwind-preset.cjs were left out, so no token, class or :root name of yours is redefined and your page looks the same.",
  ];
  const groups = new Map();
  for (const [cls, hit] of used) {
    if (!groups.has(hit.token)) groups.set(hit.token, []);
    groups.get(hit.token).push(`${cls} -> ${hit.to}`);
  }
  const out = { mapped: [], stock: [], namespaced: [] };
  for (const [t, list] of groups) {
    const label = `${SPACE_LABEL[t.space] || t.space} ${t.role}`.padEnd(20);
    const shown = list.length > 3 ? `${list.slice(0, 3).join(', ')} (+${list.length - 3})` : list.join(', ');
    if (t.kind === 'mapped') out.mapped.push(`  ${label} your ${t.via}${t.note ? `, ${t.note}` : ''}: ${shown}`);
    else if (t.kind === 'stock') out.stock.push(`  ${label} Tailwind ${t.to}${t.note && t.note !== 'Tailwind stock' ? ` (${t.note})` : ''}: ${shown}`);
    else out.namespaced.push(`  ${label} ${t.note || "Taster's value"}: ${shown}`);
  }
  if (out.mapped.length) lines.push('Mapped onto your tokens:', ...out.mapped);
  if (out.stock.length) lines.push('Mapped onto the Tailwind class of the same value (your scale, where you set one):', ...out.stock);
  if (out.namespaced.length) lines.push(`Namespaced under ${PREFIX}- (you have no token for this part; the value is in taster.css):`, ...out.namespaced);
  lines.push(`Custom properties the components read (var(--sp-4), var(--ease-out) and the like) are renamed to --${PREFIX}-*, defined in taster.css.`);
  return lines;
}

/** Setup lines for a fitted copy: where to import taster.css, and the v3 preset. */
export function fitNextSteps(dir, host) {
  const slash = (p) => p.split(/[\\/]/).join('/');
  const absDir = resolve(dir);
  const fromEntry = (file) => {
    const rel = slash(relative(dirname(file), join(absDir, 'taster.css')));
    return rel.startsWith('.') ? rel : `./${rel}`;
  };
  if (host.tailwind === 4) {
    const entry = host.entry ? slash(relative(process.cwd(), host.entry)) : 'the stylesheet that loads Tailwind';
    return [
      `Then, in ${entry}, add this line right after @import "tailwindcss"; (one edit with your Edit tool):`,
      `  @import "${host.entry ? fromEntry(host.entry) : `./${slash(join(dir, 'taster.css'))}`}";`,
    ];
  }
  const config = host.configFile ? slash(relative(process.cwd(), host.configFile)) : 'tailwind.config.js';
  const req = slash(relative(host.configFile ? dirname(host.configFile) : process.cwd(), join(absDir, 'taster-tailwind.cjs')));
  return [
    `Then, in ${config}, add require('${req.startsWith('.') ? req : `./${req}`}') to presets (keep yours), and make sure content covers ${slash(dir)}.`,
    `And import ${slash(join(dir, 'taster.css'))} once, in ${host.entry ? slash(relative(process.cwd(), host.entry)) : 'your app root'}${host.entry ? ` (@import "${fromEntry(host.entry)}"; at the top)` : ''}.`,
  ];
}


// ---- Icons ----------------------------------------------------------------------------------------------------
// The components draw icons two ways: Icon from icons/index.tsx (a name such as chevron-down), and small glyphs
// inline in the file, stroked at 2 on the 24 grid. An app with its own icons usually draws them at another stroke, so
// side by side they read as two sets (ICO-03). When `add` finds the app's set, it writes icons/index.tsx as an adapter:
// Icon draws the app's own glyph for every name it can match and Taster's glyph at the app's stroke for the rest, and
// ICON_STROKE, the app's stroke, is what every inline icon in the copied files now reads.

const ICON_NAMES = {
  search: { lucide: ['Search'], hero: 'MagnifyingGlassIcon', local: ['Search', 'MagnifyingGlass'] },
  'chart-line': { lucide: ['ChartLine', 'LineChart'], local: ['ChartLine', 'LineChart'] },
  'chart-bar': { lucide: ['ChartColumn', 'BarChart3'], hero: 'ChartBarIcon', local: ['ChartBar', 'BarChart'] },
  list: { lucide: ['List'], hero: 'ListBulletIcon', local: ['List'] },
  check: { lucide: ['Check'], hero: 'CheckIcon', local: ['Check', 'Tick'] },
  'arrow-up-right': { lucide: ['ArrowUpRight'], hero: 'ArrowUpRightIcon', local: ['ArrowUpRight', 'External', 'ExternalLink'] },
  close: { lucide: ['X'], hero: 'XMarkIcon', local: ['Close', 'X', 'XMark', 'Cross'] },
  menu: { lucide: ['Menu'], hero: 'Bars3Icon', local: ['Menu', 'Bars', 'Hamburger'] },
  'chevron-down': { lucide: ['ChevronDown'], hero: 'ChevronDownIcon', local: ['ChevronDown'] },
  download: { lucide: ['Download'], hero: 'ArrowDownTrayIcon', local: ['Download'] },
  file: { lucide: ['File'], hero: 'DocumentIcon', local: ['File', 'Document'] },
  'chevron-left': { lucide: ['ChevronLeft'], hero: 'ChevronLeftIcon', local: ['ChevronLeft'] },
  'chevron-right': { lucide: ['ChevronRight'], hero: 'ChevronRightIcon', local: ['ChevronRight'] },
  'arrow-left': { lucide: ['ArrowLeft'], hero: 'ArrowLeftIcon', local: ['ArrowLeft'] },
  'arrow-right': { lucide: ['ArrowRight'], hero: 'ArrowRightIcon', local: ['ArrowRight', 'Arrow'] },
  play: { lucide: ['Play'], hero: 'PlayIcon', local: ['Play'] },
  pause: { lucide: ['Pause'], hero: 'PauseIcon', local: ['Pause'] },
  eye: { lucide: ['Eye'], hero: 'EyeIcon', local: ['Eye'] },
  'eye-off': { lucide: ['EyeOff'], hero: 'EyeSlashIcon', local: ['EyeOff', 'EyeSlash'] },
  copy: { lucide: ['Copy'], hero: 'DocumentDuplicateIcon', local: ['Copy', 'Duplicate'] },
  monitor: { lucide: ['Monitor'], hero: 'ComputerDesktopIcon', local: ['Monitor', 'Desktop'] },
  phone: { lucide: ['Smartphone'], hero: 'DevicePhoneMobileIcon', local: ['Phone', 'Smartphone', 'Mobile'] },
  tablet: { lucide: ['Tablet'], hero: 'DeviceTabletIcon', local: ['Tablet'] },
};
// Names that every lucide-react release has had, for when node_modules is not there to check against.
const LUCIDE_STABLE = new Set(Object.values(ICON_NAMES).flatMap((n) => n.lucide).filter((n) => !/Chart/.test(n)));

const mostCommon = (values) => {
  const count = new Map();
  for (const v of values) count.set(v, (count.get(v) || 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
};
const strokesIn = (text) => [...text.matchAll(/stroke(?:Width|-width)\s*[:=]\s*[{"']?\s*([\d.]+)/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 5);

/** The names a local icons file exports, as expressions: Icon.Check for an object of glyphs, CheckIcon for a named export. */
function localExports(text) {
  const out = [];
  const code = stripJsComments(text);
  for (const m of code.matchAll(/export\s+const\s+(\w+)\s*(?::[^=]+)?=\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const end = closing(code, open);
    if (end < 0) continue;
    for (const { key } of objectEntries(code.slice(open + 1, end))) if (/^[A-Z]/.test(key)) out.push({ name: key, expr: `${m[1]}.${key}`, base: m[1] });
  }
  for (const m of code.matchAll(/export\s+(?:function|const)\s+([A-Z]\w*)/g)) if (!out.some((o) => o.base === m[1])) out.push({ name: m[1], expr: m[1], base: m[1] });
  return out;
}

/**
 * The app's icon set: lucide-react or Heroicons when its code imports them, else a local icons file, with its stroke.
 * @returns {null | { kind: 'lucide-react'|'@heroicons/react'|'local', label: string, stroke: number, glyphs: Record<string,{ expr: string }>, imports: string[], file?: string }}
 */
export function detectIcons(root, { exclude = [] } = {}) {
  root = resolve(root);
  const skip = exclude.map((d) => resolve(d));
  const pkg = readJson(join(root, 'package.json')) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const sources = walk(root, (n) => /\.(tsx|jsx|ts|js)$/.test(n) && !/\.(test|spec|config)\./.test(n), skip).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  const importing = (lib) => sources.filter((s) => new RegExp(`from\\s+['"]${lib.replace('/', '\\/')}(?:/[^'"]*)?['"]`).test(s.text));
  const libs = [];
  if (deps['lucide-react']) libs.push({ kind: 'lucide-react', users: importing('lucide-react') });
  if (deps['@heroicons/react']) libs.push({ kind: '@heroicons/react', users: importing('@heroicons/react') });
  const local = sources
    .filter((s) => /(^|[\\/])icons?(?:[\\/]index)?\.(tsx|jsx)$/i.test(s.file) && /<svg\b/.test(s.text))
    .sort((a, b) => a.file.length - b.file.length)[0];
  const lib = libs.find((l) => l.users.length) || (local ? null : libs[0]);
  if (lib?.kind === 'lucide-react') {
    let dts = null;
    try {
      dts = readFileSync(join(root, 'node_modules/lucide-react/dist/lucide-react.d.ts'), 'utf8');
    } catch {}
    const ok = (n) => (dts ? new RegExp(`\\b${n}\\b`).test(dts) : LUCIDE_STABLE.has(n));
    const glyphs = {};
    for (const [taster, names] of Object.entries(ICON_NAMES)) {
      const n = names.lucide.find(ok);
      if (n) glyphs[taster] = { expr: `Host${n}`, name: n };
    }
    const stroke = mostCommon(lib.users.flatMap((u) => strokesIn(u.text))) ?? 2;
    const names = [...new Set(Object.values(glyphs).map((g) => g.name))];
    return { kind: lib.kind, label: 'lucide-react', stroke, glyphs, imports: [`import { ${names.map((n) => `${n} as Host${n}`).join(', ')} } from 'lucide-react'`] };
  }
  if (lib?.kind === '@heroicons/react') {
    let dts = null;
    try {
      dts = readFileSync(join(root, 'node_modules/@heroicons/react/24/outline/index.d.ts'), 'utf8');
    } catch {}
    const glyphs = {};
    for (const [taster, names] of Object.entries(ICON_NAMES)) if (names.hero && (!dts || dts.includes(names.hero))) glyphs[taster] = { expr: `Host${names.hero}`, name: names.hero };
    const stroke = mostCommon(lib.users.flatMap((u) => strokesIn(u.text))) ?? 1.5;
    const names = [...new Set(Object.values(glyphs).map((g) => g.name))];
    return { kind: lib.kind, label: '@heroicons/react/24/outline', stroke, glyphs, imports: [`import { ${names.map((n) => `${n} as Host${n}`).join(', ')} } from '@heroicons/react/24/outline'`] };
  }
  if (local) {
    const exported = localExports(local.text);
    const glyphs = {};
    for (const [taster, names] of Object.entries(ICON_NAMES)) {
      const hit = names.local.flatMap((n) => [n, `${n}Icon`, `Icon${n}`]).map((n) => exported.find((e) => e.name === n)).find(Boolean);
      if (hit) glyphs[taster] = { expr: `host.${hit.expr}`, name: hit.expr };
    }
    const stroke = mostCommon(strokesIn(local.text)) ?? 2;
    return { kind: 'local', label: relative(root, local.file).split(sep).join('/'), file: local.file, stroke, glyphs, imports: [] };
  }
  return null;
}

const relImport = (fromFile, toFile) => {
  const r = posix.relative(posix.dirname(fromFile), toFile).replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\/index$/, '');
  return r.startsWith('.') ? r : `./${r}`;
};

/** icons/index.tsx as an adapter to the app's icon set, made from the registry's own icons file. */
export function iconAdapter(icons, source, { dir } = {}) {
  let out = source;
  const imports = [...icons.imports];
  if (icons.kind === 'local' && dir) {
    const adapter = join(resolve(dir), 'icons', 'index.tsx').split(sep).join('/');
    imports.push(`import * as host from '${relImport(adapter, icons.file.split(sep).join('/'))}'`);
  }
  const map = Object.entries(icons.glyphs).map(([taster, g]) => `  '${taster}': ${g.expr},`);
  const head = [
    '',
    `// Icon adapter written by taster add for this app. Every copied component draws its icons through this file: Icon`,
    `// for named glyphs, and ICON_STROKE for the few glyphs drawn inline in a component. Your set: ${icons.label}, stroke`,
    `// ${icons.stroke}. HOST maps Taster's icon names onto it; a name not in HOST is drawn from Taster's paths below at`,
    '// ICON_STROKE. To use another set, change the import, HOST and ICON_STROKE here; no component needs to change.',
    '',
    `/** Stroke width on the 24 grid of every icon the copied components draw: the one your icons use. */`,
    `export const ICON_STROKE = ${icons.stroke}`,
    '',
    `const HOST: Partial<Record<string, React.ElementType>> = {`,
    ...map,
    '}',
    '',
  ].join('\n');
  const reactImport = /import \* as React from 'react'\n/;
  if (!reactImport.test(out) || !/const paths = \{/.test(out)) throw new Error('icons/index.tsx changed shape: update iconAdapter in packages/engine/fit.mjs');
  out = out.replace(reactImport, (m) => `${m}${imports.map((i) => `${i}\n`).join('')}`);
  out = out.replace(/\nconst paths = \{/, `${head}\nconst paths = {`);
  out = out.replace(/strokeWidth \?\? 'var\(--(?:tst-)?icon-stroke, 2\)'/, 'strokeWidth ?? ICON_STROKE');
  out = out.replace(/Default --(?:tst-)?icon-stroke \(2\)\./, 'Default ICON_STROKE, the stroke of your set.');
  const glyph = [
    '  const Glyph = HOST[name]',
    '  if (Glyph) {',
    '    return (',
    '      <Glyph',
    "        role={title ? 'img' : undefined}",
    '        aria-hidden={title ? undefined : true}',
    '        aria-label={title}',
    '        data-icon={name}',
    '        {...rest}',
    '        strokeWidth={strokeWidth ?? ICON_STROKE}',
    "        style={{ width: px(width) ?? box, height: px(height) ?? box, flex: 'none', ...style }}",
    '      />',
    '    )',
    '  }',
    '  return (\n    <svg',
  ].join('\n');
  if (!/\n  return \(\n    <svg/.test(out) || !/strokeWidth \?\? ICON_STROKE/.test(out)) throw new Error('icons/index.tsx changed shape: update iconAdapter in packages/engine/fit.mjs');
  out = out.replace(/\n  return \(\n    <svg/, `\n${glyph}`);
  return out;
}

/** The end of an opening JSX tag that starts at `start` (`<svg`), skipping braces and strings. */
function tagEnd(text, start) {
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') i = closing(text, i);
    else if (c === '"' || c === "'") i = text.indexOf(c, i + 1);
    if (i < 0) return -1;
    if (text[i] === '>') return i;
  }
  return -1;
}

/** Inline 24-grid line icons in one copied file read ICON_STROKE from the adapter. Returns the text and how many. */
export function inlineIconStroke(text, path) {
  let count = 0;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(/<svg\b/g)) {
    if (m.index < last) continue;
    const end = tagEnd(text, m.index);
    if (end < 0) break;
    const tag = text.slice(m.index, end + 1);
    let next = tag;
    if (/viewBox=["']0 0 24 24["']/.test(tag) && /stroke=["']currentColor["']/.test(tag)) {
      next = tag.replace(/strokeWidth=(?:"[\d.]+"|'[\d.]+'|\{[\d.]+\})/, () => {
        count++;
        return 'strokeWidth={ICON_STROKE}';
      });
    }
    out += text.slice(last, m.index) + next;
    last = end + 1;
  }
  out += text.slice(last);
  if (!count) return { text, count };
  const from = relImport(path, 'icons/index.tsx');
  const existing = new RegExp(`import \\{([^}]*)\\} from '${from.replace(/\./g, '\\.')}'`);
  if (existing.test(out)) out = out.replace(existing, (all, names) => `import {${names.trimEnd()}, ICON_STROKE } from '${from}'`);
  else {
    const imports = [...out.matchAll(/^import [^\n]*\n/gm)];
    const at = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
    out = `${out.slice(0, at)}import { ICON_STROKE } from '${from}'\n${out.slice(at)}`;
  }
  return { text: out, count };
}

/**
 * Point a bundle's icons at the app's set: the adapter in icons/index.tsx and ICON_STROKE in every inline icon.
 * @returns {{ bundle: object, icons: object, inline: number, files: string[] }}
 */
export function fitIcons(bundle, icons, { dir } = {}) {
  let inline = 0;
  const touched = [];
  const files = bundle.files.map((f) => {
    if (!/\.(tsx|jsx)$/.test(f.path) || f.path === 'icons/index.tsx') return f;
    const r = inlineIconStroke(f.content, f.path);
    if (!r.count) return f;
    inline += r.count;
    touched.push(f.path);
    return { ...f, content: r.text };
  });
  const named = files.some((f) => /from '(?:\.\.\/)+icons'/.test(f.content));
  if (named || inline) {
    const at = files.findIndex((f) => f.path === 'icons/index.tsx');
    // The registry's file, with the same renames as the rest when the bundle was fitted to the app's tokens.
    const base = at >= 0 ? files[at].content : readFileSync(join(REGISTRY_SRC, 'icons/index.tsx'), 'utf8');
    const adapter = { path: 'icons/index.tsx', content: iconAdapter(icons, base, { dir }) };
    if (at >= 0) files[at] = adapter;
    else files.push(adapter);
  }
  return { bundle: { ...bundle, files }, icons, inline, files: touched };
}

/** The lines `add` prints about icons. */
export function iconReport({ icons, inline, files }, dir) {
  const matched = Object.keys(icons.glyphs);
  const adapter = `${dir.split(/[\\/]/).join('/')}/icons/index.tsx`;
  const lines = [
    `Icons: your set is ${icons.label} at stroke ${icons.stroke}. Every icon in the copied files now goes through one adapter, ${adapter}:`,
    `  Icon draws your glyph for ${matched.length ? matched.join(', ') : 'no name yet'}; any other name is Taster's glyph at stroke ${icons.stroke}.`,
  ];
  if (inline) lines.push(`  ${inline} icon${inline === 1 ? '' : 's'} drawn inline (${files.join(', ')}) now read ICON_STROKE, ${icons.stroke}, from it.`);
  lines.push('  To draw with a different set, edit HOST and ICON_STROKE in that file; no component needs to change.');
  return lines;
}

export const _test = { objectEntries, objectAfter, parseColor, ratio, posix };
