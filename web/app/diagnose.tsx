'use client';

import { useEffect, useRef, useState } from 'react';
import type { RuleHit, Summary } from '../lib/diagnose.ts';
import { CompareReveal } from './compare-reveal.tsx';

const INSTALL = 'npx skills add https://github.com/makim-414/taster --skill taster';
const SEVERITY: Record<RuleHit['severity'], string> = { high: '높음', medium: '중간', low: '낮음' };

type Result = { report: Summary; shots: Record<string, string>; missed?: number[] };
type State = { kind: 'idle' } | { kind: 'running'; started: number } | { kind: 'error'; message: string } | { kind: 'done'; result: Result };

export function Diagnose({ initialUrl, ruleCount }: { initialUrl: string; ruleCount: number }) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (state.kind !== 'running') return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - state.started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state.kind === 'done') resultRef.current?.focus();
  }, [state]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind === 'running') return;
    setElapsed(0);
    setState({ kind: 'running', started: Date.now() });
    const next = new URL(window.location.href);
    next.searchParams.set('url', url.trim());
    window.history.replaceState(null, '', next);
    try {
      const res = await fetch('/api/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.report) {
        setState({ kind: 'error', message: data?.error?.message || '진단하지 못했습니다. 잠시 뒤에 다시 해 주세요.' });
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
        <p className="tagline">AI 가 만든 웹 화면의 흔적을 실제 브라우저로 잽니다</p>
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
          <p className="fineprint">넣은 주소와 결과는 저장하지 않습니다. 공개된 http, https 주소만 엽니다.</p>
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
      ) : (
        <section className="sample" aria-labelledby="sample-title">
          <h2 id="sample-title">AI 가 그대로 만든 판과 실제 사이트</h2>
          <p className="sample-lede">같은 첫 화면입니다. 왼쪽은 AI 가 그대로 만든 판에 걸린 규칙 이름을 붙인 것, 오른쪽은 사람이 다듬은 실제 사이트입니다. 가운데 선을 좌우로 끌어 보세요.</p>
          <CompareReveal
            label="AI 가 그대로 만든 판과 실제 사이트 비교"
            before={{ src: '/compare/before.jpg', alt: 'AI 가 그대로 만든 Prompt Architect 첫 화면. 이모지, 대문자 넓은 자간, 그라디언트 글자, 엠대시, 빛 번짐 버튼, 틴트 알약 배지, 유리 카드에 빨간 이름표' }}
            after={{ src: '/compare/after.jpg', alt: '사람이 다듬은 Prompt Architect 실제 첫 화면. 흰 글자 제목과 흰 버튼 하나, 입자 구 배경' }}
          />
          <div className="sample-captions">
            <p>AI 가 그대로 만든 판</p>
            <p>실제 사이트</p>
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
          검사기는 저장소의 rules/detect.js 하나입니다. 이 화면도 같은 검사기로 잽니다. MIT 라이선스,{' '}
          <a href="https://github.com/makim-414/taster">GitHub 저장소</a>.
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
                      {typeof f.evidence === 'string' ? <span className="hit-evidence">{f.evidence}</span> : null}
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
      <pre>
        <code>{text}</code>
      </pre>
      <button type="button" className="copy" onClick={copy}>
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
