// The package and plugin metadata: descriptions written from the repository's counts, and the checks validate.mjs
// runs on what we tell people (counts in prose, versions, dependencies, the files npm would publish, pattern links,
// relative links and pictures in Markdown, credits). build-docs.mjs writes DESCRIPTIONS; validate.mjs gathers the
// files and calls the checks. No dependencies.
import path from 'node:path';

// The counts every description and README states. measured leaves out the manual rules, which are judged by eye.
export function metaCounts({ rules, patterns, components }) {
  return {
    rules: rules.length,
    measured: rules.filter((r) => r.detect.level !== 'manual').length,
    patterns: patterns.length,
    components: components.length,
  };
}

// Where each description lives (file and key path) and what it says. max: the Chrome Web Store limit for an
// extension's description.
export const DESCRIPTIONS = [
  {
    file: 'package.json',
    at: ['description'],
    text: (c) =>
      `Find the AI generated look in a frontend and fix it: ${c.rules} rules, ${c.measured} measured in a real browser, ${c.patterns} patterns and ${c.components} components to swap in, for agents (MCP, ACP), editors, CI and the browser.`,
  },
  {
    file: 'apps/extension/manifest.json',
    at: ['description'],
    max: 132,
    text: (c) => `Outline the habits that make a page look AI generated: ${c.rules} rules, ${c.measured} measured on the page you are viewing.`,
  },
  {
    file: '.github/acp-registry/taster/agent.json',
    at: ['description'],
    text: (c) =>
      `Checks a page for the AI generated look (${c.rules} rules, ${c.measured} measured in a real browser) and answers with findings, fixes and patterns. No model inside.`,
  },
  {
    file: '.claude-plugin/marketplace.json',
    at: ['plugins', 0, 'description'],
    text: (c) =>
      `Diagnose, swap and build. ${c.rules} rules, ${c.measured} measured in a real browser, a taxonomy of ${c.patterns} patterns sorted by use and surface, and a registry of ${c.components} components built on tokens.`,
  },
  {
    file: '.codex-plugin/plugin.json',
    at: ['interface', 'longDescription'],
    text: (c) =>
      `${c.rules} rules, ${c.measured} measured in a real browser, a taxonomy of ${c.patterns} patterns organized by what the user is trying to do, and a registry of ${c.components} components built on tokens that you copy into your app.`,
  },
];

export const getAt = (obj, at) => at.reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setAt(obj, at, value) {
  const parent = getAt(obj, at.slice(0, -1));
  parent[at[at.length - 1]] = value;
}

// The files that state counts in prose. Only these: CHANGELOG entries, examples and pattern bodies keep the numbers
// of their own day.
export const COUNTED_FILES = [
  ...DESCRIPTIONS.map((d) => d.file),
  'action.yml',
  'README.md',
  'README.ko.md',
  'packages/registry/README.md',
];
// How the READMEs and descriptions say each count: "88 rules, 85 measured in a real browser", "144 components", and
// in Korean "규칙 88개, 그중 85개는 (`data/rules/detect.js` 가) 실제 브라우저에서", "패턴 122개", "부품 144개".
const PHRASES = [
  [/\b(\d+) rules\b/g, 'rules'],
  [/\b(\d+) measured\b/g, 'measured'],
  [/\b(\d+) patterns\b/g, 'patterns'],
  [/\b(\d+) components\b/g, 'components'],
  [/규칙 (\d+)개/g, 'rules'],
  [/그중 (\d+)개는 (?:`[^`]+` 가 )?실제 브라우저/g, 'measured'],
  [/패턴 (\d+)개/g, 'patterns'],
  [/(?:부품|컴포넌트) (\d+)개/g, 'components'],
];
// Each README says how many rules there are and how many of them are measured, in these words.
const REQUIRED = {
  'README.md': ['rules', 'measured'],
  'README.ko.md': ['rules', 'measured'],
};

export function countErrors(file, text, counts) {
  const errors = [];
  const seen = new Set();
  const lineOf = (i) => text.slice(0, i).split('\n').length;
  for (const [re, key] of PHRASES) {
    for (const m of text.matchAll(re)) {
      seen.add(key);
      if (Number(m[1]) !== counts[key]) errors.push(`${file}:${lineOf(m.index)} says "${m[0]}", there are ${counts[key]} (${key})`);
    }
  }
  // "80 rules measured" counts the rules judged by eye as measured.
  for (const m of text.matchAll(/\b\d+ rules measured\b/g)) {
    errors.push(`${file}:${lineOf(m.index)} says "${m[0]}"; write "${counts.rules} rules, ${counts.measured} measured", the manual rules are judged by eye`);
  }
  for (const key of REQUIRED[file] || []) {
    if (!seen.has(key)) errors.push(`${file} no longer states the ${key} count in the words validate reads (see PHRASES in scripts/check-meta.mjs)`);
  }
  return errors;
}

// Every file that carries the release version agrees with package.json, and the engine reports the version it reads
// from its package.json instead of a copy in the source.
export function versionErrors(json, sources) {
  const errors = [];
  const version = json['package.json'].version;
  const stated = [
    ['packages/engine/package.json', ['version']],
    ['apps/extension/manifest.json', ['version']],
    ['.github/acp-registry/taster/agent.json', ['version']],
    ['.claude-plugin/marketplace.json', ['plugins', 0, 'version']],
    ['.codex-plugin/plugin.json', ['version']],
  ];
  for (const [file, at] of stated) {
    const v = getAt(json[file], at);
    if (v !== version) errors.push(`${file} ${at.join('.')} is ${v}, package.json is ${version}`);
  }
  const npx = getAt(json['.github/acp-registry/taster/agent.json'], ['distribution', 'npx', 'package']);
  if (npx !== `${json['package.json'].name}@${version}`) errors.push(`agent.json distribution.npx.package is ${npx}, expected ${json['package.json'].name}@${version}`);
  for (const [file, text] of Object.entries(sources)) {
    if (!text.includes("new URL('./package.json', import.meta.url)")) errors.push(`${file} does not read its version from package.json`);
    if (text.includes(`'${version}'`) || text.includes(`"${version}"`)) errors.push(`${file} writes the version ${version} by hand; read it from package.json`);
  }
  return errors;
}

// The published package runs packages/engine/ through its taster.mjs, so the root and the engine declare the same
// dependencies and the same Node versions, the ones CI runs (.nvmrc). The engine's lockfile matches its package.json,
// or the first-run npm install in packages/engine/start.mjs rewrites it in the user's clone.
export function packageErrors(root, engine, nvmrc, lock) {
  const errors = [];
  const same = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort());
  if (!same(root.dependencies, engine.dependencies)) errors.push('package.json and packages/engine/package.json list different dependencies');
  const want = `>=${nvmrc.trim()}`;
  for (const [file, p] of [['package.json', root], ['packages/engine/package.json', engine]]) {
    if (p.engines?.node !== want) errors.push(`${file} engines.node is ${p.engines?.node}, expected ${want} (from .nvmrc, the Node CI runs)`);
  }
  const locked = lock.packages?.[''] || {};
  for (const key of ['version', 'dependencies', 'bin', 'engines']) {
    const a = engine[key], b = locked[key];
    if (typeof a === 'object' ? !same(a, b) : a !== b) errors.push(`packages/engine/package-lock.json ${key} differs from packages/engine/package.json (run npm --prefix packages/engine install --package-lock-only)`);
  }
  return errors;
}

// What npm would publish: no installs, apps (the site and the extension), CI or tests, and the license and notices
// that must travel with the code.
const NOT_PUBLISHED = [/(^|\/)node_modules\//, /^apps\//, /^\.github\//, /(^|\/)(test|tests|__tests__|fixtures)\//, /\.test\.[cm]?[jt]sx?$/];
const PUBLISHED = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'packages/registry/THIRD_PARTY_NOTICES.md', 'packages/registry/stage/THIRD_PARTY_LICENSES.txt', 'README.md'];
export function packErrors(files, pkg) {
  const errors = [];
  for (const f of files) if (NOT_PUBLISHED.some((re) => re.test(f))) errors.push(`npm pack would publish ${f}`);
  const need = [...PUBLISHED, ...Object.values(pkg.bin || {}).map((b) => b.replace(/^\.\//, ''))];
  for (const f of need) if (!files.includes(f)) errors.push(`npm pack leaves out ${f}`);
  return errors;
}

// A package that is not on npm yet cannot be run with npx, so no page may tell people to.
export function npxErrors(pkg, docs) {
  if (!pkg.private) return [];
  return Object.entries(docs)
    .filter(([, text]) => text.includes(`npx ${pkg.name}`))
    .map(([file]) => `${file} says npx ${pkg.name}, but package.json is private (not published); use the node packages/engine/cli.mjs line`);
}

// Links to patterns/<id>.md anywhere (data/patterns/<id>.md included), and pattern to pattern links inside
// data/patterns/, name a pattern that exists.
export function patternLinkErrors(file, text, ids) {
  const errors = [];
  const bad = (id) => id !== 'README' && !ids.has(id);
  for (const m of text.matchAll(/patterns\/([A-Za-z0-9_-]+)\.md\b/g)) if (bad(m[1])) errors.push(`${file} links patterns/${m[1]}.md, which is not in data/patterns/INDEX.json`);
  if (/(^|\/)patterns\/[^/]+$/.test(file)) {
    for (const m of text.matchAll(/\]\(([A-Za-z0-9_-]+)\.md(?:#[^)]*)?\)/g)) if (bad(m[1])) errors.push(`${file} links ${m[1]}.md, which is not in data/patterns/INDEX.json`);
  }
  return errors;
}

// Relative links and pictures in a Markdown file point at a file or folder that exists, so moving a file cannot leave
// a README with a broken picture. Read: [text](path), ![alt](path), [label]: path, and the src, srcset and href of
// <img>, <source> and <a>. A path is resolved from the Markdown file's folder (a leading / from the repository root),
// without its #anchor and ?query. Not read: addresses with a scheme (https:, mailto:), links to an anchor in the same
// file, and anything in a code block, in inline code or in an HTML comment, which GitHub does not show as a link.
// Whether an anchor exists is not checked. exists(rel) says whether a path relative to the repository root is there.
export function markdownLinkErrors(file, text, exists) {
  const errors = [];
  const prose = markdownProse(text);
  const lineOf = (i) => prose.slice(0, i).split('\n').length;
  for (const { at, target } of markdownTargets(prose)) {
    const rel = repoPath(file, target);
    if (rel === null) continue;
    if (rel === '..' || rel.startsWith('../')) errors.push(`${file}:${lineOf(at)} ${target} points outside the repository`);
    else if (!exists(rel)) errors.push(`${file}:${lineOf(at)} ${target} (no file or folder at ${rel})`);
  }
  return errors;
}

// The text with code blocks, inline code and HTML comments blanked to spaces. Newlines stay, so an offset in the
// result is on the same line as in the file.
const blank = (s) => s.replace(/[^\n]/g, ' ');
function markdownProse(text) {
  let fence = null;
  const lines = text.split('\n').map((line) => {
    const t = line.trim();
    if (fence) {
      if (t.length >= fence.length && [...t].every((c) => c === fence[0])) fence = null;
      return blank(line);
    }
    const open = t.match(/^(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
      fence = open[1];
      return blank(line);
    }
    return line;
  });
  return lines
    .join('\n')
    .replace(/(?<!`)(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\1(?!`)/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank);
}

// Every link target in the prose, as written, with its offset.
function markdownTargets(prose) {
  const found = [];
  for (const m of prose.matchAll(/\]\(\s*(<[^<>\n]*>|(?:[^\s()]|\([^\s()]*\))*)(?:\s+(?:"[^"]*"|'[^']*'|\([^()]*\)))?\s*\)/g)) {
    found.push({ at: m.index + m[0].indexOf(m[1]), target: m[1] });
  }
  for (const m of prose.matchAll(/^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*(<[^<>\n]*>|\S+)/gm)) {
    found.push({ at: m.index + m[0].length - m[1].length, target: m[1] });
  }
  for (const tag of prose.matchAll(/<(?:img|source|a)\b[^>]*>/gi)) {
    for (const a of tag[0].matchAll(/\s(src|srcset|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const value = a[2] ?? a[3];
      const at = tag.index + a.index + a[0].indexOf(value);
      const targets = a[1].toLowerCase() === 'srcset' ? value.split(',').map((c) => c.trim().split(/\s+/)[0]) : [value];
      for (const target of targets) if (target) found.push({ at, target });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

// A link target as a path relative to the repository root, or null when it is not a path in the repository.
function repoPath(file, target) {
  let t = target.trim();
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1).trim();
  if (!t || t.startsWith('#') || t.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  t = t.replace(/[?#].*$/, '');
  if (!t) return null;
  try {
    t = decodeURI(t);
  } catch {
    // a stray % stays as written
  }
  const rel = t.startsWith('/') ? path.posix.normalize(t.slice(1) || '.') : path.posix.join(path.posix.dirname(file), t);
  return rel.replace(/(.)\/+$/, '$1');
}

// A component built after a 21st.dev listing credits it in registry.json, and one of its patterns keeps the same link
// in its inspiration.
export function creditErrors(components, patternsById) {
  const errors = [];
  for (const c of components) {
    for (const url of (c.credit || '').match(/https:\/\/21st\.dev\/[^\s,;()]+/g) || []) {
      const u = url.replace(/\.$/, '');
      if (!(c.patterns || []).some((p) => (patternsById[p]?.inspiration || []).includes(u))) {
        errors.push(`registry ${c.id} credits ${u}, but none of its patterns (${(c.patterns || []).join(', ') || 'none'}) has it in inspiration`);
      }
    }
  }
  return errors;
}

// Codex reads the root .mcp.json when its manifest names no MCP servers, and does not expand the ${CLAUDE_PLUGIN_ROOT}
// that .mcp.json uses for Claude Code. So .codex-plugin/plugin.json names the server itself: cwd "." is the plugin
// folder in Codex, and each ./ argument is a file in this repository.
export function codexMcpErrors(manifest, exists) {
  const servers = manifest.mcpServers;
  if (!servers || typeof servers !== 'object') return ['.codex-plugin/plugin.json needs mcpServers, or Codex starts the server in .mcp.json without its plugin root'];
  const errors = [];
  for (const [name, s] of Object.entries(servers)) {
    if (s.cwd !== '.') errors.push(`.codex-plugin/plugin.json mcpServers.${name} needs cwd "." (the plugin folder)`);
    for (const a of [s.command, ...(s.args || [])]) {
      if (typeof a === 'string' && a.includes('${')) errors.push(`.codex-plugin/plugin.json mcpServers.${name} uses ${a}; Codex does not expand it`);
      else if (typeof a === 'string' && a.startsWith('./') && !exists(a)) errors.push(`.codex-plugin/plugin.json mcpServers.${name} runs ${a}, which does not exist`);
    }
  }
  return errors;
}
