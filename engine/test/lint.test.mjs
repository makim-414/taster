import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CHECKS, compareBaseline, lintPaths, lintText, selftest } from '../lint.mjs';

const cli = fileURLToPath(new URL('../lint.mjs', import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
const EM = String.fromCharCode(8212);

// A throwaway project: one component with slop, one clean, a Tailwind config that drops the default screens.
function project() {
  const dir = mkdtempSync(join(tmpdir(), 'taster-lint-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'Bad.tsx'), [
    'export function Bad() {',
    '  return (',
    '    <div className="border-l-4 bg-indigo-600 transition-all">',
    `      <span className="rounded-full bg-violet-500/15 text-xs uppercase tracking-widest">Fast ${EM} simple</span>`,
    '      <p className="text-[13px]" style={{ color: "#7c3aed" }}>Hi</p>',
    '    </div>',
    '  )',
    '}',
  ].join('\n'));
  writeFileSync(join(dir, 'src', 'Good.tsx'), [
    'export function Good() {',
    '  // a comment with transition-all and #7c3aed is not code',
    '  return <p className="text-sm text-text-muted transition-colors ease-out">Plain</p>',
    '}',
  ].join('\n'));
  writeFileSync(join(dir, 'tailwind.config.js'), "module.exports = { theme: { screens: { desktop: '1200px' } } }\n");
  mkdirSync(join(dir, 'node_modules', 'x'), { recursive: true });
  writeFileSync(join(dir, 'node_modules', 'x', 'index.js'), 'const c = "#ff0000"\n');
  return dir;
}

test('every check catches its bad lines and passes its good lines', () => {
  assert.deepEqual(selftest(), []);
  assert.ok(CHECKS.length >= 13);
});

test('a slop component is reported with rule ids, a clean one and node_modules are not', () => {
  const dir = project();
  const { files, findings } = lintPaths(['.'], dir);
  assert.equal(files, 3);
  const bad = new Set(findings.filter((f) => f.file === 'src/Bad.tsx').map((f) => f.rule));
  for (const id of ['AC-10', 'SRC-03', 'MOT-02', 'AC-04', 'AC-01', 'AC-02', 'SRC-02', 'SRC-01']) assert.ok(bad.has(id), `missing ${id}`);
  // A thick left bar is the accent bar rule, not the tinted notice band.
  assert.ok(!bad.has('AC-06'));
  assert.equal(findings.filter((f) => f.file === 'src/Good.tsx').length, 0);
  assert.ok(findings.some((f) => f.file === 'tailwind.config.js' && f.rule === 'SRC-04'));
  assert.ok(!findings.some((f) => f.file.startsWith('node_modules')));
});

test('links are not followed while walking, so a link loop ends', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'taster-lint-link-'));
  mkdirSync(join(dir, 'a'));
  writeFileSync(join(dir, 'a', 'Ok.tsx'), '<p className="text-sm text-text-muted">Plain</p>\n');
  symlinkSync('..', join(dir, 'a', 'loop'));
  const outside = mkdtempSync(join(tmpdir(), 'taster-lint-outside-'));
  writeFileSync(join(outside, 'Bad.tsx'), '<p className="bg-indigo-600">x</p>\n');
  symlinkSync(join(outside, 'Bad.tsx'), join(dir, 'a', 'Bad.tsx'));
  symlinkSync('a', join(dir, 'linked'));
  const r = run(['.'], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 findings in 1 files/);
  // A link named on the command line is still read.
  assert.equal(lintPaths(['linked'], dir).files, 1);
});

test('taster-allow needs a reason', () => {
  assert.equal(lintText('<div className="bg-indigo-600"> {/* taster-allow */}', 'a.tsx')[0].rule, 'SRC-00');
  assert.equal(lintText('{/* taster-allow the partner logo color, fixed by contract */}\n<div className="bg-indigo-600">', 'a.tsx').length, 0);
});

test('the baseline only lets counts go down', () => {
  const dir = project();
  assert.equal(run(['src', '--baseline', 'b.json', '--write-baseline'], dir).status, 0);
  assert.equal(run(['src', '--baseline', 'b.json'], dir).status, 0, 'unchanged code passes its own baseline');
  writeFileSync(join(dir, 'src', 'Good.tsx'), '<p className="bg-rose-500">new</p>\n');
  const after = run(['src', '--baseline', 'b.json'], dir);
  assert.equal(after.status, 1);
  assert.match(after.stdout, /1 new over the baseline/);
  const { fixed } = compareBaseline([], { counts: { 'src/Bad.tsx::AC-04': 1 } });
  assert.deepEqual(fixed, ['src/Bad.tsx::AC-04']);
});

test('exit codes: 1 with findings, 0 clean, and the selftest flag', () => {
  const dir = project();
  assert.equal(run(['src/Bad.tsx'], dir).status, 1);
  assert.equal(run(['src/Good.tsx'], dir).status, 0);
  const st = run(['--selftest'], dir);
  assert.equal(st.status, 0);
  assert.match(st.stdout, /LINT SELFTEST OK/);
});
