import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import { NEED_MS, clientIp, gateBudget, takeBrowserCeiling, takeToken, withGate } from '../../../lib/limits.ts';
import { PageLoadError, hostsOnly, loadFailure, runDiagnosis, trimReport } from '../../../lib/diagnose.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

function fail(status: number, code: string, message: string, extra: Record<string, string> = {}) {
  return Response.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store', ...extra } });
}

export async function POST(request: Request) {
  const started = Date.now();
  // A JSON content type forces a CORS preflight from other origins, which this route never
  // answers, so other sites cannot use it from their visitors' browsers.
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return fail(415, 'content-type', 'send the request as JSON (content-type: application/json)');
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'invalid', 'the request body is not valid JSON');
  }

  let target: URL;
  try {
    target = parseTarget(String(body.url ?? ''));
    await resolvePublic(bareHost(target));
  } catch (err) {
    if (err instanceof BlockedError) return fail(400, err.code, err.message);
    throw err;
  }

  const token = takeToken(clientIp(request.headers));
  if (!token.ok) return fail(429, 'rate-limit', `too many requests, try again in ${Math.ceil(token.retryAfter / 60)} min`, { 'retry-after': String(token.retryAfter) });
  if (!takeBrowserCeiling()) return fail(503, 'busy', 'too many pages are being opened right now, try again in 1 min', { 'retry-after': '60' });

  try {
    // The wait for the browser and the diagnosis share the route's time limit: the run gets what the wait left.
    const result = await withGate((leftMs) => runDiagnosis(target.href, { deadlineMs: leftMs }), { budgetMs: gateBudget(maxDuration, started), needMs: NEED_MS.diagnose });
    if (!result) return fail(503, 'busy', 'too many diagnoses right now, try again in 20 s', { 'retry-after': '20' });
    return Response.json({ report: trimReport(result.report), shots: result.shots, missed: result.missed }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    // code load, or not-diagnosed with the reason and status when a bot check or an error page came back instead.
    if (err instanceof PageLoadError) return Response.json({ error: loadFailure(err) }, { status: 422, headers: { 'cache-control': 'no-store' } });
    console.error('diagnose failed', hostsOnly(String((err as Error)?.stack || err)));
    return fail(500, 'internal', 'the diagnosis did not finish because of a server error');
  }
}
