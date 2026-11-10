// The first screens of up to four tone references, for the tone page. Only ids from the catalog are accepted, so
// this route never opens an address a visitor typed. Pictures go back in the response; they are never written to disk, kept in server memory up to 30 minutes.
import { NextResponse } from 'next/server';
import catalog from '../../../../../data/taxonomy/tone-refs.json';
import { NEED_MS, clientIp, gateBudget, takeShotCeiling, takeShotToken, withGate } from '../../../lib/limits.ts';
import { allKept, captureShots } from '../../../lib/tone-shot.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const URLS = new Map(catalog.refs.map((r) => [r.id, r.url]));

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const started = Date.now();
  // A JSON content type forces a CORS preflight from other origins, which this route never answers.
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return fail(415, 'content-type', '요청 형식이 맞지 않습니다.');
  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'invalid', '요청 형식이 맞지 않습니다.');
  }
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(String))] : [];
  if (!ids.length || ids.length > 4 || ids.some((id) => !URLS.has(id))) return fail(400, 'ids', '레퍼런스는 목록에 있는 것만 네 개까지 열 수 있습니다.');
  const targets = ids.map((id) => ({ id, url: URLS.get(id)! }));
  if (!allKept(targets)) {
    const token = takeShotToken(clientIp(request.headers));
    if (!token.ok) return fail(429, 'rate-limit', `화면을 너무 자주 열었습니다. ${Math.ceil(token.retryAfter / 60)}분 뒤에 다시 열립니다.`);
    if (!takeShotCeiling()) return fail(503, 'busy', '지금 화면을 여는 요청이 많습니다. 1분 뒤에 다시 해 주세요.');
  }
  try {
    // The wait for the browser and the capture share the time limit: the capture gets what the wait left.
    const shots = allKept(targets) ? await captureShots(targets) : await withGate((leftMs) => captureShots(targets, { deadlineMs: leftMs }), { budgetMs: gateBudget(maxDuration, started), needMs: NEED_MS.shots });
    if (!shots) return fail(503, 'busy', '지금 요청이 몰려 있습니다. 조금 뒤에 다시 해 주세요.');
    return NextResponse.json({ shots }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('tone shots failed', err);
    return fail(500, 'internal', '화면을 열지 못했습니다.');
  }
}
