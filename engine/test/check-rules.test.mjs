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
const edit = (fn) => {
  const doc = structuredClone(RULES);
  fn(Object.fromEntries(doc.rules.map((r) => [r.id, r])), doc);
  return doc;
};

test('the rules in the repository pass', () => {
  const res = check();
  assert.equal(res.status, 0, res.stdout);
  assert.match(res.stdout, /^RULES SCHEMA OK rules=\d+ measured=\d+ manual=\d+ external=\d+ standard=\d+ taster-observation=\d+/);
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

test('every rule says its basis, and taster-observation says what was seen', () => {
  let res = check({ rules: edit((r) => delete r['AC-05'].basis) });
  assert.match(res.stdout, /FAIL AC-05: missing key basis/);
  res = check({ rules: edit((r) => { r['AC-05'].basis = ['hunch']; }) });
  assert.match(res.stdout, /FAIL AC-05: unknown basis hunch/);
  res = check({ rules: edit((r) => delete r['AC-05'].observation) });
  assert.match(res.stdout, /FAIL AC-05: basis taster-observation needs an observation/);
  res = check({ rules: edit((r) => { r['TYP-02'].observation = 'Seen in our own work.'; }) });
  assert.match(res.stdout, /FAIL TYP-02: observation given but basis has no taster-observation/);
});

test('refs back the basis they claim, with a short quote and the day it was read', () => {
  let res = check({ rules: edit((r) => { r['MOT-07'].basis = ['external']; }) });
  assert.match(res.stdout, /FAIL MOT-07: basis says external but no ref is on an outside write-up/);
  assert.match(res.stdout, /FAIL MOT-07: a ref is on a standards host .* but basis does not say standard/);
  res = check({ rules: edit((r) => delete r['TYP-02'].refs[0].supports) });
  assert.match(res.stdout, /FAIL TYP-02: ref \S+ needs supports/);
  res = check({ rules: edit((r) => { r['TYP-02'].refs[0].supports = Array(16).fill('word').join(' '); }) });
  assert.match(res.stdout, /quotes 16 words; quote 15 or fewer/);
  res = check({ rules: edit((r) => { r['TYP-02'].refs[0].accessed = 'last week'; }) });
  assert.match(res.stdout, /FAIL TYP-02: ref \S+ needs accessed/);
  res = check({ rules: edit((r) => { r['TYP-02'].refs[0].note = 'x'; }) });
  assert.match(res.stdout, /has unexpected key note/);
});

test('one page pasted onto several rules with the same supports fails', () => {
  const res = check({
    rules: edit((r) => {
      const ref = r['LAY-03'].refs.find((x) => x.url.includes('kill-ai-slop'));
      r['LAY-06'].refs = r['LAY-06'].refs.map((x) => (x.url === ref.url ? { ...x, supports: ref.supports } : x));
    }),
  });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /FAIL LAY-0[36]: ref \S+ has the same supports as LAY-0[36]/);
});

test('the basis kinds are explained in rules.json', () => {
  const res = check({ rules: edit((_, doc) => delete doc.basis_kinds.standard) });
  assert.match(res.stdout, /FAIL basis_kinds.standard missing/);
});
