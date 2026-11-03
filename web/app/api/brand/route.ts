import { NextResponse } from 'next/server';
import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import { clientIp, takeToken, withGate } from '../../../lib/limits.ts';
import { PageLoadError, hostsOnly, loadFailure } from '../../../lib/diagnose.ts';
import { runBrand } from '../../../lib/brand.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  // A JSON content type forces a CORS preflight from other origins, which this route never answers.
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
  if (!token.ok) return fail(429, 'rate-limit', `too many requests, try again in ${Math.ceil(token.retryAfter / 60)} min`);
  try {
    const result = await withGate(() => runBrand(target.href));
    if (!result) return fail(503, 'busy', 'too many requests right now, try again in 20 s');
    return NextResponse.json({ source: result.source, tokens: result.tokens, notes: result.notes }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    // code load, or not-diagnosed when a bot check or an error page came back instead of the site.
    if (err instanceof PageLoadError) return NextResponse.json({ error: loadFailure(err) }, { status: 422, headers: { 'cache-control': 'no-store' } });
    console.error('brand failed', hostsOnly(String((err as Error)?.stack || err)));
    return fail(500, 'internal', 'could not read the brand because of a server error');
  }
}
