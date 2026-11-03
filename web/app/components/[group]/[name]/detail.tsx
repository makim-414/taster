'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { CopyButton } from '../../copy-button';
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
        <div className="code-line"><code>{install}</code><CopyButton text={install} /></div>
      </section>
      {children}
    </>
  );
}
