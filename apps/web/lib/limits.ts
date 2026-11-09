// Per-instance guards for the routes that open other sites in Chromium (/api/diagnose, /api/brand, /api/tone-shot) and
// the hosted MCP server (/api/mcp). Per client, one IPv4 address or one IPv6 /64: 6 diagnoses and brand reads and 20
// reference screen calls per ten minutes, and 60 MCP tool calls a minute. Across every client: 12 diagnoses and brand
// reads, 12 reference screen calls and 300 MCP tool calls a minute. One Chromium at a time with two waiting, and a wait
// never runs past the route's time limit. State lives in memory, so it resets with the instance and each instance
// counts on its own; only a platform firewall rule in front counts across instances.
import ipaddr from 'ipaddr.js';

const WINDOW_MS = 10 * 60 * 1000;

/** A sliding window of `perIp` calls per `windowMs` (ten minutes unless given), with its own memory. */
export function createWindow(perIp: number, windowMs = WINDOW_MS) {
  const hits = new Map<string, number[]>();
  return function take(ip: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= perIp) {
      hits.set(ip, recent);
      return { ok: false, retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return { ok: true, retryAfter: 0 };
  };
}

// Diagnoses and brand reads: six per ten minutes.
export const takeToken = createWindow(6);
// Reference first screens for the tone page: one call opens up to four sites, and moving the spot asks again.
export const takeShotToken = createWindow(20);
// Hosted MCP tool calls of every kind, so the tools that open no browser cannot be called without end either.
export const takeCallToken = createWindow(60, 60_000);

/** A ceiling across every caller: at most `perMinute` calls in any sixty seconds on this instance. */
export function createCeiling(perMinute: number) {
  let recent: number[] = [];
  return function take(now = Date.now()): boolean {
    recent = recent.filter((t) => now - t < 60_000);
    if (recent.length >= perMinute) return false;
    recent.push(now);
    return true;
  };
}

// However many visitors there are, one instance opens a browser for at most 12 diagnoses and brand reads a minute,
// opens third party sites for at most 12 capture calls a minute, and answers at most 300 MCP tool calls a minute.
export const takeBrowserCeiling = createCeiling(12);
export const takeShotCeiling = createCeiling(12);
export const takeCallCeiling = createCeiling(300);

// One client is one IPv4 address or one IPv6 /64. A host is usually handed a whole /64, so counting each address in it
// apart would give it a new window for every address it picks.
export function clientIp(headers: Headers): string {
  const raw = headers.get('x-real-ip') || (headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (!raw) return 'unknown';
  if (!ipaddr.isValid(raw)) return raw.slice(0, 64);
  let ip = ipaddr.parse(raw);
  if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
  if (ip.kind() === 'ipv4') return ip.toString();
  return `${(ip as ipaddr.IPv6).parts.slice(0, 4).map((p) => p.toString(16)).join(':')}::/64`;
}

// The least time worth opening a browser for: one width of a diagnosis (a 15 s load and the capture), one brand read
// (a 25 s load and the reading), one round of reference screens. With less left, the call is busy at once instead of
// failing at the route's time limit.
export const NEED_MS = { diagnose: 35_000, brand: 30_000, shots: 20_000 } as const;
// Kept back from a route's time limit for closing the browser (up to 5 s) and sending the answer.
const MARGIN_MS = 10_000;

/** What a route that started at `started` and may run `maxDuration` seconds still has for waiting and running. */
export function gateBudget(maxDuration: number, started: number, now = Date.now()): number {
  return maxDuration * 1000 - MARGIN_MS - (now - started);
}

const MAX_WAITING = 2;
let running = false;
const queue: (() => void)[] = [];

/**
 * Run `fn` once this instance's one Chromium is free, handing it what is left of `budgetMs` to use as its deadline.
 * Null (answer 503 busy) when two calls are already waiting, or when less than `needMs` would be left by its turn: a
 * waiting call leaves the queue as soon as that is so, instead of waiting out the route's time limit.
 */
export async function withGate<T>(fn: (leftMs: number) => Promise<T>, { budgetMs, needMs = 0 }: { budgetMs: number; needMs?: number }): Promise<T | null> {
  const joined = Date.now();
  if (budgetMs < needMs) return null;
  if (running) {
    if (queue.length >= MAX_WAITING) return null;
    const turn = await new Promise<boolean>((resolve) => {
      const go = () => {
        clearTimeout(timer);
        resolve(true);
      };
      const timer = setTimeout(() => {
        const i = queue.indexOf(go);
        if (i >= 0) queue.splice(i, 1);
        resolve(false);
      }, budgetMs - needMs);
      queue.push(go);
    });
    if (!turn) return null;
  }
  running = true;
  try {
    return await fn(budgetMs - (Date.now() - joined));
  } finally {
    const next = queue.shift();
    if (next) next();
    else running = false;
  }
}

// The hosted MCP server sends at most this much in one answer. The platform cuts a response off at 4.5 MB without
// saying why, so a bigger answer becomes an error the agent can read.
export const MAX_ANSWER_BYTES = 4 * 1024 * 1024;

/** A JSON-RPC error answer for the hosted MCP route. */
export function mcpError(id: unknown, code: number, message: string, status: number, headers: Record<string, string> = {}): Response {
  return Response.json({ jsonrpc: '2.0', error: { code, message }, id: id ?? null }, { status, headers: { 'cache-control': 'no-store', ...headers } });
}

/** The MCP server's answer as it came, uncached, or past `max` bytes an error for the same call (`id`). */
export async function capAnswer(res: Response, id: unknown, max = MAX_ANSWER_BYTES): Promise<Response> {
  const body = await res.arrayBuffer();
  if (body.byteLength > max) {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
    return mcpError(id, -32000, `too-large: the answer is ${mb(body.byteLength)} MB, over the ${mb(max)} MB the hosted server sends at once. Ask for less in one call, or run the local server.`, 200);
  }
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-store');
  return new Response(body.byteLength ? body : null, { status: res.status, headers });
}
