import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RULES, toUrl } from '../diagnose.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`../../rules/fixtures/${name}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 90000 });

test('exit 1 with findings, report.json and one capture per width', { timeout: 90000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-cli-'));
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

test('targets: local pages only, no guessing a missing file into a web address, localhost as http', () => {
  const dir = mkdtempSync(join(tmpdir(), 'taster-cli-files-'));
  const root = process.env.TASTER_ROOT;
  try {
    writeFileSync(join(dir, 'secret.txt'), 'SECRET-CANARY');
    writeFileSync(join(dir, 'page.html'), '<!doctype html><title>page</title>');
    symlinkSync(join(dir, 'secret.txt'), join(dir, 'looks-like-a-page.html'));
    assert.throws(() => toUrl('missing-page.html'), /^Error: File not found: .*missing-page\.html$/);
    assert.throws(() => toUrl('report.md'), /File not found/, 'report.md is also a domain, so it must not be guessed');
    assert.throws(() => toUrl('docs/notes.txt'), /File not found/);
    assert.equal(toUrl('localhost:3000'), 'http://localhost:3000');
    assert.equal(toUrl('127.0.0.1:8080/pricing'), 'http://127.0.0.1:8080/pricing');
    assert.equal(toUrl('example.com'), 'https://example.com');
    assert.equal(toUrl('example.com/index.html'), 'https://example.com/index.html');
    assert.equal(toUrl(join(dir, 'page.html')), pathToFileURL(join(dir, 'page.html')).href);
    assert.throws(() => toUrl(join(dir, 'secret.txt')), /Only local \.html, \.htm, \.xhtml and \.svg files are opened/);
    assert.throws(() => toUrl(pathToFileURL(join(dir, 'secret.txt')).href), /Only local/);
    assert.throws(() => toUrl(join(dir, 'looks-like-a-page.html')), /Only local/, 'a link is judged by the file it points at');
    assert.throws(() => toUrl(dir), /Only local/, 'a folder is not a page');
    mkdirSync(join(dir, 'inside'));
    writeFileSync(join(dir, 'inside', 'a.html'), '<!doctype html><title>a</title>');
    process.env.TASTER_ROOT = join(dir, 'inside');
    assert.equal(toUrl(join(dir, 'inside', 'a.html')), pathToFileURL(join(dir, 'inside', 'a.html')).href);
    assert.throws(() => toUrl(join(dir, 'page.html')), /Outside TASTER_ROOT/);
    delete process.env.TASTER_ROOT;
    const read = run(join(dir, 'secret.txt'), '--extract');
    assert.equal(read.status, 2);
    assert.ok(!read.stdout.includes('SECRET-CANARY'));
  } finally {
    if (root === undefined) delete process.env.TASTER_ROOT;
    else process.env.TASTER_ROOT = root;
    rmSync(dir, { recursive: true, force: true });
  }
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

test('--system writes the design system and --tune moves a weight in place', { timeout: 90000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-cli-system-'));
  const sys = (name) => fileURLToPath(new URL(`./fixtures/system/${name}.html`, import.meta.url));
  try {
    const r = run('--system', sys('sharp-and-dense'), '--ref', sys('round-and-airy'), '--axis', 'motion=0.25', '--out', out);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /motion +0\.25 +minimal +intent: the builder set 0\.25/);
    const made = JSON.parse(readFileSync(join(out, 'taster.system.json'), 'utf8'));
    assert.equal(readFileSync(join(out, 'theme.css'), 'utf8'), made.css);
    const t = run('--tune', join(out, 'taster.system.json'), 'density=1');
    assert.equal(t.status, 0, t.stderr);
    assert.match(t.stdout, /type-expression moved branded \(0\.5\) to plain \(0\.25\): "The more a screen holds, the quieter its type/);
    const tuned = JSON.parse(readFileSync(join(out, 'taster.system.json'), 'utf8'));
    assert.equal(tuned.axes.density, 1);
    assert.equal(tuned.tuned.length, 1);
    assert.equal(run('--tune', join(out, 'taster.system.json'), 'density=9').status, 2);
    assert.equal(run('--system', '--axis', 'wobble=1').status, 2);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
