import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { editFromHook, liveCommand, relFile } from '../edit.mjs';

// `taster live edit`: what an agent's PostToolUse hook runs after each edit. With no hub it must cost nothing and
// never fail; with one it posts one `edit` event with a relative path and the agent.
const dir = mkdtempSync(join(tmpdir(), 'taster-edit-test-'));
const TASTER = fileURLToPath(new URL('../taster.mjs', import.meta.url));
const TOKEN = 'b'.repeat(48);
test.after(() => rmSync(dir, { recursive: true, force: true }));

// A stand in for the hub that keeps every event it gets.
async function fakeHub(file) {
  const got = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/api/hello') return res.end(JSON.stringify({ app: 'taster-watch', v: 1, pid: process.pid }));
      if (req.headers['x-taster-token'] !== TOKEN) return res.writeHead(401).end();
      if (url.pathname === '/ingest') got.push(...JSON.parse(Buffer.concat(chunks).toString('utf8')));
      res.end('{}');
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  writeFileSync(file, JSON.stringify({ port: server.address().port, token: TOKEN, pid: process.pid }), { mode: 0o600 });
  chmodSync(file, 0o600);
  return { got, close: () => new Promise((r) => server.close(r)) };
}

function run(args, { input, env, cwd = dir } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [TASTER, ...args], { cwd, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (out += c));
    child.stdin.on('error', () => {});
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
    child.on('exit', (code) => resolve({ code, out, ms: Date.now() - started }));
  });
}

const hookInput = (over = {}) =>
  JSON.stringify({ session_id: 'sess-1', transcript_path: '/x/t.jsonl', cwd: join(dir, 'site'), hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, 'site', 'src', 'hero.html'), old_string: 'a', new_string: 'b' }, tool_response: { filePath: join(dir, 'site', 'src', 'hero.html') }, ...over });

test('relFile keeps a path inside the folder relative and only names a file outside it', () => {
  assert.equal(relFile('/a/b/src/x.tsx', '/a/b'), 'src/x.tsx');
  assert.equal(relFile('src/x.tsx', '/a/b'), 'src/x.tsx');
  assert.equal(relFile('/etc/hosts', '/a/b'), 'hosts');
  assert.equal(relFile('/a/bc/x.css', '/a/b'), 'x.css', 'a sibling folder is outside');
  assert.equal(relFile('', '/a'), null);
});

test('editFromHook reads a PostToolUse input: the file, the tool and one agent per session and subagent', () => {
  const e = editFromHook(JSON.parse(hookInput()));
  assert.equal(e.file, 'src/hero.html');
  assert.equal(e.tool, 'Edit');
  assert.equal(e.agent.kind, 'hook');
  assert.equal(e.agent.client, 'claude-code');
  assert.equal(e.agent.label, 'site');
  assert.match(e.agent.id, /^cc-[0-9a-f]{12}$/);
  assert.ok(!e.agent.id.includes('sess-1'), 'the session id is not sent as it is');
  const sub = editFromHook({ ...JSON.parse(hookInput()), agent_id: 'sub-7', agent_type: 'Explore' });
  assert.notEqual(sub.agent.id, e.agent.id, 'a subagent gets a cursor of its own');
  assert.equal(sub.agent.label, 'Explore');
  assert.equal(editFromHook({ ...JSON.parse(hookInput()), tool_name: 'Write', tool_input: { file_path: '/elsewhere/notes.md', content: 'x' } }).file, 'notes.md');
  assert.equal(editFromHook({ tool_name: 'Bash', tool_input: { command: 'ls' } }), null);
  assert.equal(editFromHook(null), null);
});

test('with no hub the hook command exits 0 at once and does not read stdin', async () => {
  const env = { TASTER_LIVE_FILE: join(dir, 'none.json') };
  let read = false;
  const before = process.env.TASTER_LIVE_FILE;
  process.env.TASTER_LIVE_FILE = env.TASTER_LIVE_FILE;
  try {
    const started = performance.now();
    assert.equal(await liveCommand(['edit'], { stdin: async () => ((read = true), hookInput()) }), 0);
    assert.ok(performance.now() - started < 50, `took ${performance.now() - started}ms`);
    assert.equal(read, false);
  } finally {
    process.env.TASTER_LIVE_FILE = before;
  }
  // The real process, as the hook runs it: exit 0 with nothing printed (Node's own start-up is most of the time).
  const r = await run(['live', 'edit'], { input: hookInput(), env });
  assert.equal(r.code, 0);
  assert.equal(r.out, '');
  assert.ok(r.ms < 2000, `took ${r.ms}ms`);
  assert.equal((await run(['live', 'edit', '--file', 'x.html'], { env })).code, 0);
  assert.equal((await run(['live', 'nope'], { env })).code, 2);
});

test('with a hub the hook command posts one edit event, and bad input still exits 0', async () => {
  const file = join(dir, 'hub.json');
  const hub = await fakeHub(file);
  try {
    const env = { TASTER_LIVE_FILE: file };
    const r = await run(['live', 'edit'], { input: hookInput(), env });
    assert.equal(r.code, 0);
    assert.equal(hub.got.length, 1);
    const e = hub.got[0];
    assert.equal(e.type, 'edit');
    assert.deepEqual(e.data, { file: 'src/hero.html', tool: 'Edit' });
    assert.equal(e.agent.kind, 'hook');
    assert.equal(e.agent.client, 'claude-code');
    assert.equal(e.call, null);
    assert.ok(!JSON.stringify(e).includes(dir), 'no absolute path leaves the process');

    for (const input of ['not json', '{}', JSON.stringify({ tool_name: 'Edit', tool_input: {} })]) assert.equal((await run(['live', 'edit'], { input, env })).code, 0);
    assert.equal(hub.got.length, 1, 'nothing is posted for input without a file');

    // Other agents name the file themselves.
    const m = await run(['live', 'edit', '--file', 'src/cards.html', '--tool', 'apply_patch', '--agent', 'builder', '--client', 'codex'], { env });
    assert.equal(m.code, 0);
    const c = hub.got[1];
    assert.deepEqual(c.data, { file: 'src/cards.html', tool: 'apply_patch' });
    assert.equal(c.agent.client, 'codex');
    assert.equal(c.agent.label, 'builder');
    assert.equal(c.agent.kind, 'cli');
  } finally {
    await hub.close();
    rmSync(file, { force: true });
  }
});

test('add reports the files it wrote as one edit, the fitted taster.css and icon adapter included', async () => {
  const file = join(dir, 'hub-add.json');
  const hub = await fakeHub(file);
  const app = join(dir, 'app');
  cpSync(fileURLToPath(new URL('./fixtures/hosts/v4-lucide/', import.meta.url)), app, { recursive: true });
  try {
    const r = await run(['add', 'marketing/audience-split'], { env: { TASTER_LIVE_FILE: file }, cwd: app });
    assert.equal(r.code, 0, r.out);
    const edit = hub.got.find((e) => e.type === 'edit');
    assert.equal(edit.data.tool, 'add');
    for (const f of ['src/components/taster/marketing/audience-split.tsx', 'src/components/taster/taster.css', 'src/components/taster/icons/index.tsx']) assert.ok(edit.data.files.includes(f), `edit does not name ${f}`);
    assert.ok(!JSON.stringify(hub.got).includes(dir), 'no absolute path leaves the process');
  } finally {
    await hub.close();
    rmSync(file, { force: true });
  }
});

test('the plugin hook runs the command on Edit, Write and MultiEdit', async () => {
  const { readFileSync } = await import('node:fs');
  const hooks = JSON.parse(readFileSync(new URL('../../../hooks/hooks.json', import.meta.url), 'utf8'));
  const [entry] = hooks.hooks.PostToolUse;
  for (const tool of ['Edit', 'Write', 'MultiEdit']) assert.ok(new RegExp(`^(${entry.matcher})$`).test(tool), tool);
  assert.equal(entry.hooks[0].type, 'command');
  assert.match(entry.hooks[0].command, /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/packages\/engine\/taster\.mjs" live edit$/);
  assert.ok(entry.hooks[0].timeout <= 10);
});
