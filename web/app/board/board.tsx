'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CopyButton } from '../components/copy-button';
import { LookBar } from '../components/look-bar';
import { LiveFrame, useStudio } from '../components/studio';

type Item = { id: string; name: string; group: string; slug: string; categoryName: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://taster-six.vercel.app';
// Until the CLI is on npm, the add command runs from a clone of the repository (engine installed once with
// npm ci --prefix engine) and reads the files from this site, so it works from inside the visitor's own app.
const installLine = (id: string) => `node /path/to/taster/engine/cli.mjs add ${id} --from ${SITE} --dir src/components/taster`;

function Slot({ item, number, chosen, onChoose }: { item: Item; number: number; chosen: boolean; onChoose: () => void }) {
  const { look, ready } = useStudio();
  const [height, setHeight] = useState(360);
  return (
    <article className="slot" data-chosen={chosen ? '' : undefined}>
      <header className="slot-head">
        <h2><span className="slot-number">{number}</span> <Link href={`/components/${item.group}/${item.slug}`}>{item.name}</Link></h2>
        <button type="button" className="pick" aria-pressed={chosen} onClick={onChoose} aria-label={`${number}번 ${item.name} ${chosen ? '고르기 취소' : '고르기'}`}>{chosen ? '골랐음' : '이걸로'}</button>
      </header>
      <div className="slot-frame" style={{ height: Math.min(Math.max(height, 320), 640) }}>
        {ready && <LiveFrame id={item.id} look={look} title={`${item.name} 실행 화면`} onHeight={setHeight} />}
      </div>
    </article>
  );
}

export function Board({ items }: { items: Item[] }) {
  const { picks, look, brand, source, ready } = useStudio();
  const [ids, setIds] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [href, setHref] = useState('');
  // The text goes to the visitor's agent, so it follows the browser's language: Korean for Korean, English otherwise.
  const [korean, setKorean] = useState(true);
  useEffect(() => setKorean(/^ko\b/i.test(navigator.language)), []);

  // The address decides what is on the board, so an agent can hand over a link. Without one, it shows what was picked.
  useEffect(() => {
    if (!ready) return;
    const known = new Set(items.map((i) => i.id));
    const listed = (new URLSearchParams(location.search).get('ids') || '').split(',').filter((id) => known.has(id));
    setIds((listed.length ? listed : picks).slice(0, 6));
  }, [ready, items, picks]);

  useEffect(() => {
    if (!ids.length) return;
    const url = `${location.origin}/board?ids=${ids.join(',')}${brand ? `&brand=${brand.slice(1)}` : ''}&theme=${look.theme}`;
    setHref(url);
    history.replaceState(null, '', url);
  }, [ids, brand, look.theme]);

  const shown = ids.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const message = !chosen.length
    ? ''
    : korean
      ? `Taster 비교 보드에서 ${chosen.map((id) => `${ids.indexOf(id) + 1}번 ${id}`).join(', ')} 를 골랐어. ${look.theme === 'dark' ? '어두운' : '밝은'} 테마${brand ? `, 브랜드 색 ${brand}` : ''}${source ? ` (${source} 에서 읽음)` : ''}. 이걸로 넣어 줘.`
      : `I picked ${chosen.map((id) => `#${ids.indexOf(id) + 1} ${id}`).join(', ')} on the Taster board. ${look.theme === 'dark' ? 'Dark' : 'Light'} theme${brand ? `, brand color ${brand}` : ''}${source ? ` (read from ${source})` : ''}. Put ${chosen.length > 1 ? 'them' : 'it'} in.`;

  return (
    <div className="page gallery-page board-page">
      <header className="masthead">
        <p className="wordmark"><Link href="/">Taster</Link></p>
        <nav className="site-nav" aria-label="사이트">
          <Link href="/">진단</Link>
          <Link href="/components">부품</Link>
          <Link href="/tone">톤 고르기</Link>
        </nav>
      </header>
      <main>
        <header className="gallery-head">
          <h1>나란히 비교</h1>
          <p>전부 실제로 돌아갑니다. 눌러 보고, 색을 바꿔 보고, 마음에 드는 것을 고르세요.</p>
        </header>
        <LookBar />
        {ready && !shown.length ? (
          <p className="empty">아직 담은 부품이 없습니다. <Link href="/components">갤러리에서 담아 오세요.</Link></p>
        ) : (
          <div className="slots">
            {shown.map((item, i) => <Slot key={item.id} item={item} number={i + 1} chosen={chosen.includes(item.id)} onChoose={() => toggle(item.id)} />)}
          </div>
        )}
        {shown.length > 0 && (
          <section className="send" aria-labelledby="send-title">
            <h2 id="send-title">에이전트에게 알려 주기</h2>
            {message ? (
              <>
                <p className="send-text" lang={korean ? undefined : 'en'}>{message}</p>
                <div className="send-tools">
                  <CopyButton text={message} label="이 글 복사" className="button" />
                  <CopyButton text={chosen.map(installLine).join('\n')} label="설치 명령 복사" />
                </div>
              </>
            ) : (
              <p className="stage-hint">마음에 드는 것에 이걸로를 누르면, 에이전트에게 붙여 넣을 글이 여기 나옵니다.</p>
            )}
            {href && <div className="send-tools"><CopyButton text={href} label="이 보드 링크 복사" /></div>}
          </section>
        )}
      </main>
    </div>
  );
}
