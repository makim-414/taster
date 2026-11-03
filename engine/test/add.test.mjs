import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { GROUPS, fetchBundle, isRegistryPath, loadRegistry, resolveComponents, writeBundle } from '../add.mjs';

test('add pulls in every relative import, the token files and the notices', () => {
  const b = resolveComponents(['blocks/session-list']);
  const paths = b.files.map((f) => f.path).sort();
  for (const p of ['blocks/session-list.tsx', 'blocks/button.tsx', 'blocks/_cn.ts', 'icons/index.tsx', 'tokens.css', 'tailwind-preset.cjs', 'THIRD_PARTY_NOTICES.md']) assert.ok(paths.includes(p), `missing ${p}`);
  assert.equal(new Set(paths).size, paths.length, 'no file twice');
  assert.deepEqual(b.npm, []);
  assert.deepEqual(resolveComponents(['blocks/select-menu']).npm, ['@radix-ui/react-select']);
  // A dependency on another registry group is a file in the bundle, not an npm package to install.
  assert.deepEqual(resolveComponents(['content/article']).npm, []);
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

test('add writes only inside its folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'taster-add-escape-'));
  const dir = join(root, 'taster');
  const one = (path) => ({ files: [{ path, content: 'x' }] });
  // A sibling whose name starts with the folder's name is still outside it.
  assert.throws(() => writeBundle(one('../taster-evil/x.tsx'), dir), /outside/);
  assert.ok(!existsSync(join(root, 'taster-evil')));
  assert.throws(() => writeBundle(one(join(root, 'abs.tsx')), dir), /outside/);
  assert.ok(!existsSync(join(root, 'abs.tsx')) && !existsSync(join(dir, root)));
  // --dir . makes the folder the working directory, and .. still may not climb out of it.
  const deep = join(root, 'a', 'b');
  mkdirSync(deep, { recursive: true });
  const cwd = process.cwd();
  process.chdir(deep);
  try {
    assert.throws(() => writeBundle(one('../../x.tsx'), '.'), /outside/);
  } finally {
    process.chdir(cwd);
  }
  assert.ok(!existsSync(join(root, 'x.tsx')));
  // One bad path refuses the whole bundle, so nothing is half written.
  assert.throws(() => writeBundle({ files: [{ path: 'blocks/ok.tsx', content: 'x' }, { path: 'blocks/../../x.tsx', content: 'x' }] }, dir), /outside/);
  assert.ok(!existsSync(join(dir, 'blocks', 'ok.tsx')));
});

test('every path a local bundle has is one a hosted bundle may have', () => {
  const registry = loadRegistry();
  assert.deepEqual([...new Set(registry.components.map((c) => c.file.split('/')[1]))].sort(), [...GROUPS].sort());
  for (const c of registry.components) for (const f of resolveComponents([c.id]).files) assert.ok(isRegistryPath(f.path), `${c.id}: ${f.path}`);
});

test('a hosted bundle may only name registry paths', async () => {
  const bundle = (...paths) => ({ files: paths.map((path) => ({ path, content: 'x' })), npm: [], credits: [] });
  const hosted = {
    '/r/blocks/good.json': bundle('blocks/good.tsx', 'tokens.css', 'THIRD_PARTY_NOTICES.md'),
    '/r/blocks/climb.json': bundle('../../.bashrc'),
    '/r/blocks/inner.json': bundle('blocks/../../x.tsx'),
    '/r/blocks/abs.json': bundle('/etc/x.tsx'),
    '/r/blocks/other.json': bundle('scripts/postinstall.js'),
    '/r/blocks/hidden.json': bundle('blocks/.env'),
    '/r/blocks/kind.json': bundle('blocks/run.sh'),
  };
  const server = createServer((req, res) => {
    const b = hosted[req.url];
    res.writeHead(b ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(b || {}));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const from = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual((await fetchBundle(['blocks/good'], from)).files.map((f) => f.path), ['blocks/good.tsx', 'tokens.css', 'THIRD_PARTY_NOTICES.md']);
    for (const id of ['blocks/climb', 'blocks/inner', 'blocks/abs', 'blocks/other', 'blocks/hidden', 'blocks/kind']) {
      await assert.rejects(fetchBundle([id], from), /not a registry path/, id);
    }
  } finally {
    server.close();
  }
});
