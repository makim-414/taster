import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const agentPath = fileURLToPath(new URL('../acp.mjs', import.meta.url));
const launcherPath = fileURLToPath(new URL('../start.mjs', import.meta.url));
const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url));

// A bare JSON-RPC client over the agent's stdio, so the test checks the wire format an editor sees.
function start(args = [agentPath]) {
  const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'inherit'] });
  const messages = [];
  const waiters = [];
  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line) continue;
      messages.push(JSON.parse(line));
      for (const w of [...waiters]) w();
    }
  });
  const waitFor = (pred, ms = 60000) =>
    new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error('timed out waiting for a message')), ms);
      const check = () => {
        const hit = messages.find(pred);
        if (!hit) return;
        clearTimeout(timer);
        waiters.splice(waiters.indexOf(check), 1);
        ok(hit);
      };
      waiters.push(check);
      check();
    });
  let nextId = 0;
  const send = (msg) => child.stdin.write(`${typeof msg === 'string' ? msg : JSON.stringify(msg)}\n`);
  const request = async (method, params) => {
    const id = ++nextId;
    send({ jsonrpc: '2.0', id, method, params });
    return waitFor((m) => m.id === id && !m.method);
  };
  const notify = (method, params) => send({ jsonrpc: '2.0', method, params });
  const updates = (sessionId) => messages.filter((m) => m.method === 'session/update' && m.params.sessionId === sessionId).map((m) => m.params.update);
  return { child, messages, waitFor, request, notify, send, updates };
}

const textOf = (updates) => updates.filter((u) => u.sessionUpdate === 'agent_message_chunk').map((u) => u.content.text).join('');

test('the ACP agent answers slash commands over stdio', { timeout: 120000 }, async () => {
  const c = start();
  try {
    const init = await c.request('initialize', { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'taster-test', version: '0.1.0' } });
    assert.equal(init.result.protocolVersion, 1);
    assert.equal(init.result.agentInfo.name, 'taster');
    assert.equal(init.result.agentCapabilities.loadSession, false);
    assert.deepEqual(init.result.authMethods.map((m) => [m.id, m.type, m.args.join(' ')]), [['setup', 'terminal', 'acp --setup']]);
    const auth = await c.request('authenticate', { methodId: 'setup' });
    assert.deepEqual(auth.result, {});

    const created = await c.request('session/new', { cwd: fixturesDir, mcpServers: [] });
    const { sessionId } = created.result;
    assert.ok(sessionId);
    const commands = await c.waitFor((m) => m.method === 'session/update' && m.params.update.sessionUpdate === 'available_commands_update');
    assert.deepEqual(commands.params.update.availableCommands.map((x) => x.name), ['start', 'diagnose', 'extract', 'brand', 'explain', 'rules', 'help']);
    assert.equal(commands.params.update.availableCommands.find((x) => x.name === 'diagnose').input.hint, 'URL or path to an HTML file');

    // The opening question comes from the skill's start guide.
    let seen = c.updates(sessionId).length;
    let res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/start' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.match(textOf(c.updates(sessionId).slice(seen)), /Is this a site that already exists, or are we building a new one\?/);

    seen = c.updates(sessionId).length;
    res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/explain AC-01' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.match(textOf(c.updates(sessionId).slice(seen)), /AC-01 {2}All-caps label with wide letter spacing/);

    seen = c.updates(sessionId).length;
    await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/explain NOPE-01' }] });
    assert.match(textOf(c.updates(sessionId).slice(seen)), /Unknown rule: NOPE-01/);

    // A relative path is read from the session's cwd. The browser run shows as a tool call, then the findings as text.
    seen = c.updates(sessionId).length;
    res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/diagnose csp.html' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    const turn = c.updates(sessionId).slice(seen);
    const kinds = turn.map((u) => u.sessionUpdate);
    const call = turn.find((u) => u.sessionUpdate === 'tool_call');
    assert.ok(call, 'no tool_call');
    assert.equal(call.kind, 'fetch');
    assert.equal(call.status, 'pending');
    const done = turn.find((u) => u.sessionUpdate === 'tool_call_update' && u.status === 'completed');
    assert.ok(done, `no completed tool_call_update in ${kinds.join(',')}`);
    assert.equal(done.toolCallId, call.toolCallId);
    assert.equal(done.locations.length, 2, 'one annotated capture per width');
    assert.ok(kinds.indexOf('tool_call') < kinds.lastIndexOf('agent_message_chunk'), 'findings come after the tool call');
    assert.match(textOf(turn), /AC-01 {2}All-caps label with wide letter spacing/);

    // A bad target fails the tool call and still ends the turn.
    seen = c.updates(sessionId).length;
    res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/diagnose /no/such/file.html' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.ok(c.updates(sessionId).slice(seen).some((u) => u.sessionUpdate === 'tool_call_update' && u.status === 'failed'));

    // Unknown commands and plain text get help, not an error.
    seen = c.updates(sessionId).length;
    res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/frobnicate' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.match(textOf(c.updates(sessionId).slice(seen)), /Unknown command \/frobnicate[\s\S]*\/diagnose/);
    seen = c.updates(sessionId).length;
    await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'make my site better' }] });
    assert.match(textOf(c.updates(sessionId).slice(seen)), /works best inside an agent that speaks MCP/);

    // session/cancel ends a running turn with stopReason cancelled.
    const pending = c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/diagnose csp.html' }] });
    await c.waitFor((m) => m.method === 'session/update' && m.params.update.sessionUpdate === 'tool_call' && c.messages.indexOf(m) > c.messages.indexOf(res));
    c.notify('session/cancel', { sessionId });
    assert.equal((await pending).result.stopReason, 'cancelled');

    // Negative control: malformed input gets JSON-RPC errors and the agent keeps serving.
    c.send('this is not json');
    assert.equal((await c.waitFor((m) => m.error && m.id === null)).error.code, -32700);
    assert.equal((await c.request('session/prompt', { prompt: [{ type: 'text', text: '/help' }] })).error.code, -32602);
    assert.ok((await c.request('session/prompt', { sessionId: 'no-such-session', prompt: [{ type: 'text', text: '/help' }] })).error);
    assert.equal((await c.request('no/such_method', {})).error.code, -32601);
    res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/rules' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.equal(c.child.exitCode, null);
  } finally {
    c.child.stdin.end();
    c.child.kill();
  }
});

// Editors are told to run `start.mjs acp` (it installs dependencies on first start), so that path must serve ACP too.
test('the launcher serves the ACP agent with the acp argument', { timeout: 60000 }, async () => {
  const c = start([launcherPath, 'acp']);
  try {
    const init = await c.request('initialize', { protocolVersion: 1, clientCapabilities: {} });
    assert.equal(init.result.protocolVersion, 1);
    assert.equal(init.result.agentInfo.name, 'taster');
    const session = await c.request('session/new', { cwd: fixturesDir, mcpServers: [] });
    const { sessionId } = session.result;
    const res = await c.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: '/explain AC-01' }] });
    assert.equal(res.result.stopReason, 'end_turn');
    assert.match(textOf(c.updates(sessionId)), /AC-01/);
  } finally {
    c.child.kill();
  }
});
