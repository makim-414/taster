import { NextResponse } from 'next/server';
import { BlockedError, bareHost, parseTarget, resolvePublic } from '../../../lib/net-guard.ts';
import { clientIp, takeToken, withGate } from '../../../lib/limits.ts';
import { PageLoadError, runDiagnosis, trimReport } from '../../../lib/diagnose.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

function fail(status: number, code: string, message: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store', ...extra } });
}

export async function POST(request: Request) {
  // A JSON content type forces a CORS preflight from other origins, which this route never
  // answers, so other sites cannot use it from their visitors' browsers.
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return fail(415, 'content-type', 'JSON 으로 보내 주세요.');
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
  if (!token.ok) return fail(429, 'rate-limit', `잠시 뒤에 다시 해 주세요. (${Math.ceil(token.retryAfter / 60)}분 뒤)`, { 'retry-after': String(token.retryAfter) });

  try {
    const result = await withGate(() => runDiagnosis(target.href));
    if (!result) return fail(503, 'busy', '지금 진단이 몰려 있습니다. 조금 뒤에 다시 해 주세요.', { 'retry-after': '20' });
    return NextResponse.json({ report: trimReport(result.report), shots: result.shots }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    if (err instanceof PageLoadError) return fail(422, 'load', err.message);
    console.error('diagnose failed', err);
    return fail(500, 'internal', '진단 중에 문제가 생겼습니다.');
  }
}
