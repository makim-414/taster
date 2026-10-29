import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { TARGETS, renderBody, renderTarget, writeTarget } from '../exports.mjs';

test('every rule is in the body, high severity first, no dash characters', () => {
  const rules = JSON.parse(readFileSync(new URL('../../rules/rules.json', import.meta.url), 'utf8')).rules;
  const body = renderBody(rules);
  for (const r of rules) assert.ok(body.includes(`- ${r.id} `), r.id);
  assert.ok(body.indexOf('## High') < body.indexOf('## Medium'));
  const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
  assert.doesNotMatch(body, dashes);
  assert.match(renderTarget('cursor'), /^---\ndescription: .+\nglobs: .+\nalwaysApply: false\n---/);
});

test('shared files keep the user text and get one Taster block', () => {
  const dir = mkdtempSync(join(tmpdir(), 'taster-exports-'));
  writeFileSync(join(dir, 'AGENTS.md'), '# Mine\n');
  writeTarget('agents', dir);
  writeTarget('agents', dir);
  const out = readFileSync(join(dir, TARGETS.agents.file), 'utf8');
  assert.ok(out.startsWith('# Mine\n'));
  assert.equal(out.split('<!-- taster:start -->').length, 2);
  assert.throws(() => renderTarget('vim'), /Unknown target vim/);
});
