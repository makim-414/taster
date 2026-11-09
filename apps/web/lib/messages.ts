// The API routes and the hosted MCP answer with a stable code and a plain English sentence. The home page is in Korean,
// so it words each code itself; a code it does not know yet shows the API's own sentence. No server imports here: the
// home page runs this in the browser, and test/not-diagnosed.test.ts reads it under Node.

const TEXT: Record<string, string> = {
  // lib/net-guard.ts
  empty: '주소를 넣어 주세요.',
  'too-long': '주소가 너무 깁니다.',
  invalid: '주소 형식이 아닙니다.',
  scheme: 'http 와 https 주소만 열 수 있습니다.',
  credentials: '아이디나 비밀번호가 든 주소는 열지 않습니다.',
  port: '80, 443, 8080, 8443 포트만 열 수 있습니다.',
  private: '내부망 주소는 열 수 없습니다.',
  dns: '주소를 찾을 수 없습니다.',
  // app/api/diagnose/route.ts
  'content-type': '요청 형식이 맞지 않습니다.',
  busy: '지금 진단이 몰려 있습니다. 조금 뒤에 다시 해 주세요.',
  internal: '진단 중에 문제가 생겼습니다.',
};

/** The home's sentence for an error answer. retryAfter is the retry-after header in seconds, when there is one. */
export function errorText(code: string | undefined, message: string | undefined, retryAfter?: number): string {
  if (code === 'rate-limit') return `잠시 뒤에 다시 해 주세요.${retryAfter ? ` (${Math.ceil(retryAfter / 60)}분 뒤)` : ''}`;
  // A page that did not open: the browser's own reason (net::ERR_..., a timeout) stays as it came.
  if (code === 'load') return `페이지를 열지 못했습니다.${message ? ` (${message})` : ''}`;
  return (code && TEXT[code]) || message || '진단하지 못했습니다. 잠시 뒤에 다시 해 주세요.';
}

const HTTP_ERROR: Record<number, string> = { 401: '로그인·보호', 403: '접근 거부', 404: '찾을 수 없음', 407: '로그인·보호', 410: '찾을 수 없음', 429: '요청 제한' };

/**
 * What the home says for a not-diagnosed answer (packages/engine/blocked.mjs classifyLoad's reason and the HTTP status): the
 * page that came back is not the site, Taster does not get past it, and none of it is about that site.
 */
export function notDiagnosedText(reason: string | undefined, status: number | null | undefined): string {
  const code = status ? `HTTP ${status}` : '';
  const named = (kind: string, ...details: string[]) => {
    const inside = [...details, code].filter(Boolean).join(', ');
    return `${kind}${inside ? `(${inside})` : ''}`;
  };
  const page =
    reason === 'bot-check'
      ? named('차단 화면', '봇 확인')
      : reason === 'block-page'
        ? named('차단 화면')
        : reason === 'http-error'
          ? named('오류 화면', status && status >= 500 ? '서버 오류' : (status && HTTP_ERROR[status]) || '')
          : reason === 'sign-in'
            ? named('다른 주소의 로그인 화면')
            : named('사이트가 아닌 화면');
  return `사이트가 아니라 ${page}을 받았습니다. 우회하지 않으므로 진단하지 않았고, 이 결과는 그 사이트의 AI 티가 아닙니다.`;
}
