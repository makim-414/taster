import { NextResponse } from 'next/server';
import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import { clientIp, takeToken, withGate } from '../../../lib/limits.ts';
import { PageLoadError } from '../../../lib/diagnose.ts';
import { runBrand } from '../../../lib/brand.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  // A JSON content type forces a CORS preflight from other origins, which this route never answers.
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return fail(415, 'content-type', '요청 형식이 맞지 않습니다.');
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'invalid', '요청 형식이 맞지 않습니다.');
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
  if (!token.ok) return fail(429, 'rate-limit', `잠시 뒤에 다시 해 주세요. (${Math.ceil(token.retryAfter / 60)}분 뒤)`);
  try {
    const result = await withGate(() => runBrand(target.href));
    if (!result) return fail(503, 'busy', '지금 요청이 몰려 있습니다. 조금 뒤에 다시 해 주세요.');
    return NextResponse.json({ source: result.source, tokens: result.tokens, notes: result.notes }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    if (err instanceof PageLoadError) return fail(422, 'load', err.message);
    console.error('brand failed', err);
    return fail(500, 'internal', '브랜드를 읽지 못했습니다.');
  }
}
