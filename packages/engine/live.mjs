// Live events for `taster watch` (packages/engine/watch.mjs): what the tools are doing, sent to a local hub that draws
// it for people watching. No dependencies, and a no-op unless a hub is running: the hub writes a discovery file
// (discoveryFile(), mode 0600, { port, token, pid }), this module reads it on first use, asks the hub's /api/hello
// whether it is alive, and caches the answer for five seconds. With no file there is no network at all.
//
// withCall(ctx, fn) runs fn as one tool call (AsyncLocalStorage), so emit(type, data) anywhere below it, diagnose()
// included, is tagged with the agent, the call and the tool without changing any function signature. Events go out in
// order, in batches, fire and forget with a short timeout. Nothing here throws into a tool call or waits on the hub:
// a hub that is gone costs one failed request, then five quiet seconds.
//
// Envelope v1: { v, n, t, agent: { id, kind, client, label, lane }, call, tool, type, data }. The hub adds seq.
// Events carry no secrets and no file contents: URLs lose their query, hash and user info (stripUrl), long strings are
// cut, and page text comes only as short finding labels.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { basename, join } from 'node:path';

export const VERSION = 1;
export const TOKEN_HEADER = 'x-taster-token';
const CACHE_MS = 5000;
// A tool call asks quickly; a short lived process (`taster live edit`) waits longer, since its first fetch is cold.
let HELLO_MS = 400;
const POST_MS = 1500;
const MAX_QUEUE = 1000;
const BATCH = 50;

const off = () => /^(0|off|false|no)$/i.test(process.env.TASTER_LIVE || '');

/** Where the hub says where it is: os.tmpdir()/taster-live-<uid>.json, or TASTER_LIVE_FILE. */
export function discoveryFile() {
  if (process.env.TASTER_LIVE_FILE) return process.env.TASTER_LIVE_FILE;
  let who = 'user';
  try {
    who = typeof process.getuid === 'function' ? String(process.getuid()) : userInfo().username.replace(/[^\w.-]/g, '_');
  } catch {
    // no user name on this system; one shared name is still private to the file's mode
  }
  return join(tmpdir(), `taster-live-${who}.json`);
}

/** The hub's address and ingest token from a discovery file this user owns and nobody else can read, or null. */
export function readDiscovery(file = discoveryFile()) {
  try {
    const st = statSync(file);
    if (!st.isFile()) return null;
    // On POSIX the file must be this user's and private, so another account cannot point the engine at its own hub.
    if (typeof process.getuid === 'function' && (st.uid !== process.getuid() || (st.mode & 0o077) !== 0)) return null;
    const info = JSON.parse(readFileSync(file, 'utf8'));
    if (!Number.isInteger(info.port) || info.port < 1 || info.port > 65535) return null;
    if (typeof info.token !== 'string' || info.token.length < 32) return null;
    return { port: info.port, token: info.token, pid: info.pid };
  } catch {
    return null;
  }
}

// ---- the hub: found lazily, cached for CACHE_MS either way ----

let hub = { at: 0, value: null };
let finding = null;

async function find() {
  if (off()) return null;
  const info = readDiscovery();
  if (!info) return null;
  const base = `http://127.0.0.1:${info.port}`;
  try {
    const res = await fetch(`${base}/api/hello`, { signal: AbortSignal.timeout(HELLO_MS) });
    const body = await res.json();
    if (!res.ok || body?.app !== 'taster-watch' || body.v !== VERSION || (info.pid && body.pid !== info.pid)) return null;
    return { base, token: info.token };
  } catch {
    return null;
  }
}

/** The live hub ({ base, token }) or null. Cached for five seconds; with no discovery file it answers at once. */
export function probe() {
  if (Date.now() - hub.at < CACHE_MS) return Promise.resolve(hub.value);
  finding ||= find()
    .then((value) => {
      hub = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      finding = null;
    });
  return finding;
}

/** True when a hub is listening, so a caller can skip work only the viewer needs (the stage shot). */
export async function active() {
  return Boolean(await probe());
}

/** For a short lived process: how long the first /api/hello may take ({ helloMs }). */
export function configure({ helloMs } = {}) {
  if (Number.isFinite(helloMs) && helloMs > 0) HELLO_MS = helloMs;
}

/** Forget the cached hub, so the next event looks again (tests, and a hub that just started). */
export function reset() {
  hub = { at: 0, value: null };
  queue.length = 0;
}

// ---- agents, calls and lanes ----

const store = new AsyncLocalStorage();
const rand = () => randomBytes(4).toString('hex');
const processAgent = { id: `proc-${process.pid}-${rand()}`, kind: 'cli', client: null, label: basename(process.cwd()) };
const counters = new Map();
const lanes = new Map();

/** Sets who this process is when no call says otherwise: { kind, client, label, id }. */
export function setAgent(patch) {
  Object.assign(processAgent, Object.fromEntries(Object.entries(patch || {}).filter(([, v]) => v !== undefined)));
  if (patch?.kind && !patch.id) processAgent.id = `${patch.kind}-${process.pid}-${rand()}`;
  return { ...processAgent };
}
export const agentInfo = () => ({ ...processAgent });

// The lowest lane no other running call of this agent holds, so calls running side by side get their own cursor.
function takeLane(id) {
  const busy = lanes.get(id) || new Set();
  let lane = 0;
  while (busy.has(lane)) lane++;
  busy.add(lane);
  lanes.set(id, busy);
  return lane;
}
function freeLane(id, lane) {
  const busy = lanes.get(id);
  if (!busy) return;
  busy.delete(lane);
  if (!busy.size) lanes.delete(id);
}

/** The call fn runs in: { agent, call, tool }, or undefined outside withCall. */
export const current = () => store.getStore();

/**
 * Run fn as one tool call. ctx: { tool, agent?: { id, kind, client, label }, call? }; the agent defaults to this
 * process's. Returns what fn returns (a promise).
 */
export function withCall(ctx, fn) {
  const agent = { ...processAgent, ...Object.fromEntries(Object.entries(ctx?.agent || {}).filter(([, v]) => v !== undefined)) };
  agent.label = clip(agent.label, 60);
  agent.client = agent.client == null ? null : clip(agent.client, 60);
  const lane = takeLane(agent.id);
  const call = ctx?.call || `c-${rand()}${rand()}`;
  return store.run({ agent: { ...agent, lane }, call, tool: ctx?.tool || null }, async () => {
    try {
      return await fn();
    } finally {
      freeLane(agent.id, lane);
    }
  });
}

// ---- what goes out ----

const clip = (s, n) => {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 3)}...` : str;
};

/** A URL without its query, hash or user info; other strings as they are. Works on bare localhost:port forms too. */
export function stripUrl(value) {
  const s = String(value);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      u.username = '';
      u.password = '';
      u.search = '';
      u.hash = '';
      return u.href;
    } catch {
      return s.replace(/[?#].*$/s, '').replace(/\/\/[^/@]*@/, '//');
    }
  }
  if (/^[\w.-]+(:\d+)?\//.test(s) || /^(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return s.replace(/[?#].*$/s, '').replace(/^[^/@]*@/, '');
  return s;
}

/** Text with every URL in it stripped the same way (error messages name the page they failed on). */
export const stripUrls = (text) => String(text).replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()]+/gi, (u) => stripUrl(u));

// Keys whose values never leave the process, whatever a tool's arguments hold.
const SECRET_KEY = /token|secret|password|passwd|api[-_]?key|auth|cookie|session/i;

/** Tool arguments made safe to show: URLs stripped, strings cut to 200, arrays to 20, objects to 30 keys, depth 3. */
export function safeArgs(value, depth = 0) {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value ?? null;
  if (typeof value === 'string') return clip(stripUrls(stripUrl(value)), 200);
  if (depth >= 3) return Array.isArray(value) ? `[${value.length} items]` : typeof value === 'object' ? '{...}' : null;
  if (Array.isArray(value)) {
    const out = value.slice(0, 20).map((v) => safeArgs(v, depth + 1));
    if (value.length > 20) out.push(`... ${value.length - 20} more`);
    return out;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const out = {};
    for (const [k, v] of entries.slice(0, 30)) out[k] = SECRET_KEY.test(k) ? '(hidden)' : safeArgs(v, depth + 1);
    if (entries.length > 30) out['...'] = `${entries.length - 30} more keys`;
    return out;
  }
  return null;
}

const queue = [];
let sending = null;

function enqueue(item) {
  queue.push(item);
  // A hub that stopped answering must not let the queue grow without end.
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  kick();
}

// One sender at a time, so events reach the hub in the order they were emitted.
function kick() {
  if (sending) return;
  sending = drain()
    .catch(() => {})
    .finally(() => {
      sending = null;
      if (queue.length) kick();
    });
}

async function post(target, path, body, type) {
  try {
    const res = await fetch(`${target.base}${path}`, {
      method: 'POST',
      headers: { 'content-type': type, [TOKEN_HEADER]: target.token },
      body,
      signal: AbortSignal.timeout(POST_MS),
    });
    await res.arrayBuffer().catch(() => {});
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    // The hub went away or refused: drop what is queued and stay quiet for CACHE_MS.
    hub = { at: Date.now(), value: null };
    queue.length = 0;
  }
}

async function drain() {
  while (queue.length) {
    const target = await probe();
    if (!target) {
      queue.length = 0;
      return;
    }
    if (queue[0].shot) {
      const { shot } = queue.shift();
      await post(target, `/ingest/shot?id=${shot.id}`, shot.image, shot.type);
      continue;
    }
    const batch = [];
    while (queue.length && !queue[0].shot && batch.length < BATCH) batch.push(queue.shift());
    await post(target, '/ingest', JSON.stringify(batch), 'application/json');
  }
}

// A hub known to be absent (cached) means emit does nothing at all.
const knownAbsent = () => off() || (hub.at > 0 && Date.now() - hub.at < CACHE_MS && !hub.value && !finding);

/** Send one event for the current call (or this process when outside a call). Never throws. */
export function emit(type, data = {}) {
  try {
    if (knownAbsent()) return;
    const ctx = store.getStore();
    const agent = ctx?.agent || { ...processAgent, lane: 0 };
    const n = (counters.get(agent.id) || 0) + 1;
    counters.set(agent.id, n);
    enqueue({ v: VERSION, n, t: Date.now(), agent, call: ctx?.call ?? null, tool: ctx?.tool ?? null, type: String(type), data });
  } catch {
    // an event is never worth a failed tool call
  }
}

/**
 * Queue a picture (JPEG or PNG bytes) for the hub, ahead of the event that names it. Returns its id, or null when no
 * hub is listening. The hub serves it to the viewer at /shot/<id>.
 */
export function sendShot(image, type = 'image/jpeg') {
  try {
    if (knownAbsent() || !image?.length) return null;
    const id = `${Date.now().toString(36)}${rand()}${rand()}`;
    enqueue({ shot: { id, image, type } });
    return id;
  } catch {
    return null;
  }
}

/** Wait until queued events are sent, up to ms. For short lived processes (the CLI) before they exit. */
export async function flush(ms = 2000) {
  const until = Date.now() + ms;
  while ((sending || queue.length) && Date.now() < until) {
    await Promise.race([sending || Promise.resolve(), new Promise((r) => setTimeout(r, 50))]);
  }
}

/**
 * Wrap a tool handler so each run is one call: call.start with the safe arguments, then call.end with ok, ms and, on
 * failure, the first line of the error. agent() is read at call time (an MCP client's name is known only after it
 * connects). The handler's own result or error passes through unchanged.
 */
export function tracked(tool, handler, agent = () => undefined) {
  return (...rest) => {
    const args = rest.length > 1 ? rest[0] : undefined;
    return withCall({ tool, agent: agent() }, async () => {
      const started = Date.now();
      emit('call.start', { args: safeArgs(args ?? {}) });
      try {
        const result = await handler(...rest);
        const failed = Boolean(result?.isError);
        const text = failed ? result.content?.find((c) => c.type === 'text')?.text : null;
        emit('call.end', { ok: !failed, ms: Date.now() - started, ...(failed && { error: clip(stripUrls(String(text || 'failed').split('\n')[0]), 200) }) });
        return result;
      } catch (err) {
        emit('call.end', { ok: false, ms: Date.now() - started, error: clip(stripUrls(String(err?.message ?? err).split('\n')[0]), 200) });
        throw err;
      }
    });
  };
}
