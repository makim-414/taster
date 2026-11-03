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
  metaCounts,
  npxErrors,
  packErrors,
  packageErrors,
  patternLinkErrors,
  versionErrors,
} from '../../scripts/check-meta.mjs';
import { toSarif } from '../sarif.mjs';

// scripts/check-meta.mjs holds what validate.mjs checks on the package and plugin metadata. These cases feed each
// check the repository as it is, then the mistakes it is there to catch.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const RULES = json('rules/rules.json').rules;
const COMPONENTS = json('registry/registry.json').components;
const counts = metaCounts({ rules: RULES, patterns: json('patterns/INDEX.json'), components: COMPONENTS });
const files = () => Object.fromEntries([...DESCRIPTIONS.map((d) => d.file), 'engine/package.json'].map((f) => [f, json(f)]));
const SOURCES = ['engine/server.mjs', 'engine/acp.mjs', 'engine/sarif.mjs'];

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
  assert.equal(toSarif([]).runs[0].tool.driver.version, json('engine/package.json').version);

  const handWritten = { 'engine/sarif.mjs': read('engine/sarif.mjs').replace(/version: VERSION/, `version: '${json('package.json').version}'`) };
  assert.ok(versionErrors(files(), handWritten).some((e) => /engine\/sarif.mjs writes the version .* by hand/.test(e)));
  const drift = files();
  drift['extension/manifest.json'].version = '0.0.9';
  assert.deepEqual(versionErrors(drift, {}), [`extension/manifest.json version is 0.0.9, package.json is ${drift['package.json'].version}`]);
});

test('root and engine packages agree on dependencies, Node and the lockfile', () => {
  const f = files();
  const nvmrc = read('.nvmrc');
  const lock = json('engine/package-lock.json');
  assert.deepEqual(packageErrors(f['package.json'], f['engine/package.json'], nvmrc, lock), []);

  const root = structuredClone(f['package.json']);
  root.dependencies.zod = '3.0.0';
  root.engines.node = '>=20';
  assert.deepEqual(packageErrors(root, f['engine/package.json'], nvmrc, lock), [
    'package.json and engine/package.json list different dependencies',
    `package.json engines.node is >=20, expected >=${nvmrc.trim()} (from .nvmrc, the Node CI runs)`,
  ]);
  // The lockfile from before taster-acp was listed: npm install rewrote it in every clone.
  const stale = structuredClone(lock);
  delete stale.packages[''].bin['taster-acp'];
  assert.deepEqual(packageErrors(f['package.json'], f['engine/package.json'], nvmrc, stale), [
    'engine/package-lock.json bin differs from engine/package.json (run npm --prefix engine install --package-lock-only)',
  ]);
});

test('npm pack publishes the code, license and notices, and no tests, site or CI', () => {
  const pkg = json('package.json');
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  assert.equal(pack.status, 0, pack.stderr);
  const packed = JSON.parse(pack.stdout)[0].files.map((x) => x.path);
  assert.deepEqual(packErrors(packed, pkg), []);

  const bad = [...packed.filter((p) => p !== 'THIRD_PARTY_NOTICES.md'), 'taxonomy/axes.test.mjs', 'taxonomy/fixtures/parts.json', 'web/package.json', 'engine/node_modules/zod/package.json'];
  assert.deepEqual(packErrors(bad, pkg), [
    'npm pack would publish taxonomy/axes.test.mjs',
    'npm pack would publish taxonomy/fixtures/parts.json',
    'npm pack would publish web/package.json',
    'npm pack would publish engine/node_modules/zod/package.json',
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
  assert.deepEqual(patternLinkErrors('registry/src/blocks/glass-folder.tsx', read('registry/src/blocks/glass-folder.tsx'), ids), []);
  // The link glass-folder.tsx had, built here so the repository's own link check does not read it from this file.
  const gone = ['patterns', 'quiet-section-background.md'].join('/');
  assert.deepEqual(patternLinkErrors('a.tsx', `// see ${gone} and patterns/README.md`, ids), [
    `a.tsx links ${gone}, which is not in patterns/INDEX.json`,
  ]);
  assert.equal(patternLinkErrors('patterns/hairline-card.md', 'See [x](no-such-pattern.md) and [y](hairline-card.md#do).', ids).length, 1);
  assert.deepEqual(patternLinkErrors('docs/a.md', 'See [x](no-such-page.md).', ids), [], 'relative links are read only inside patterns/');
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
    '.codex-plugin/plugin.json mcpServers.taster uses ${CLAUDE_PLUGIN_ROOT}/engine/start.mjs; Codex does not expand it',
  ]);
  assert.equal(codexMcpErrors({ mcpServers: { taster: { command: 'node', args: ['./engine/nope.mjs'], cwd: '.' } } }, exists).length, 1);
});
