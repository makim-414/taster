// Hosted Taster MCP (Streamable HTTP, stateless). Agents add https://taster-six.vercel.app/api/mcp as a remote
// MCP server and get the same tools as the local one, minus the two that read local files. The engine's
// http.mjs builds the server; this route only supplies diagnose, which goes through the same fence as
// /api/diagnose: public http(s) URLs, the request budget in lib/browser.ts, a per-IP window and one browser at a time.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import { clientIp, takeToken, withGate } from '../../../lib/limits.ts';
import { PageLoadError, runDiagnosis, trimReport } from '../../../lib/diagnose.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type Remote = { diagnose: (url: string) => Promise<{ report: unknown; shots?: Record<string, string> }> };
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

function remoteFor(request: Request): Remote {
  const ip = clientIp(request.headers);
  return {
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
      try {
        const result = await withGate(() => runDiagnosis(target.href));
        if (!result) throw new Error('busy: too many diagnoses right now, try again in 20 s');
        return { report: trimReport(result.report), shots: result.shots };
      } catch (err) {
        if (err instanceof PageLoadError) throw new Error(`load: ${err.message}`);
        throw err;
      }
    },
  };
}

async function handle(request: Request): Promise<Response> {
  try {
    const { handleMcpRequest } = await loadHttp();
    const res = await handleMcpRequest(request, { remote: remoteFor(request) });
    res.headers.set('cache-control', 'no-store');
    return res;
  } catch (err) {
    console.error('mcp failed', err);
    return Response.json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}

export const POST = handle;
// Stateless mode: the transport answers GET (no event stream) and DELETE (no session) with 405 itself.
export const GET = handle;
export const DELETE = handle;
