// Runs the gates CI runs, job by job in the order of .github/workflows/validate.yml, so a clean clone checks a change
// the way CI will. It first installs what is missing: the engine, registry and web packages (npm ci, only where
// node_modules is absent) and the Chromium that Playwright uses. The web job builds the site, serves it on a free port
// and runs the browser scripts against it. A job stops at its first failing gate, as in CI, and the next job still
// runs. The action job runs the same diagnosis as the repository's GitHub Action and checks its SARIF.
// scripts/gates.test.mjs keeps this list and the workflow in step.
// Usage: node scripts/gates.mjs [validate] [browser] [web] [action] [--list] [--no-install]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// cmd is the command as validate.yml writes it. base: the command takes the served site's address. ci: false for a
// gate that only exists here (CI runs the action itself).
export const JOBS = {
  validate: [
    { name: 'Generated docs are current', cmd: 'node scripts/build-docs.mjs', unchanged: true },
    { name: 'Repository data and skill bundle', cmd: 'node scripts/validate.mjs' },
    { name: 'Strict taxonomy, negative controls and balance sweep', cmd: 'node scripts/check-taxonomy.mjs' },
    { name: 'Weighting axes', cmd: 'node --test taxonomy/axes.test.mjs' },
    { name: 'Rule schema matches the detector', cmd: 'node packages/engine/scripts/check-rules.mjs' },
    { name: 'Registry typecheck', cmd: 'npm --prefix packages/registry run typecheck' },
    { name: 'Source lint finds its own bad lines', cmd: 'node packages/engine/lint.mjs --selftest' },
    { name: 'The registry stays at or under its lint baseline', cmd: 'node packages/engine/lint.mjs packages/registry/src --baseline packages/registry/lint-baseline.json' },
    { name: 'Gate scripts', cmd: 'node --test scripts/check-authors.test.mjs scripts/gates.test.mjs' },
    { name: 'Commit emails are GitHub noreply addresses', cmd: 'node scripts/check-authors.mjs', authors: true },
  ],
  browser: [
    { name: 'Detector fixtures', cmd: 'node rules/test-detect.mjs' },
    { name: 'Engine CLI and MCP', cmd: 'npm --prefix packages/engine test' },
    { name: 'Rebuild example stays clean and keeps its content', cmd: 'node packages/engine/scripts/check-rebuild-example.mjs' },
    { name: 'Icon slot variations match the taxonomy and stay clean', cmd: 'node packages/engine/scripts/check-icon-slots-example.mjs' },
    { name: 'Every component renders at 1440 and 390 with no page or console error', cmd: 'npm --prefix packages/registry run test-render' },
    { name: 'Component keyboard, names and reduced motion', cmd: 'node packages/registry/test-a11y.mjs' },
    { name: 'No component runs what its props hold', cmd: 'node packages/registry/test-injection.mjs' },
  ],
  web: [
    { name: 'Typecheck and build', cmd: 'npm --prefix apps/web run build' },
    { name: 'Routes trace the engine files they read at run time', cmd: 'node apps/web/scripts/check-traces.mjs' },
    { name: 'Address guard, limits and fenced engine on the fixtures', cmd: 'npm --prefix apps/web test' },
    { name: 'Serve the build', serve: true },
    { name: 'Zero findings on every page at 1440, 1280 and 390', cmd: 'node apps/web/scripts/self-check.mjs', base: true },
    { name: 'The gallery works on a phone, a tablet and a desktop', cmd: 'node apps/web/scripts/check-gallery.mjs', base: true },
    { name: 'The tone page works on a phone, a tablet and a desktop', cmd: 'node apps/web/scripts/check-tone.mjs', base: true },
    { name: 'Head tags, the 404 screen and the headers', cmd: 'node apps/web/scripts/check-metadata.mjs', base: true },
    { name: 'Pages stay at or under the accessibility baseline', cmd: 'node apps/web/scripts/check-a11y.mjs', base: true },
  ],
  action: [{ name: 'The diagnosis the action runs: findings for before.html, none for after.html', sarif: true, ci: false }],
};

function sh(cmd, extra = [], env = {}) {
  const [bin, ...args] = cmd.split(' ');
  const r = spawnSync(bin, [...args, ...extra], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  return r.status === 0;
}
const quiet = (bin, args) => spawnSync(bin, args, { cwd: ROOT, encoding: 'utf8' });

// Tracked changes and untracked files as one string, to tell whether a step wrote anything.
const treeState = () => quiet('git', ['status', '--porcelain', '--untracked-files=all']).stdout + quiet('git', ['diff', '--binary']).stdout;

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

let server = null;
async function serve() {
  const port = Number(process.env.PORT) || (await freePort());
  const base = `http://localhost:${port}`;
  const child = spawn('npm', ['--prefix', 'apps/web', 'start'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: 'ignore', detached: true });
  server = child;
  for (let i = 0; i < 60; i++) {
    try {
      const html = await (await fetch(`${base}/`)).text();
      if (html.includes('id="target"')) {
        console.log(`serving the build on ${base}`);
        return base;
      }
    } catch {
      // not up yet
    }
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`the web build did not start on ${base}`);
  return null;
}
function stopServer() {
  if (!server) return;
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already gone
  }
  server = null;
}

// The action's diagnosis (packages/engine/cli.mjs on examples/rebuild) and the same SARIF check as the action job.
function sarif() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'taster-gates-'));
  const file = path.join(dir, 'taster.sarif');
  try {
    if (!sh('node packages/engine/cli.mjs examples/rebuild/before.html examples/rebuild/after.html', ['--sarif', file, '--fail-on', 'none'])) return false;
    const s = JSON.parse(readFileSync(file, 'utf8'));
    const count = (uri) => s.runs[0].results.filter((x) => x.locations[0].physicalLocation.artifactLocation.uri === uri).length;
    const before = count('examples/rebuild/before.html');
    const after = count('examples/rebuild/after.html');
    console.log({ before, after });
    return s.version === '2.1.0' && before >= 10 && after === 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function runGate(gate, base) {
  if (gate.serve) return Boolean((base.url = await serve()));
  if (gate.sarif) return sarif();
  if (gate.authors && quiet('git', ['rev-parse', '--verify', '--quiet', 'origin/main']).status !== 0) {
    console.log('no origin/main to compare with; skipped');
    return true;
  }
  if (gate.unchanged) {
    const before = treeState();
    if (!sh(gate.cmd)) return false;
    if (treeState() === before) return true;
    console.log('build-docs changed generated files (git status lists them). Commit them with the change that caused them.');
    return false;
  }
  return sh(gate.cmd, gate.base ? [base.url] : []);
}

function install() {
  for (const dir of ['packages/engine', 'packages/registry', 'apps/web']) {
    if (existsSync(path.join(ROOT, dir, 'node_modules'))) continue;
    console.log(`\n-- npm ci --prefix ${dir}`);
    if (!sh(`npm ci --prefix ${dir} --no-audit --no-fund`)) return false;
  }
  console.log('\n-- npx --prefix packages/engine playwright install chromium');
  if (!sh('npx --prefix packages/engine playwright install chromium')) return false;
  const probe = "require('./packages/engine/node_modules/playwright').chromium.launch().then((b) => b.close())";
  if (quiet(process.execPath, ['-e', probe]).status !== 0) {
    console.log('Chromium is installed but does not start. On Linux, add its libraries: npx --prefix packages/engine playwright install-deps chromium');
    return false;
  }
  return true;
}

async function main(argv) {
  const names = argv.filter((a) => !a.startsWith('--'));
  const unknown = names.filter((n) => !JOBS[n]);
  if (unknown.length) {
    console.error(`unknown job ${unknown.join(', ')}; jobs: ${Object.keys(JOBS).join(' ')}`);
    return 2;
  }
  const chosen = names.length ? names : Object.keys(JOBS);
  if (argv.includes('--list')) {
    for (const job of chosen) for (const g of JOBS[job]) console.log(`${job}\t${g.name}${g.cmd ? `\t${g.cmd}` : ''}`);
    return 0;
  }
  if (!argv.includes('--no-install') && !install()) return 1;
  const summary = [];
  for (const job of chosen) {
    const started = Date.now();
    const base = { url: null };
    let failed = null;
    console.log(`\n== ${job}`);
    try {
      for (const gate of JOBS[job]) {
        console.log(`\n-- ${gate.name}${gate.cmd ? `: ${gate.cmd}` : ''}`);
        if (!(await runGate(gate, base))) {
          failed = gate.name;
          break;
        }
      }
    } finally {
      stopServer();
    }
    summary.push(`${job.padEnd(9)}${failed ? `FAIL at "${failed}"` : 'ok'} (${Math.round((Date.now() - started) / 1000)}s)`);
  }
  console.log(`\n${summary.join('\n')}`);
  const ok = summary.every((l) => !l.includes('FAIL'));
  console.log(ok ? 'GATES OK' : 'GATES FAIL');
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on('exit', stopServer);
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    console.error(e);
    stopServer();
    process.exit(2);
  });
}
