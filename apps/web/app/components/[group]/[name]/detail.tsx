'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { CopyButton } from '../../copy-button';
import { CLONE_LINE, TAILWIND_CONFIG, TAILWIND_V4 } from '../../../../lib/install';
import { LookBar } from '../../look-bar';
import type { Lang } from '../../../../lib/catalog';
import { LiveFrame, MAX_PICKS, useStudio } from '../../studio';

const WIDTHS = [{ id: 'fill', label: '넓게', px: 0 }, { id: 'tablet', label: '태블릿', px: 768 }, { id: 'phone', label: '휴대폰', px: 390 }];

// kind and summary come from the repository's English data, so they carry their own lang on these Korean pages.
export function Detail({ id, name, kind, kindLang, summary, summaryLang, install, children }: { id: string; name: string; kind: string; kindLang: Lang; summary: string; summaryLang: Lang; install: string; children: ReactNode }) {
  const { look, ready, picks, togglePick } = useStudio();
  const [width, setWidth] = useState('fill');
  const [height, setHeight] = useState(480);
  const px = WIDTHS.find((w) => w.id === width)!.px;
  const picked = picks.includes(id);
  return (
    <>
      <nav className="crumb" aria-label="위치"><Link href="/components">부품 갤러리</Link><span aria-hidden="true"> / </span><span>{name}</span></nav>
      <header className="detail-head">
        <div>
          <h1>{name}</h1>
          {kind !== name && <p className="card-kind" lang={kindLang}>{kind}</p>}
          {summary && <p className="detail-summary" lang={summaryLang}>{summary}</p>}
        </div>
        <button type="button" className="button" aria-pressed={picked} disabled={!picked && picks.length >= MAX_PICKS} onClick={() => togglePick(id)}>{picked ? '담음' : '비교에 담기'}</button>
      </header>
      <LookBar />
      <div className="seg stage-widths" role="group" aria-label="보는 폭">
        {WIDTHS.map((w) => <button key={w.id} type="button" className="seg-item" aria-pressed={width === w.id} onClick={() => setWidth(w.id)}>{w.label}</button>)}
      </div>
      <div className="stage-box">
        <div className="stage-inner" style={{ maxWidth: px ? `${px}px` : undefined, height: Math.max(height, 420) }}>
          {ready && <LiveFrame id={id} look={look} title={`${name} 실행 화면`} onHeight={setHeight} />}
        </div>
      </div>
      <p className="stage-hint">실제로 돌아가는 부품입니다. 눌러 보고 입력해 보세요.</p>
      <section className="install-box" aria-labelledby="install-title">
        <h2 id="install-title">내 앱에 넣기</h2>
        <ol className="install-steps">
          <li>
            <p>아직 npm 패키지가 없어서 Taster 리포를 받아 그 안의 명령을 씁니다. 내 앱 폴더가 들어 있는 폴더에서 한 번만 받습니다.</p>
            <div className="code-line"><code>{CLONE_LINE}</code><CopyButton text={CLONE_LINE} /></div>
          </li>
          <li>
            <p>내 앱 폴더에서 이 부품을 넣습니다. 부품 파일과 토큰 파일이 <code>src/components/taster</code> 에 들어갑니다.</p>
            <div className="code-line"><code>{install}</code><CopyButton text={install} /></div>
          </li>
          <li>
            <p>부품은 Tailwind 클래스로 그리고, Taster 프리셋이 그 클래스를 토큰에 연결합니다. Tailwind CSS 를 설치하고, <code>tokens.css</code> 를 앱 루트에서 한 번 불러온 뒤, 앱 루트에 이 설정을 둡니다. 프리셋이 없으면 빌드는 되어도 부품이 스타일 없이 나옵니다.</p>
            <div className="code-block"><pre><code>{TAILWIND_CONFIG}</code></pre><CopyButton text={TAILWIND_CONFIG} /></div>
            <p>Tailwind v3 는 이 파일을 그대로 읽습니다. v4 는 Tailwind 를 불러오는 <code>src/</code> 의 스타일시트 맨 위에 이 두 줄을 넣습니다.</p>
            <div className="code-block"><pre><code>{TAILWIND_V4}</code></pre><CopyButton text={TAILWIND_V4} /></div>
            <p><code>tokens.css</code> 는 <code>:root</code> 에 <code>--bg</code>, <code>--text</code>, <code>--border</code>, <code>--accent</code> 를 정의합니다. 내 앱의 스타일시트가 같은 이름을 뒤에서 다시 정의하면 그쪽 색이 이깁니다. 새 Vite 앱의 스타터 CSS 처럼 그런 변수가 있으면 지우거나 이름을 바꾸세요.</p>
          </li>
        </ol>
      </section>
      {children}
    </>
  );
}
