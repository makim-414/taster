// Hosted Taster MCP (Streamable HTTP, stateless). Agents add https://taster-six.vercel.app/api/mcp as a remote
// MCP server and get the local one's tools except extract_content and the design system and screen plan tools, which
// need a local browser or local files. The engine's http.mjs builds the server; this route supplies diagnose, brand and the tone references' first screens, which go
// through the same fence as /api/diagnose and /api/brand: public http(s) URLs, the request budget in lib/browser.ts, a
// per-IP window and one browser at a time. It also takes one JSON-RPC message per POST (a batch is refused), counts
// every tool call against a per-IP minute and sends at most 4 MB back (lib/limits.ts).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import {
  NEED_MS,
  capAnswer,
  clientIp,
  gateBudget,
  mcpError,
  takeBrowserCeiling,
  takeCallCeiling,
  takeCallToken,
  takeShotCeiling,
  takeShotToken,
  takeToken,
  withGate,
} from '../../../lib/limits.ts';
import { PageLoadError, runDiagnosis, trimReport } from '../../../lib/diagnose.ts';
import { runBrand } from '../../../lib/brand.ts';
import { allKept, captureShots, type Shot } from '../../../lib/tone-shot.ts';
import catalog from '../../../../taxonomy/tone-refs.json' with { type: 'json' };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type Remote = {
  diagnose: (url: string) => Promise<{ report: unknown; shots?: Record<string, string> }>;
  brand: (url: string) => Promise<unknown>;
  tone: (ids: string[]) => Promise<Record<string, Shot>>;
};
const TONE_URLS = new Map(catalog.refs.map((r) => [r.id, r.url]));
type Http = { handleMcpRequest: (request: Request, options: { remote: Remote }) => Promise<Response> };

// Loaded at run time from the repository, like engine/diagnose.mjs in lib/diagnose.ts, so the server keeps
// reading rules, patterns, taxonomy and registry files next to itself.
let httpPromise: Promise<Http> | null = null;
function loadHttp(): Promise<Http> {
  const candidates = [
    process.env.TASTER_ENGINE ? path.join(path.dirname(process.env.TASTER_ENGINE), 'http.mjs') : '',
    path.resolve(process.cwd(), '../engine/http.mjs'),
    path.resolve(process.cwd(), 'engine/http.mjs'),
    '/var/task/engine/http.mjs',
  ].filter(Boolean);
  const found = candidates.find((c) => existsSync(c));
  if (!found) return Promise.reject(new Error(`engine/http.mjs not found (looked in ${candidates.join(', ')})`));
  httpPromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(found).href) as Promise<Http>;
  return httpPromise;
}

// The wait for the browser and the run share the route's time limit, counted from when the request came in: each run
// gets what the wait left, and a call that would start with too little is busy at once.
function remoteFor(ip: string, started: number): Remote {
  const gate = <T,>(run: (leftMs: number) => Promise<T>, needMs: number) => withGate(run, { budgetMs: gateBudget(maxDuration, started), needMs });
  return {
    async brand(url: string) {
      let target: URL;
      try {
        target = parseTarget(String(url ?? ''));
        await resolvePublic(bareHost(target));
      } catch (err) {
        if (err instanceof BlockedError) throw new Error(`${err.code}: ${err.message}`);
        throw err;
      }
      const token = takeToken(ip);
      if (!token.ok) throw new Error(`rate-limit: try again in ${Math.ceil(token.retryAfter / 60)} min`);
      if (!takeBrowserCeiling()) throw new Error('busy: too many pages are being opened right now, try again in 1 min');
      try {
        const result = await gate((leftMs) => runBrand(target.href, { deadlineMs: leftMs }), NEED_MS.brand);
        if (!result) throw new Error('busy: too many requests right now, try again in 20 s');
        return result;
      } catch (err) {
        if (err instanceof PageLoadError) throw new Error(`load: ${err.message}`);
        throw err;
      }
    },
    // Reference first screens for pick_tone: catalog ids only, the same fence, window and gate as the tone page.
    async tone(ids: string[]) {
      const targets = ids.filter((id) => TONE_URLS.has(id)).slice(0, 6).map((id) => ({ id, url: TONE_URLS.get(id)! }));
      if (!allKept(targets) && (!takeShotToken(ip).ok || !takeShotCeiling())) return Object.fromEntries(targets.map((t) => [t.id, { status: 'busy' } as Shot]));
      const shots = allKept(targets) ? await captureShots(targets) : await gate((leftMs) => captureShots(targets, { deadlineMs: leftMs }), NEED_MS.shots);
      return shots || Object.fromEntries(targets.map((t) => [t.id, { status: 'busy' } as Shot]));
    },
    async diagnose(url: string) {
      let target: URL;
      try {
        target = parseTarget(String(url ?? ''));
        await resolvePublic(bareHost(target));
      } catch (err) {
        if (err instanceof BlockedError) throw new Error(`${err.code}: ${err.message}`);
        throw err;
      }
      const token = takeToken(ip);
      if (!token.ok) throw new Error(`rate-limit: try again in ${Math.ceil(token.retryAfter / 60)} min`);
      if (!takeBrowserCeiling()) throw new Error('busy: too many pages are being opened right now, try again in 1 min');
      try {
        const result = await gate((leftMs) => runDiagnosis(target.href, { deadlineMs: leftMs }), NEED_MS.diagnose);
        if (!result) throw new Error('busy: too many diagnoses right now, try again in 20 s');
        return { report: trimReport(result.report), shots: result.shots };
      } catch (err) {
        // NotDiagnosedError is a PageLoadError, so a page that is not the site reaches the agent as "load: not
        // diagnosed: ...", which engine/server.mjs answers as not diagnosed.
        if (err instanceof PageLoadError) throw new Error(`load: ${err.message}`);
        throw err;
      }
    },
  };
}

async function handle(request: Request): Promise<Response> {
  const started = Date.now();
  const ip = clientIp(request.headers);
  let id: unknown = null;
  if (request.method === 'POST') {
    // Read a copy, so the transport still gets the body; it answers a body that is not JSON itself.
    let message: unknown;
    try {
      message = JSON.parse(await request.clone().text());
    } catch {
      message = null;
    }
    // A batch would run many calls, each with a big answer, for one small request.
    if (Array.isArray(message)) return mcpError(null, -32600, 'Invalid Request: batches are not accepted, send one JSON-RPC message per POST.', 400);
    const { id: messageId, method } = (message && typeof message === 'object' ? message : {}) as { id?: unknown; method?: unknown };
    id = messageId ?? null;
    if (method === 'tools/call') {
      const token = takeCallToken(ip);
      if (!token.ok) return mcpError(id, -32000, `rate-limit: more than 60 tool calls a minute from this client, try again in ${token.retryAfter} s`, 429, { 'retry-after': String(token.retryAfter) });
      if (!takeCallCeiling()) return mcpError(id, -32000, 'busy: too many tool calls right now, try again in 1 min', 503, { 'retry-after': '60' });
    }
  }
  try {
    const { handleMcpRequest } = await loadHttp();
    return await capAnswer(await handleMcpRequest(request, { remote: remoteFor(ip, started) }), id);
  } catch (err) {
    console.error('mcp failed', err);
    return mcpError(null, -32603, 'Internal error', 500);
  }
}

export const POST = handle;
// Stateless: engine/http.mjs answers GET (no event stream to open) and DELETE (no session to end) with 405.
export const GET = handle;
export const DELETE = handle;
