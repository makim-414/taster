import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveComponents, writeBundle } from '../add.mjs';

test('add pulls in every relative import, the token files and the notices', () => {
  const b = resolveComponents(['blocks/session-list']);
  const paths = b.files.map((f) => f.path).sort();
  for (const p of ['blocks/session-list.tsx', 'blocks/button.tsx', 'blocks/_cn.ts', 'icons/index.tsx', 'tokens.css', 'tailwind-preset.cjs', 'THIRD_PARTY_NOTICES.md']) assert.ok(paths.includes(p), `missing ${p}`);
  assert.equal(new Set(paths).size, paths.length, 'no file twice');
  assert.deepEqual(b.npm, []);
  assert.deepEqual(resolveComponents(['blocks/select-menu']).npm, ['@radix-ui/react-select']);
});

test('add refuses unknown ids and keeps files the user changed', () => {
  assert.throws(() => resolveComponents(['blocks/nope']), /Unknown component blocks\/nope/);
  const dir = mkdtempSync(join(tmpdir(), 'taster-add-test-'));
  const b = resolveComponents(['blocks/badge']);
  assert.ok(writeBundle(b, dir).written.includes('blocks/badge.tsx'));
  writeFileSync(join(dir, 'blocks/badge.tsx'), '// mine\n');
  const again = writeBundle(b, dir);
  assert.ok(again.skipped.includes('blocks/badge.tsx'));
  assert.equal(readFileSync(join(dir, 'blocks/badge.tsx'), 'utf8'), '// mine\n');
  assert.ok(writeBundle(b, dir, { overwrite: true }).written.includes('blocks/badge.tsx'));
  assert.throws(() => writeBundle({ files: [{ path: '../escape.txt', content: 'x' }] }, dir), /outside/);
  assert.ok(!existsSync(join(dir, '..', 'escape.txt')));
});
