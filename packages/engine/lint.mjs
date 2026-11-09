#!/usr/bin/env node
// taster lint: the source side of the rules. detect.js measures a rendered page; this reads the code that will
// render it, so a tinted pill or a transition-all is caught in review, before anything runs in a browser.
//
//   taster lint [paths...] [--json] [--baseline <file>] [--write-baseline] [--selftest]
//
// Each check is a line pattern. Where a pattern is the source form of a measured rule it carries that rule's id
// (AC-04, MOT-02 ...) so the fix and the fix patterns come from rules.json; checks that only make sense in
// source use SRC- ids. A line is skipped when it, or the line above, holds `taster-allow <reason>`; an allow
// without a reason is reported itself. --baseline turns the run into a ratchet: counts per file and check may
// only go down, so an old codebase can adopt it without fixing everything first.
import { existsSync, lstatSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const RULES_JSON = JSON.parse(readFileSync(new URL('../../rules/rules.json', import.meta.url), 'utf8')).rules;
const RULE_BY_ID = new Map(RULES_JSON.map((r) => [r.id, r]));

const CHROMA = '(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const CODE = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.html', '.htm', '.vue', '.svelte', '.astro'];
const STYLE = ['.css', '.scss', '.sass', '.less'];
const DOCS = ['.md', '.mdx'];
const ALL = [...CODE, ...STYLE, ...DOCS];
// Long dashes are written as escapes so this file does not trip its own check.
const DASH = /[\u2013\u2014]/;
const EMOJI = /\p{Extended_Pictographic}\uFE0F?|\p{Emoji_Presentation}/u;
// Caps with wide tracking written as CSS on one line, in either order (0.05em and up).
const SPACED = 'letter-spacing\\s*:\\s*(?:0?\\.(?:0[5-9]|[1-9])\\d*|[1-9][\\d.]*)(?:em|rem)';
const CSS_CAPS = `text-transform\\s*:\\s*uppercase[^}]*${SPACED}|${SPACED}[^}]*text-transform\\s*:\\s*uppercase`;
// A class string or a style value on the line: the checks look inside quotes, template literals and CSS values.
const SAME_STRING = '[^"\'`]*';

/**
 * @typedef {object} Check
 * @property {string} id      a rules.json id, or SRC-nn for checks that exist only in source
 * @property {string} [name]  for SRC checks (rules.json names the rest)
 * @property {string} [fix]   for SRC checks
 * @property {RegExp} re      tested against one line
 * @property {string[]} ext   file extensions it applies to
 * @property {RegExp} [except] the line passes when this also matches
 * @property {string[]} bad   lines that must be reported (selftest)
 * @property {string[]} good  lines that must pass (selftest)
 */
/** @type {Check[]} */
export const CHECKS = [
  {
    id: 'AC-04',
    re: new RegExp(`\\bbg-${CHROMA}-\\d{2,3}\\/\\d`),
    ext: CODE,
    bad: ['<span className="rounded-full bg-violet-500/15 px-2 text-violet-300">Beta</span>'],
    good: ['<span className="rounded-full border border-border px-2 text-text-muted">Beta</span>'],
  },
  {
    id: 'AC-05',
    re: new RegExp(`(?=${SAME_STRING}\\brounded-full\\b)(?=${SAME_STRING}\\bborder-${CHROMA}-\\d{2,3}\\b)`),
    ext: CODE,
    bad: ['<span className="rounded-full border border-blue-400 text-blue-400">New</span>'],
    good: ['<span className="rounded-full border border-border text-text">New</span>'],
  },
  {
    id: 'AC-10',
    re: /\bborder-l-(?:[2-9]|\d{2,}|\[)|border-left(?:-width)?\s*:\s*(?:[3-9]|\d{2,})px/,
    ext: [...CODE, ...STYLE],
    bad: ['<div className="border-l-4 border-emerald-500 pl-4">', '.callout { border-left: 4px solid #10b981; }'],
    good: ['<div className="border border-border pl-4">', '.callout { border-left: 1px solid var(--border); }'],
  },
  {
    id: 'AC-01',
    re: new RegExp(`\\buppercase\\b${SAME_STRING}\\btracking-(?:wide|wider|widest|\\[)|\\btracking-(?:wide|wider|widest|\\[)${SAME_STRING}\\buppercase\\b|${CSS_CAPS}`),
    ext: [...CODE, ...STYLE],
    bad: ['<p className="text-xs uppercase tracking-widest text-text-muted">Features</p>', '.eyebrow { text-transform: uppercase; letter-spacing: 0.2em; }'],
    good: ['<p className="text-sm text-text-muted">Features</p>', '.nav a { letter-spacing: -0.01em; }'],
  },
  {
    id: 'AC-02',
    re: new RegExp(`${DASH.source}|&(?:mdash|ndash|#8212|#8211|#x2014|#x2013);`),
    ext: ALL,
    bad: ['<p>Fast \u2014 simple \u2014 yours.</p>', '<p>Fast &mdash; simple.</p>'],
    good: ['<p>Fast, simple and yours.</p>'],
  },
  {
    id: 'AC-03',
    re: EMOJI,
    ext: ALL,
    bad: ['<li>\u{1F680} Ship faster</li>'],
    good: ['<li>Ship faster</li>'],
  },
  {
    id: 'AC-08',
    re: new RegExp(`(?=${SAME_STRING}\\brounded-full\\b)(?=${SAME_STRING}\\bbg-${CHROMA}-\\d{2,3}(?![\\d/]))(?=${SAME_STRING}\\b(?:size|h|w)-(?:1|1\\.5|2|2\\.5)\\b)`),
    ext: CODE,
    bad: ['<span className="size-2 rounded-full bg-amber-400" />'],
    good: ['<span className="size-2 rounded-full bg-text-subtle" />'],
  },
  {
    id: 'AC-09',
    re: /(?<![\w-])font-mono\b/,
    except: /<(?:code|pre|kbd|samp)\b/,
    ext: [...CODE, ...STYLE],
    bad: ['<span className="font-mono text-xs uppercase">Status</span>'],
    good: ['<code className="font-mono">npm install</code>'],
  },
  {
    id: 'MOT-02',
    re: /\btransition-all\b|transition(?:-?property|Property)?['"]?\s*:\s*['"]?all\b/,
    ext: [...CODE, ...STYLE],
    bad: ['<button className="transition-all duration-300">', '.card { transition: all 0.3s ease; }', '<button style={{ transition: "all .25s" }}>'],
    good: ['<button className="transition-colors duration-press">', '.card { transition: opacity 160ms ease-out; }'],
  },
  {
    id: 'MOT-04',
    re: /(?<![\w-])ease-in(?![\w-])/,
    ext: [...CODE, ...STYLE],
    bad: ['<div className="transition-opacity ease-in">', '.menu { transition: transform 200ms ease-in; }'],
    good: ['<div className="transition-opacity ease-out">', '.menu { transition: transform 200ms ease-in-out; }'],
  },
  {
    id: 'SRC-01',
    name: 'Hard-coded color in a component',
    fix: 'Read a token (var(--accent), var(--text-muted), a theme class) instead of writing the color. Colors belong in the token file, where a theme can change them in one place.',
    re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[\d.]/,
    // Custom property definitions are where colors are supposed to live; a var() fallback only shows when the token is missing.
    // A mask or an alpha ramp uses black and white as alpha, not as a color people see.
    except: /^\s*--[\w-]+\s*:|var\(--[\w-]+,\s*(?:#|rgba?\(|hsla?\(|oklch\()|\bmask\b|-webkit-mask/,
    ext: [...CODE, ...STYLE],
    bad: ['<div style={{ color: "#7c3aed" }}>', '.hero { background: rgba(124, 58, 237, 0.2); }'],
    good: ['<div style={{ color: "var(--accent)" }}>', '  --accent: oklch(0.6 0.2 290);', '.btn { color: var(--accent-fg, oklch(0.2 0 0)); }'],
  },
  {
    id: 'SRC-02',
    name: 'Arbitrary size outside the scale',
    fix: 'Use a step of the type and space scale (text-sm, p-4, rounded-md). If no step fits, add a token first; one-off pixel values drift apart screen by screen.',
    // Pixel one-offs only: em and ch values that scale with the text (tracking-[-0.01em], w-[1ch]) are type tuning, not drift.
    re: /\b(?:text|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|rounded(?:-[a-z]{1,2})?|leading|tracking|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset)-\[(?!var\()-?\d+(?:\.\d+)?px\]/,
    ext: CODE,
    bad: ['<p className="text-[13px] leading-[18px]">', '<div className="rounded-[14px] p-[18px]">'],
    good: ['<p className="text-sm leading-normal">', '<div className="rounded-[var(--r-card)] p-4">', '<h2 className="tracking-[-0.01em]">'],
  },
  {
    id: 'SRC-03',
    name: 'Stock palette color instead of a token',
    fix: 'Map the color to a role token (bg-accent, text-text-muted, border-border). A stock palette class is a color picked once and never themed.',
    re: new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret)-${CHROMA}-\\d{2,3}\\b(?!\\/)`),
    ext: CODE,
    bad: ['<button className="bg-indigo-600 text-white">', '<div className="bg-gradient-to-r from-purple-500 to-pink-500">'],
    good: ['<button className="bg-accent text-accent-fg">'],
  },
];

// File level checks that need more than one line.
export const FILE_CHECKS = [
  {
    id: 'SRC-04',
    name: 'Tailwind breakpoints replaced instead of extended',
    fix: 'Put custom screens under theme.extend.screens, or keep sm, md and lg in the list. Replacing theme.screens drops the defaults, and every sm: and lg: class in the code silently stops generating CSS.',
    applies: (file) => /^tailwind\.config\.(c?js|mjs|ts)$/.test(basename(file)),
    run(text) {
      const out = [];
      const re = /\bscreens\s*:\s*\{/g;
      let m;
      while ((m = re.exec(text))) {
        if (parentKey(text, m.index) === 'extend') continue;
        const body = text.slice(m.index, closeBrace(text, m.index + m[0].length - 1) + 1);
        const keys = ['sm', 'md', 'lg'].filter((k) => new RegExp(`(^|[\\s{,'"])${k}['"]?\\s*:`).test(body));
        if (keys.length < 2) out.push({ line: text.slice(0, m.index).split('\n').length, text: body.split('\n')[0] });
      }
      return out;
    },
    bad: ["module.exports = { theme: { screens: { desktop: '1200px' } } }"],
    good: ["module.exports = { theme: { extend: { screens: { '3xl': '1920px' } } } }", "module.exports = { theme: { screens: { sm: '640px', md: '768px', lg: '1024px' } } }"],
  },
];

function closeBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return text.length - 1;
}
// The key whose object contains position `at` (the `extend` in theme.extend.screens).
function parentKey(text, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i--) {
    if (text[i] === '}') depth++;
    else if (text[i] === '{') {
      if (depth === 0) {
        const m = text.slice(0, i).match(/['"]?([\w$-]+)['"]?\s*:\s*$/);
        return m ? m[1] : null;
      }
      depth--;
    }
  }
  return null;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel', 'coverage', 'vendor', '.cache']);
const ALLOW = /taster-allow\b(.*)/;

// A path named on the command line is followed even when it is a link; links met while walking are skipped, so a
// link back up the tree (a/loop -> ..) cannot loop and a linked file elsewhere is not read as part of this tree.
function walk(path, files = [], named = true) {
  const st = named ? statSync(path) : lstatSync(path);
  if (st.isSymbolicLink()) return files;
  if (st.isFile()) {
    if (ALL.includes(extname(path)) && !/\.min\./.test(path)) files.push(path);
    return files;
  }
  for (const name of readdirSync(path).sort()) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    walk(join(path, name), files, false);
  }
  return files;
}

function isComment(line, ext) {
  const t = line.trim();
  if (DOCS.includes(ext)) return false;
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('<!--') || t.startsWith('{/*');
}

/** Lints one file's text. Returns [{ rule, line, column, text }]. */
export function lintText(text, file) {
  const ext = extname(file);
  const lines = text.split('\n');
  const out = [];
  let fence = false, block = false;
  lines.forEach((line, i) => {
    if (DOCS.includes(ext) && /^\s*(```|~~~)/.test(line)) { fence = !fence; return; }
    if (fence) return;
    // Inside a multi-line /* */ or <!-- --> comment: skip until it closes.
    if (block) { if (/\*\/|-->/.test(line)) block = false; return; }
    if (!DOCS.includes(ext) && /^\s*(\/\*|<!--|\{\/\*)/.test(line) && !/\*\/|-->/.test(line)) { block = true; return; }
    const allowHere = line.match(ALLOW) || (i > 0 && lines[i - 1].match(ALLOW));
    if (allowHere) {
      if (!allowHere[1].replace(/[*/>\-\s}]/g, '')) out.push({ rule: 'SRC-00', line: i + 1, column: 1, text: line.trim().slice(0, 120) });
      return;
    }
    if (isComment(line, ext)) return;
    for (const c of CHECKS) {
      if (!c.ext.includes(ext)) continue;
      if (DOCS.includes(ext) && c.id !== 'AC-02' && c.id !== 'AC-03') continue;
      const m = line.match(c.re);
      if (!m || (c.except && c.except.test(line))) continue;
      out.push({ rule: c.id, line: i + 1, column: m.index + 1, text: line.trim().slice(0, 120) });
    }
  });
  for (const fc of FILE_CHECKS) {
    if (!fc.applies(file)) continue;
    for (const h of fc.run(text)) out.push({ rule: fc.id, line: h.line, column: 1, text: h.text.trim().slice(0, 120) });
  }
  return out;
}

export function describe(id) {
  if (id === 'SRC-00') return { name: 'Allow comment without a reason', fix: 'Write why the line is an exception: taster-allow <reason>.' };
  const r = RULE_BY_ID.get(id);
  if (r) return { name: r.name, fix: r.fix, patterns: r.fix_patterns };
  const c = [...CHECKS, ...FILE_CHECKS].find((x) => x.id === id);
  return { name: (c && c.name) || id, fix: (c && c.fix) || `See \`taster --explain ${id}\`.` };
}

export function lintPaths(paths, cwd = process.cwd()) {
  const files = paths.flatMap((p) => walk(resolve(cwd, p)));
  const findings = [];
  for (const f of files) {
    const rel = relative(cwd, f).split('\\').join('/');
    for (const x of lintText(readFileSync(f, 'utf8'), f)) findings.push({ file: rel, ...x });
  }
  return { files: files.length, findings };
}

/** Counts per "file::rule", the unit a baseline ratchets on. */
export function countsOf(findings) {
  const counts = {};
  for (const f of findings) counts[`${f.file}::${f.rule}`] = (counts[`${f.file}::${f.rule}`] || 0) + 1;
  return counts;
}

/** Findings beyond the baseline (new ones) and keys that went down (fixed). */
export function compareBaseline(findings, baseline) {
  const now = countsOf(findings);
  const allowed = { ...(baseline.counts || {}) };
  const fresh = [];
  for (const f of findings) {
    const k = `${f.file}::${f.rule}`;
    if (allowed[k] > 0) allowed[k]--;
    else fresh.push(f);
  }
  const fixed = Object.keys(baseline.counts || {}).filter((k) => (now[k] || 0) < baseline.counts[k]);
  return { fresh, fixed };
}

export function selftest() {
  const problems = [];
  for (const c of CHECKS) {
    const file = `x${c.ext.includes('.tsx') ? '.tsx' : c.ext[0]}`;
    for (const line of c.bad) {
      const ext = /^\.\w+ \{|^\s*--|^\.[\w-]+ \{/.test(line) ? '.css' : extname(file);
      if (!lintText(line, `x${ext}`).some((f) => f.rule === c.id)) problems.push(`${c.id} missed: ${line}`);
    }
    for (const line of c.good) {
      const ext = /^\.[\w-]+ \{|^\s*--/.test(line) ? '.css' : extname(file);
      if (lintText(line, `x${ext}`).some((f) => f.rule === c.id)) problems.push(`${c.id} flagged a good line: ${line}`);
    }
  }
  for (const fc of FILE_CHECKS) {
    for (const t of fc.bad) if (!fc.run(t).length) problems.push(`${fc.id} missed: ${t}`);
    for (const t of fc.good) if (fc.run(t).length) problems.push(`${fc.id} flagged a good file: ${t}`);
  }
  if (lintText('// taster-allow', 'x.tsx').length !== 1) problems.push('SRC-00 missed an allow without a reason');
  if (lintText('/*\n  transition: all 1s ease-in;\n*/', 'x.css').length) problems.push('a multi-line comment was linted');
  if (lintText('// taster-allow brand color from the client logo\n<div style={{ color: "#7c3aed" }}>', 'x.tsx').length) problems.push('taster-allow with a reason did not allow the next line');
  return problems;
}

export async function lintCommand(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: 'boolean' },
      baseline: { type: 'string' },
      'write-baseline': { type: 'boolean' },
      selftest: { type: 'boolean' },
    },
  });
  if (values.selftest) {
    const p = selftest();
    for (const m of p) console.log(`FAIL ${m}`);
    console.log(p.length ? `LINT SELFTEST FAIL ${p.length}` : `LINT SELFTEST OK checks=${CHECKS.length + FILE_CHECKS.length}`);
    return p.length ? 1 : 0;
  }
  const { files, findings } = lintPaths(positionals.length ? positionals : ['.']);
  if (values['write-baseline']) {
    if (!values.baseline) throw new Error('--write-baseline needs --baseline <file>');
    writeFileSync(values.baseline, JSON.stringify({ version: 1, note: 'taster lint baseline: counts per file and check may only go down', counts: countsOf(findings) }, null, 2) + '\n');
    console.log(`baseline written: ${findings.length} findings in ${files} files -> ${values.baseline}`);
    return 0;
  }
  let report = findings, fixed = [];
  if (values.baseline) {
    if (!existsSync(values.baseline)) throw new Error(`no baseline at ${values.baseline}; create it with --write-baseline`);
    ({ fresh: report, fixed } = compareBaseline(findings, JSON.parse(readFileSync(values.baseline, 'utf8'))));
  }
  if (values.json) {
    console.log(JSON.stringify({ files, findings: report.map((f) => ({ ...f, ...describe(f.rule) })), baseline: values.baseline ? { total: findings.length, new: report.length, fixed } : undefined }, null, 2));
  } else {
    const byRule = new Map();
    for (const f of report) (byRule.get(f.rule) || byRule.set(f.rule, []).get(f.rule)).push(f);
    for (const [rule, list] of byRule) {
      const d = describe(rule);
      console.log(`\n${rule}  ${d.name}  (${list.length})\n  fix: ${d.fix}`);
      for (const f of list.slice(0, 30)) console.log(`  ${f.file}:${f.line}:${f.column}  ${f.text}`);
      if (list.length > 30) console.log(`  ... ${list.length - 30} more`);
    }
    const tail = values.baseline ? `, ${report.length} new over the baseline${fixed.length ? `, ${fixed.length} fixed (lower the baseline with --write-baseline)` : ''}` : '';
    console.log(`\n${findings.length} findings in ${files} files${tail}`);
  }
  return report.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  lintCommand(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e.message); process.exit(2); });
}
