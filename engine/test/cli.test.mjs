import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAX_SHOT_BYTES, RULES, toUrl } from '../diagnose.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`../../rules/fixtures/${name}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 90000 });
// For a run against a server in this process: spawnSync would block the server from answering.
const runAsync = (...args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });

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
    assert.ok(existsSync(join(out, 'annotated-1440.jpg')));
    assert.ok(existsSync(join(out, 'annotated-390.jpg')));
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

test('--fail-on counts for one target too, and a bad level is an error before any page opens', { timeout: 90000 }, () => {
  assert.equal(run(fixture('slop.html'), '--widths', '390', '--fail-on', 'none').status, 0);
  assert.equal(run(fixture('slop.html'), '--widths', '390', '--fail-on', 'high').status, 1);
  const bad = run(fixture('slop.html'), '--fail-on', 'bogus');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Bad --fail-on: bogus/);
});

test('--out with --sarif and --summary still writes report.json and the captures', { timeout: 90000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-cli-sarif-'));
  try {
    const r = run(fixture('slop.html'), '--widths', '390', '--out', join(out, 'o'), '--sarif', join(out, 'r.sarif'), '--summary', join(out, 's.md'));
    assert.equal(r.status, 1, r.stderr);
    assert.ok(JSON.parse(readFileSync(join(out, 'o', 'report.json'), 'utf8')).rulesHit > 0);
    assert.ok(existsSync(join(out, 'o', 'annotated-390.jpg')));
    assert.ok(JSON.parse(readFileSync(join(out, 'r.sarif'), 'utf8')).runs[0].results.length > 0);
    assert.match(readFileSync(join(out, 's.md'), 'utf8'), /^## Taster/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('a long page comes back as JPEG captures under 4 MB each', { timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'taster-cli-tall-'));
  try {
    // 120 sections of gradient, text and pixel noise: a full PNG of this page was 5.6 MB at 1440.
    const sections = Array.from({ length: 120 }, (_, i) => `<section style="padding:48px;background:linear-gradient(${i * 7}deg,hsl(${i * 3} 70% 60%),hsl(${i * 3 + 90} 70% 40%))"><h2>Section ${i + 1}</h2><p>${'Words that fill a line of text in this section. '.repeat(6)}</p><canvas width="1200" height="40"></canvas></section>`).join('');
    const noise = "for (const c of document.querySelectorAll('canvas')) { const x = c.getContext('2d'); const d = x.createImageData(c.width, c.height); let s = 7; for (let i = 0; i < d.data.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d.data[i] = i % 4 === 3 ? 255 : s & 255; } x.putImageData(d, 0, 0); }";
    writeFileSync(join(dir, 'tall.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tall</title></head><body style="margin:0">${sections}<script>${noise}</script></body></html>`);
    const r = run(join(dir, 'tall.html'), '--out', join(dir, 'out'));
    assert.ok(r.status === 0 || r.status === 1, r.stderr);
    const report = JSON.parse(readFileSync(join(dir, 'out', 'report.json'), 'utf8'));
    const shots = readdirSync(join(dir, 'out')).filter((f) => f.startsWith('annotated-'));
    assert.deepEqual(shots.map((f) => join(dir, 'out', f)).sort(), [...report.screenshots].sort());
    assert.ok(shots.includes('annotated-1440.jpg') && shots.includes('annotated-390.jpg'));
    for (const f of shots) {
      const data = readFileSync(join(dir, 'out', f));
      assert.equal(data.subarray(0, 3).toString('hex'), 'ffd8ff', `${f} is not a JPEG`);
      assert.ok(statSync(join(dir, 'out', f)).size < MAX_SHOT_BYTES, `${f} is ${data.length} bytes`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

test('several targets: a block page fails the run with exit 2 after the others are read, and SARIF says why', { timeout: 120000 }, async () => {
  const challenge = readFileSync(new URL('./fixtures/load-403-challenge.html', import.meta.url), 'utf8');
  const server = createServer((req, res) => {
    if (req.url === '/challenge') return res.writeHead(403, { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }).end(challenge);
    res.writeHead(200, { 'content-type': 'text/html' }).end(readFileSync(fixture('slop.html')));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = mkdtempSync(join(tmpdir(), 'taster-cli-blocked-'));
  try {
    const r = await runAsync(`${base}/challenge`, `${base}/slop`, '--widths', '1440', '--sarif', join(out, 't.sarif'), '--summary', join(out, 's.md'), '--fail-on', 'none');
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /^not diagnosed: got a bot check page \(HTTP 403, title "Just a moment\.\.\."\) instead of the site at http:\/\/127\.0\.0\.1:\d+\/challenge\./);
    assert.match(r.stdout, /\/slop\n\d+ of \d+ measured rules hit at 1440 wide/, 'the target after the block page was still diagnosed');
    const sarif = JSON.parse(readFileSync(join(out, 't.sarif'), 'utf8')).runs[0];
    assert.equal(sarif.invocations[0].executionSuccessful, false);
    assert.equal(sarif.invocations[0].toolExecutionNotifications.length, 1);
    assert.ok(sarif.results.length > 0 && sarif.results.every((x) => x.locations[0].physicalLocation.artifactLocation.uri === `${base}/slop`), 'no results for the block page');
    assert.match(readFileSync(join(out, 's.md'), 'utf8'), /\*\*http:\/\/127\.0\.0\.1:\d+\/challenge\*\*: not diagnosed/);
  } finally {
    server.close();
    rmSync(out, { recursive: true, force: true });
  }
});

test('--version prints the package version, --help names every taster command', () => {
  const version = run('--version');
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version);
  const help = run('--help');
  for (const line of ['taster <url-or-file>...', 'taster mcp', 'taster acp [--setup]', 'taster setup', 'taster --version', 'TASTER_ROOT', 'TASTER_WEB_URL', '2 error or a target not diagnosed']) {
    assert.ok(help.stdout.includes(line), `--help is missing ${line}`);
  }
  assert.equal(run('help').stdout, help.stdout);
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
