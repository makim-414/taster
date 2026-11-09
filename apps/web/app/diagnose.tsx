'use client';

import { useEffect, useRef, useState } from 'react';
import type { RuleHit, Summary } from '../lib/diagnose.ts';
import { errorText, notDiagnosedText } from '../lib/messages.ts';
import { CompareReveal } from './compare-reveal.tsx';

const INSTALL = 'npx skills add https://github.com/makim-414/taster --skill taster';
const SEVERITY: Record<RuleHit['severity'], string> = { high: '높음', medium: '중간', low: '낮음' };

type Result = { report: Summary; shots: Record<string, string>; missed?: number[] };
type Refused = { host: string; reason?: string; status?: number | null };
type State =
  | { kind: 'idle' }
  | { kind: 'running'; started: number }
  | { kind: 'error'; message: string }
  | { kind: 'not-diagnosed'; refused: Refused }
  | { kind: 'done'; result: Result };

// The address stays in the fragment (#url=...), which the browser never sends, so a reload or a shared link does not
// put it in a request line or a server log. Links made before that used ?url=, and those still open.
function addressInLocation(): string {
  const hash = new URLSearchParams(window.location.hash.slice(1)).get('url');
  return (hash ?? new URLSearchParams(window.location.search).get('url') ?? '').slice(0, 2048);
}

function keepAddress(url: string) {
  const next = new URL(window.location.href);
  next.search = '';
  next.hash = url ? new URLSearchParams({ url }).toString() : '';
  window.history.replaceState(null, '', next);
}

export function Diagnose({ ruleCount }: { ruleCount: number }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (state.kind !== 'running') return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - state.started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const kept = addressInLocation();
    if (!kept) return;
    setUrl(kept);
    if (window.location.search) keepAddress(kept);
  }, []);

  useEffect(() => {
    if (state.kind === 'done' || state.kind === 'not-diagnosed') resultRef.current?.focus();
  }, [state]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind === 'running') return;
    setElapsed(0);
    setState({ kind: 'running', started: Date.now() });
    keepAddress(url.trim());
    try {
      const res = await fetch('/api/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => null);
      const error = data?.error;
      if (error?.code === 'not-diagnosed') {
        setState({ kind: 'not-diagnosed', refused: { host: safeHost(withScheme(url.trim())), reason: error.reason, status: error.status } });
        return;
      }
      if (!res.ok || !data || !data.report) {
        setState({ kind: 'error', message: errorText(error?.code, error?.message, Number(res.headers.get('retry-after')) || undefined) });
        return;
      }
      setState({ kind: 'done', result: data });
    } catch {
      setState({ kind: 'error', message: '서버에 닿지 못했습니다. 연결을 확인해 주세요.' });
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <p className="wordmark">Taster</p>
        <p className="tagline">AI 가 자주 남기는 흔적과 화면 품질 문제를 실제 브라우저로 잽니다</p>
      </header>

      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">이 화면은 얼마나 슬롭일까요</h1>
        <p className="lede">
          주소를 넣으면 1440 폭과 390 폭으로 페이지를 열고, 규칙 {ruleCount}개 중 잴 수 있는 규칙을 모두 돌립니다. 20초쯤 걸립니다.
        </p>
        <form className="probe" onSubmit={submit}>
          <label htmlFor="target" className="visually-hidden">사이트 주소</label>
          <div className="probe-row">
            <input
              id="target"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="submit" disabled={state.kind === 'running'}>
              {state.kind === 'running' ? '여는 중' : '진단하기'}
            </button>
          </div>
          <p className="fineprint">넣은 주소와 결과를 따로 저장하지 않습니다. 열지 못한 주소는 호스트 이름만 오류 기록에 잠시 남습니다. 공개된 http, https 주소만 엽니다.</p>
          <p className="examples">
            예시로 해 보기{' '}
            <button type="button" className="example" onClick={() => setUrl(`${window.location.origin}/fixtures/slop.html`)}>
              슬롭 예시 페이지
            </button>{' '}
            <button type="button" className="example" onClick={() => setUrl(`${window.location.origin}/fixtures/clean.html`)}>
              깨끗한 예시 페이지
            </button>
          </p>
        </form>
        <p className="status" role="status" aria-live="polite">
          {state.kind === 'running' ? `페이지를 여는 중입니다. ${elapsed}초 지났습니다.` : ''}
          {state.kind === 'error' ? state.message : ''}
        </p>
      </section>

      {state.kind === 'done' ? (
        <Report result={state.result} sectionRef={resultRef} />
      ) : state.kind === 'not-diagnosed' ? (
        <NotDiagnosed refused={state.refused} sectionRef={resultRef} />
      ) : (
        <section className="sample" aria-labelledby="sample-title">
          {/* apps/web/scripts/compare/render.mjs draws both pictures from examples/rebuild, a made-up product. */}
          <h2 id="sample-title">Taster 의 재구성 예시</h2>
          <p className="sample-lede">
            저장소의 examples/rebuild 에 있는 가상의 서비스 Acme Ledger 입니다. 왼쪽은 AI 가 자주 남기는 흔적을 모아 만든 예시 페이지를 Taster 로 잰 화면으로, 빨간 테두리가 규칙에 걸린 곳입니다. 오른쪽은 Taster 가 같은 내용을 규칙대로 다시 지은 판입니다. 가운데 선을 좌우로 끌어 보세요.
          </p>
          <CompareReveal
            label="Taster 재구성 예시의 고치기 전과 다시 지은 판 비교"
            before={{ src: '/compare/before.jpg', alt: 'Acme Ledger 예시 페이지의 첫 화면. 보라 그라디언트 바탕, 이모지가 든 알약 공지, 대문자 넓은 자간 머리말, 그라디언트 글자와 이탤릭 세리프 한 단어가 섞인 제목, 엠대시 문장, 빛 번짐 버튼, 이모지 타일 카드 세 장과 틴트 알약 배지. 걸린 요소마다 빨간 테두리' }}
            after={{ src: '/compare/after.jpg', alt: '같은 내용을 다시 지은 첫 화면. 어두운 바탕에 왼쪽 정렬 제목과 설명, 버튼 하나와 글자 링크, 아이콘 카드 대신 선으로 나눈 기능 목록' }}
          />
          <div className="sample-captions">
            <p>고치기 전, before.html</p>
            <p>다시 지은 판, after.html</p>
          </div>
        </section>
      )}

      <section className="install" aria-labelledby="install-title">
        <h2 id="install-title">Taster 로 고치기</h2>
        <p>
          코딩 에이전트에 Taster 를 넣고 &ldquo;이 사이트 슬롭 고쳐줘&rdquo;라고 하면, 걸린 규칙마다 적힌 패턴으로 바꿉니다. 새로 지을 때도 같은 규칙으로 짓습니다.
        </p>
        <CopyLine text={INSTALL} />
      </section>

      <footer className="colophon">
        <p>
          검사기는 저장소의 rules/detect.js 하나이고, 이 화면도 같은 검사기로 잽니다. 보고 있는 페이지에서 바로 재려면{' '}
          <a href="/bookmarklet">북마클릿과 확장</a>을 쓰세요. 고칠 때 쓰는 부품은 <a href="/components">부품 갤러리</a>에 있습니다. MIT
          라이선스, 소스는 <a href="https://github.com/makim-414/taster">GitHub 저장소</a>에 있습니다.
        </p>
        <p>
          이 사이트에는 분석 스크립트와 쿠키가 없습니다. 갤러리에서 고른 설정은 이 브라우저 안(<code>localStorage</code>)에만 남고, 속도
          제한에 쓰는 IP 주소는 서버 메모리에만 있다가 서버가 다시 뜨면 사라집니다. 호스팅을 맡은 Vercel 이 남기는 요청 기록은 Vercel 의
          정책을 따릅니다.
        </p>
      </footer>
    </main>
  );
}

function Report({ result, sectionRef }: { result: Result; sectionRef: React.RefObject<HTMLElement | null> }) {
  const { report, shots } = result;
  const host = safeHost(report.url);
  const missed = result.missed ?? [];
  const noShot = report.widths.filter((w) => !shots[w]);
  return (
    <section className="report" aria-labelledby="report-title" tabIndex={-1} ref={sectionRef}>
      <h2 id="report-title">{host} 진단 결과</h2>
      <p className="verdict">
        {report.rulesHit === 0
          ? `잴 수 있는 규칙 ${report.measured}개에 하나도 걸리지 않았습니다.`
          : `잴 수 있는 규칙 ${report.measured}개 중 ${report.rulesHit}개에 걸렸습니다.`}
      </p>
      {report.rulesHit ? <p className="report-note">규칙 하나에 걸렸다고 AI 가 만들었다는 뜻은 아닙니다.</p> : null}
      {missed.length || noShot.length ? (
        <p className="report-note">
          {missed.length ? `${missed.join(', ')} 폭은 시간 안에 다 열지 못해, ${report.widths.join(', ')} 폭에서 잰 결과만 보여 줍니다. ` : ''}
          {noShot.length ? `${noShot.join(', ')} 폭은 화면이 그려지지 않아 캡처가 빠졌습니다.` : ''}
        </p>
      ) : null}

      <div className="shots">
        {report.widths.map((w) =>
          shots[w] ? (
            <figure key={w} className={w >= 1000 ? 'shot shot-wide' : 'shot shot-narrow'}>
              <figcaption>{w} 폭, 빨간 테두리가 걸린 곳</figcaption>
              <div className="shot-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shots[w]} alt={`${host} 를 ${w} 폭으로 연 화면, 걸린 요소에 테두리 표시`} width={w} />
              </div>
            </figure>
          ) : null,
        )}
      </div>

      {report.rules.length ? (
        <ol className="hits">
          {report.rules.map((r) => (
            <li key={r.ruleId} className="hit">
              <p className="hit-head">
                <code>{r.ruleId}</code>
                <span className="hit-name">{r.name}</span>
              </p>
              <p className="hit-meta">
                {report.widths.map((w) => `${w} 폭 ${r.counts[w] ?? 0}곳`).join(', ')}, 심각도 {SEVERITY[r.severity]}
              </p>
              {r.fix_patterns.length ? (
                <p className="hit-fix">
                  고치는 패턴{' '}
                  {r.fix_patterns.map((p, i) => (
                    <span key={p}>
                      {i ? ', ' : ''}
                      <code>{p}</code>
                    </span>
                  ))}
                </p>
              ) : null}
              <details className="hit-where">
                <summary>어디서 걸렸나</summary>
                <p className="hit-advice">{r.fix}</p>
                <ul>
                  {r.findings.map((f) => (
                    <li key={`${f.width}-${f.selector}`}>
                      <code>{f.selector}</code>
                      {typeof f.evidence === 'string' ? <code className="hit-evidence">{f.evidence}</code> : null}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="byeye">
        눈으로 봐야 하는 규칙 {report.judgeByEye.length}개는 재지 않았습니다: {report.judgeByEye.join(', ')}
      </p>
    </section>
  );
}

// A bot check, a block or error page came back instead of the site. Nothing was measured, so there is no picture and no
// list: the answer is only that, and why.
function NotDiagnosed({ refused, sectionRef }: { refused: Refused; sectionRef: React.RefObject<HTMLElement | null> }) {
  return (
    <section className="report" aria-labelledby="report-title" tabIndex={-1} ref={sectionRef}>
      <h2 id="report-title">{refused.host} 는 진단하지 않았습니다</h2>
      <p className="verdict">{notDiagnosedText(refused.reason, refused.status)}</p>
      <p className="report-note">봇 확인이나 로그인 없이 열리는 주소로 다시 해 보거나, 코딩 에이전트에 Taster 를 넣고 직접 띄운 로컬 빌드를 진단하세요.</p>
    </section>
  );
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="copyline">
      {/* Scrolls sideways on a phone, so it takes focus and the arrow keys can scroll it. */}
      <pre tabIndex={0} aria-label="설치 명령">
        <code>{text}</code>
      </pre>
      <button type="button" className="copy" onClick={copy}>
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

// The same default as lib/net-guard.ts parseTarget: an address without a scheme is https.
function withScheme(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
