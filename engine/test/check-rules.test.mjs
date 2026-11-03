import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const RULES = JSON.parse(readFileSync(here('../../rules/rules.json'), 'utf8'));
const DETECT = readFileSync(here('../../rules/detect.js'), 'utf8');

// check-rules reads rules/ next to engine/scripts/, so each case gets its own copy of that layout.
function check({ rules = RULES, detect = DETECT } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'taster-check-rules-'));
  mkdirSync(join(dir, 'engine', 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'rules'));
  copyFileSync(here('../scripts/check-rules.mjs'), join(dir, 'engine', 'scripts', 'check-rules.mjs'));
  writeFileSync(join(dir, 'rules', 'rules.json'), JSON.stringify(rules));
  writeFileSync(join(dir, 'rules', 'detect.js'), detect);
  return spawnSync(process.execPath, [join(dir, 'engine', 'scripts', 'check-rules.mjs')], { encoding: 'utf8' });
}

test('the rules in the repository pass', () => {
  const res = check();
  assert.equal(res.status, 0, res.stdout);
  assert.match(res.stdout, /^RULES SCHEMA OK rules=\d+ measured=\d+ manual=\d+/);
});

test('a measured rule left out of ORDER fails, though its checker is still registered', () => {
  const detect = DETECT.replace(/(var ORDER = \[[\s\S]*?)'CMP-09', ([\s\S]*?\];)/, '$1$2');
  assert.notEqual(detect, DETECT);
  assert.match(detect, /R\['CMP-09'\] = function/);
  const res = check({ detect });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /FAIL CMP-09: measured in rules.json but missing from ORDER/);
});

test('a rule listed twice in ORDER fails', () => {
  const res = check({ detect: DETECT.replace("var ORDER = [", "var ORDER = [\n      'AC-01',") });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /FAIL AC-01: listed twice in ORDER/);
});
