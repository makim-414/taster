// Runs the CLI on one live URL and checks the report and one annotated JPEG per width.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, VIEWPORTS } from '../diagnose.mjs';

const target = process.argv[2];
if (!target) {
  console.error('usage: node packages/engine/scripts/smoke.mjs <url>');
  process.exit(2);
}

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'taster-smoke-'));
const errors = [];
try {
  const run = spawnSync(process.execPath, [cli, target, '--out', out], { encoding: 'utf8', timeout: 120000 });
  if (run.status !== 0 && run.status !== 1) errors.push(`cli exited ${run.status}: ${(run.stderr || '').trim()}`);
  const reportPath = join(out, 'report.json');
  if (!existsSync(reportPath)) errors.push('report.json was not written');
  else {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const measured = RULES.filter((r) => r.detect.level !== 'manual').length;
    if (report.measured !== measured) errors.push(`measured ${report.measured}, expected ${measured}`);
    if (report.widths.join(',') !== VIEWPORTS.map((v) => v.width).join(',')) errors.push(`widths ${report.widths}`);
    if ((report.rulesHit > 0) !== (run.status === 1)) errors.push('exit code does not match findings');
    console.log(`${report.url}: ${report.rulesHit} rules hit at ${report.widths.join(' and ')}, exit ${run.status}`);
  }
  for (const { width } of VIEWPORTS) {
    const jpg = join(out, `annotated-${width}.jpg`);
    if (!existsSync(jpg)) {
      errors.push(`annotated-${width}.jpg was not written`);
      continue;
    }
    const data = readFileSync(jpg);
    if (data.subarray(0, 3).toString('hex') !== 'ffd8ff') errors.push(`annotated-${width}.jpg is not a JPEG`);
    if (data.length < 1000) errors.push(`annotated-${width}.jpg is only ${data.length} bytes`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`);
  process.exit(1);
}
console.log('smoke passed');
