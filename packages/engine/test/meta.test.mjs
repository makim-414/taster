import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COUNTED_FILES,
  DESCRIPTIONS,
  codexMcpErrors,
  countErrors,
  creditErrors,
  getAt,
  markdownLinkErrors,
  metaCounts,
  npxErrors,
  packErrors,
  packageErrors,
  patternLinkErrors,
  versionErrors,
} from '../../../scripts/check-meta.mjs';
import { toSarif } from '../sarif.mjs';

// scripts/check-meta.mjs holds what validate.mjs checks on the package and plugin metadata. These cases feed each
// check the repository as it is, then the mistakes it is there to catch.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const RULES = json('rules/rules.json').rules;
const COMPONENTS = json('packages/registry/registry.json').components;
const counts = metaCounts({ rules: RULES, patterns: json('patterns/INDEX.json'), components: COMPONENTS });
const files = () => Object.fromEntries([...DESCRIPTIONS.map((d) => d.file), 'packages/engine/package.json'].map((f) => [f, json(f)]));
const SOURCES = ['packages/engine/server.mjs', 'packages/engine/acp.mjs', 'packages/engine/sarif.mjs'];

test('the counts leave the manual rules out of measured', () => {
  assert.equal(counts.rules, RULES.length);
  assert.equal(counts.measured, RULES.length - RULES.filter((r) => r.detect.level === 'manual').length);
  assert.ok(counts.measured < counts.rules, 'some rules are judged by eye');
});

test('each description is what build-docs writes, fits its limit, and reads back with the right counts', () => {
  const now = files();
  for (const d of DESCRIPTIONS) {
    const text = d.text(counts);
    assert.equal(getAt(now[d.file], d.at), text, `${d.file} is stale (run node scripts/build-docs.mjs)`);
    if (d.max) assert.ok(text.length <= d.max, `${d.file} has ${text.length} characters`);
    assert.deepEqual(countErrors(d.file, text, counts), []);
    assert.match(text, new RegExp(`\\b${counts.rules} rules, ${counts.measured} measured\\b`));
  }
});

test('every file that states counts in prose states them right', () => {
  for (const f of COUNTED_FILES) assert.deepEqual(countErrors(f, read(f), counts), [], f);
});

test('a stale count and "rules measured" fail, with the line they are on', () => {
  const old = 'x\n"description": "80 rules measured in a real browser, 64 components"';
  const errors = countErrors('package.json', old, counts);
  assert.ok(errors.includes(`package.json:2 says "80 rules", there are ${counts.rules} (rules)`), errors.join('\n'));
  assert.ok(errors.some((e) => /says "80 rules measured"; write "\d+ rules, \d+ measured"/.test(e)), errors.join('\n'));
  assert.ok(errors.includes(`package.json:2 says "64 components", there are ${counts.components} (components)`), errors.join('\n'));
  assert.deepEqual(countErrors('package.json', `${counts.rules} rules, ${counts.measured + 1} measured`, counts), [
    `package.json:1 says "${counts.measured + 1} measured", there are ${counts.measured} (measured)`,
  ]);
});

test('the Korean README is read in its own words, and other numbers are left alone', () => {
  const ko = (m) => `규칙 ${counts.rules}개, 그중 ${m}개는 \`rules/detect.js\` 가 실제 브라우저에서 잽니다. 그중 21개는 직접 본 것만이 근거입니다.`;
  assert.deepEqual(countErrors('README.ko.md', ko(counts.measured), counts), []);
  assert.equal(countErrors('README.ko.md', ko(counts.measured - 1), counts).length, 1);
  assert.equal(countErrors('README.ko.md', `패턴 1개, 부품 2개, 규칙 ${counts.rules}개, 그중 ${counts.measured}개는 실제 브라우저에서 재고`, counts).length, 2);
  // How many rules the rebuild example breaks is checked by check-rebuild-example.mjs, not here.
  const en = `${counts.rules} rules, ${counts.measured} measured in a real browser. The page breaks 18 of the rules.`;
  assert.deepEqual(countErrors('README.md', en, counts), []);
});

test('a README that stops stating the counts fails; action.yml without numbers passes', () => {
  assert.equal(countErrors('README.md', 'Rules, measured in a real browser.', counts).length, 2);
  assert.deepEqual(countErrors('action.yml', read('action.yml'), counts), []);
});

test('versions agree and the engine reads its version from package.json', () => {
  const sources = Object.fromEntries(SOURCES.map((f) => [f, read(f)]));
  assert.deepEqual(versionErrors(files(), sources), []);
  assert.equal(toSarif([]).runs[0].tool.driver.version, json('packages/engine/package.json').version);

  const handWritten = { 'packages/engine/sarif.mjs': read('packages/engine/sarif.mjs').replace(/version: VERSION/, `version: '${json('package.json').version}'`) };
  assert.ok(versionErrors(files(), handWritten).some((e) => /packages\/engine\/sarif.mjs writes the version .* by hand/.test(e)));
  const drift = files();
  drift['apps/extension/manifest.json'].version = '0.0.9';
  assert.deepEqual(versionErrors(drift, {}), [`apps/extension/manifest.json version is 0.0.9, package.json is ${drift['package.json'].version}`]);
});

test('root and engine packages agree on dependencies, Node and the lockfile', () => {
  const f = files();
  const nvmrc = read('.nvmrc');
  const lock = json('packages/engine/package-lock.json');
  assert.deepEqual(packageErrors(f['package.json'], f['packages/engine/package.json'], nvmrc, lock), []);

  const root = structuredClone(f['package.json']);
  root.dependencies.zod = '3.0.0';
  root.engines.node = '>=20';
  assert.deepEqual(packageErrors(root, f['packages/engine/package.json'], nvmrc, lock), [
    'package.json and packages/engine/package.json list different dependencies',
    `package.json engines.node is >=20, expected >=${nvmrc.trim()} (from .nvmrc, the Node CI runs)`,
  ]);
  // The lockfile from before taster-acp was listed: npm install rewrote it in every clone.
  const stale = structuredClone(lock);
  delete stale.packages[''].bin['taster-acp'];
  assert.deepEqual(packageErrors(f['package.json'], f['packages/engine/package.json'], nvmrc, stale), [
    'packages/engine/package-lock.json bin differs from packages/engine/package.json (run npm --prefix packages/engine install --package-lock-only)',
  ]);
});

test('npm pack publishes the code, license and notices, and no tests, apps or CI', () => {
  const pkg = json('package.json');
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  assert.equal(pack.status, 0, pack.stderr);
  const packed = JSON.parse(pack.stdout)[0].files.map((x) => x.path);
  assert.deepEqual(packErrors(packed, pkg), []);

  const bad = [...packed.filter((p) => p !== 'THIRD_PARTY_NOTICES.md'), 'taxonomy/axes.test.mjs', 'taxonomy/fixtures/parts.json', 'apps/web/package.json', 'apps/extension/manifest.json', 'packages/engine/node_modules/zod/package.json'];
  assert.deepEqual(packErrors(bad, pkg), [
    'npm pack would publish taxonomy/axes.test.mjs',
    'npm pack would publish taxonomy/fixtures/parts.json',
    'npm pack would publish apps/web/package.json',
    'npm pack would publish apps/extension/manifest.json',
    'npm pack would publish packages/engine/node_modules/zod/package.json',
    'npm pack leaves out THIRD_PARTY_NOTICES.md',
  ]);
});

test('an npx line fails only while the package is private', () => {
  const pkg = json('package.json');
  const docs = { 'README.md': `npx ${pkg.name} lint src` };
  assert.equal(npxErrors({ ...pkg, private: true }, docs).length, 1);
  assert.deepEqual(npxErrors({ ...pkg, private: false }, docs), []);
  assert.deepEqual(npxErrors(pkg, { 'README.md': read('README.md'), 'README.ko.md': read('README.ko.md') }), []);
});

test('links to patterns name patterns that exist', () => {
  const ids = new Set(json('patterns/INDEX.json').map((p) => p.id));
  assert.deepEqual(patternLinkErrors('packages/registry/src/blocks/glass-folder.tsx', read('packages/registry/src/blocks/glass-folder.tsx'), ids), []);
  // The link glass-folder.tsx had, built here so the repository's own link check does not read it from this file.
  const gone = ['patterns', 'quiet-section-background.md'].join('/');
  assert.deepEqual(patternLinkErrors('a.tsx', `// see ${gone} and patterns/README.md`, ids), [
    `a.tsx links ${gone}, which is not in patterns/INDEX.json`,
  ]);
  assert.equal(patternLinkErrors('patterns/hairline-card.md', 'See [x](no-such-pattern.md) and [y](hairline-card.md#do).', ids).length, 1);
  assert.deepEqual(patternLinkErrors('docs/a.md', 'See [x](no-such-page.md).', ids), [], 'relative links are read only inside patterns/');
});

test('relative links and pictures in every Markdown file git tracks point at files that exist', () => {
  const ls = spawnSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(ls.status, 0, ls.stderr);
  const tracked = ls.stdout.split('\0').filter((f) => f && !/(^|\/)node_modules\//.test(f) && existsSync(join(ROOT, f)));
  assert.ok(tracked.includes('README.md') && tracked.includes('skills/taster/SKILL.md'), 'git ls-files lists the Markdown files');
  for (const f of tracked) assert.deepEqual(markdownLinkErrors(f, read(f), (rel) => existsSync(join(ROOT, rel))), [], f);
});

test('a missing link or picture fails with its line; addresses, anchors and code are not read', () => {
  const have = new Set(['.', 'docs', 'docs/board.jpg', 'docs/guide.md', 'README.md', 'LICENSE']);
  const page = [
    '# Title',
    '![Board](board.jpg) and [guide](guide.md#setup "Setup")',
    '![Gone](gallery.jpg?raw=1)',
    '[Back](../README.md) [License](/LICENSE) [up](..) [folder](./) [![badge](board.jpg)](<guide.md>)',
    '<picture><source srcset="dark.jpg 1x, board.jpg 2x"><img alt="" src="light.jpg"></picture>',
    '[top](#title) [site](https://example.com/x.png) [mail](mailto:hello@example.com) [file](board.jpg#top)',
    'Inline `[x](nope.md)` and ``![y](nope.png)`` are code.',
    '```md',
    '![in a block](nope.png)',
    '```',
    '<!-- [hidden](nope.md) -->',
    '[label]: missing.md',
    '[^1]: A footnote, not a link.',
    '[out](../../outside.md)',
  ].join('\n');
  assert.deepEqual(markdownLinkErrors('docs/page.md', page, (rel) => have.has(rel)), [
    'docs/page.md:3 gallery.jpg?raw=1 (no file or folder at docs/gallery.jpg)',
    'docs/page.md:5 dark.jpg (no file or folder at docs/dark.jpg)',
    'docs/page.md:5 light.jpg (no file or folder at docs/light.jpg)',
    'docs/page.md:12 missing.md (no file or folder at docs/missing.md)',
    'docs/page.md:14 ../../outside.md points outside the repository',
  ]);
  // A fence that is never closed runs to the end of the file, as GitHub shows it.
  assert.deepEqual(markdownLinkErrors('README.md', '~~~\n![x](nope.png)\n', () => false), []);
  const spaced = 'See [x](<a b.md>) and [y](a%20b.md).';
  assert.deepEqual(markdownLinkErrors('README.md', spaced, (rel) => rel === 'a b.md'), []);
  assert.equal(markdownLinkErrors('README.md', spaced, () => false).length, 2);
});

test('a 21st.dev credit keeps its link in one of the component\'s patterns', () => {
  const byId = { 'split-title-faq': { inspiration: ['https://21st.dev/@a/components/b'] }, other: { inspiration: [] } };
  const c = (credit, patterns) => [{ id: 'blocks/x', credit, patterns }];
  assert.deepEqual(creditErrors(c('Layout after B by A, https://21st.dev/@a/components/b (no code taken)', ['split-title-faq']), byId), []);
  assert.deepEqual(creditErrors(c('B by A, https://21st.dev/@a/components/b.', ['other']), byId), [
    'registry blocks/x credits https://21st.dev/@a/components/b, but none of its patterns (other) has it in inspiration',
  ]);
  assert.deepEqual(creditErrors(c('Idea from a 21st.dev list whose source could not be traced', []), byId), []);
});

test('the Codex plugin starts the MCP server from its own folder, without Claude Code variables', () => {
  const exists = (rel) => existsSync(join(ROOT, rel));
  const cx = json('.codex-plugin/plugin.json');
  assert.deepEqual(codexMcpErrors(cx, exists), []);
  assert.equal(codexMcpErrors({ ...cx, mcpServers: undefined }, exists).length, 1);
  // The Claude Code entry from .mcp.json, as Codex would read it.
  const claude = json('.mcp.json').mcpServers;
  assert.deepEqual(codexMcpErrors({ mcpServers: claude }, exists), [
    '.codex-plugin/plugin.json mcpServers.taster needs cwd "." (the plugin folder)',
    '.codex-plugin/plugin.json mcpServers.taster uses ${CLAUDE_PLUGIN_ROOT}/packages/engine/start.mjs; Codex does not expand it',
  ]);
  assert.equal(codexMcpErrors({ mcpServers: { taster: { command: 'node', args: ['./packages/engine/nope.mjs'], cwd: '.' } } }, exists).length, 1);
});
