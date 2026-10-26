import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RULES } from '../diagnose.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`../../rules/fixtures/${name}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 90000 });

test('exit 1 with findings, report.json and one capture per width', { timeout: 90000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'disegno-cli-'));
  try {
    const r = run(fixture('slop.html'), '--out', out);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /AC-01 {2}All-caps label with wide letter spacing {2}\[high\]/);
    assert.ok(r.stdout.includes(`Judge by eye (${RULES.filter((x) => x.detect.level === 'manual').length} manual rules)`));
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    assert.deepEqual(report.widths, [1440, 390]);
    assert.ok(report.rules.every((g) => g.fix && g.findings.every((f) => f.evidence && f.rect)));
    const severities = report.rules.map((g) => g.severity);
    assert.deepEqual(severities, [...severities].sort((a, b) => ['high', 'medium', 'low'].indexOf(a) - ['high', 'medium', 'low'].indexOf(b)));
    assert.ok(existsSync(join(out, 'annotated-1440.png')));
    assert.ok(existsSync(join(out, 'annotated-390.png')));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('exit 0 on the clean fixture at both widths', { timeout: 90000 }, () => {
  const r = run(fixture('clean.html'), '--json');
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.rulesHit, 0);
  assert.deepEqual(report.widths, [1440, 390]);
});

test('--widths picks the viewports', { timeout: 60000 }, () => {
  const r = run(fixture('slop-ko.html'), '--json', '--widths', '1440');
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).widths, [1440]);
});

test('exit 2 on a bad target or a bad width', () => {
  assert.equal(run('no such thing').status, 2);
  assert.equal(run(fixture('clean.html'), '--widths', '12').status, 2);
});

test('--rules lists every rule and --explain prints the fix', () => {
  const list = run('--rules');
  assert.equal(list.status, 0);
  assert.equal(list.stdout.trim().split('\n').length, RULES.length);
  const one = run('--explain', 'ko-01');
  assert.equal(one.status, 0);
  assert.match(one.stdout, /Fix: word-break: keep-all/);
  assert.equal(run('--explain', 'NOPE-01').status, 2);
});
