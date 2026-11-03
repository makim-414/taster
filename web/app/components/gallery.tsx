'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LookBar } from './look-bar';
import { LiveFrame, MAX_PICKS, useStudio, type Look } from './studio';

export type Card = { id: string; group: string; slug: string; name: string; categoryName: string; family: string; summary: string; surfaces: string[]; search: string };
type Facet = { id: string; name: string; count?: number };

const previewSrc = (id: string, theme: string) => `/previews/${id.replace('/', '-')}.${theme}.jpg`;
const STAGE_WIDTH = 720;

function GalleryCard({ card, live, look }: { card: Card; live: boolean; look: Look }) {
  const { picks, togglePick } = useStudio();
  const box = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [scale, setScale] = useState(0.5);
  const picked = picks.includes(card.id);
  const full = !picked && picks.length >= MAX_PICKS;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const seen = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' });
    seen.observe(el);
    const sizes = new ResizeObserver(() => setScale(el.clientWidth / STAGE_WIDTH));
    sizes.observe(el);
    return () => { seen.disconnect(); sizes.disconnect(); };
  }, []);

  // The still is always there underneath, so a frame that is still loading never leaves a hole.
  const running = inView && (live || hover);
  return (
    <article className="card">
      <Link
        href={`/components/${card.group}/${card.slug}`}
        className="card-frame"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }}
        onPointerLeave={() => setHover(false)}
      >
        <span ref={box} className="card-view">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc(card.id, look.theme)} alt={`${card.name} 미리보기`} loading="lazy" width={1080} height={675} />
          {running && (
            <span className="card-live" style={{ transform: `scale(${scale})` }}>
              <LiveFrame id={card.id} look={look} title={`${card.name} 실행 화면`} interactive={false} />
            </span>
          )}
        </span>
      </Link>
      <div className="card-text">
        <div>
          <h2><Link href={`/components/${card.group}/${card.slug}`}>{card.name}</Link></h2>
          <p className="card-kind">{card.categoryName}</p>
        </div>
        <button type="button" className="pick" aria-pressed={picked} disabled={full} onClick={() => togglePick(card.id)} aria-label={`${card.name} ${picked ? '빼기' : '담기'}`}>
          {picked ? '담음' : '담기'}
        </button>
      </div>
    </article>
  );
}

export function Gallery({ cards, families, surfaces }: { cards: Card[]; families: Facet[]; surfaces: Facet[] }) {
  const { look, brand, picks, clearPicks, ready } = useStudio();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [surface, setSurface] = useState('all');
  const [allLive, setAllLive] = useState(false);

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return cards.filter((c) => (family === 'all' || c.family === family) && (surface === 'all' || c.surfaces.includes(surface)) && words.every((w) => c.search.includes(w)));
  }, [cards, query, family, surface]);

  const live = allLive || !!brand || Object.keys(look.tokens).length > 0;
  const boardHref = `/board?ids=${picks.join(',')}${brand ? `&brand=${brand.slice(1)}` : ''}&theme=${look.theme}`;

  return (
    <>
      <header className="gallery-head">
        <h1>부품 갤러리</h1>
        <p>AI 티 없이 쓸 수 있는 부품 {cards.length}개. 내 브랜드를 입혀 보고, 마음에 드는 것을 담아 나란히 비교하세요.</p>
      </header>
      <LookBar />
      <div className="filters">
        <label className="search-field">
          <span className="visually-hidden">부품 찾기</span>
          <input type="search" placeholder="찾기: hero, 표, button" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="select-field">
          <span>화면</span>
          <select value={surface} onChange={(e) => setSurface(e.target.value)}>
            <option value="all">전체</option>
            {surfaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="check-field">
          <input type="checkbox" checked={live} disabled={!!brand} onChange={(e) => setAllLive(e.target.checked)} />
          <span>전부 움직이게</span>
        </label>
      </div>
      <label className="select-field family-select">
        <span>종류</span>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>
          <option value="all">전체</option>
          {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      <div className="chips" role="group" aria-label="종류">
        <button type="button" className="chip" aria-pressed={family === 'all'} onClick={() => setFamily('all')}>전체</button>
        {families.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={family === f.id} onClick={() => setFamily(f.id)}>{f.name}</button>
        ))}
      </div>
      <p className="result-count" role="status">{shown.length}개</p>
      {shown.length ? (
        <div className="grid">
          {shown.map((card) => <GalleryCard key={card.id} card={card} live={live && ready} look={look} />)}
        </div>
      ) : (
        <p className="empty">찾는 부품이 없습니다. 다른 말로 찾아 보세요.</p>
      )}
      {picks.length > 0 && (
        <aside className="tray" aria-label="담은 부품">
          <p>{picks.length}개 담음{picks.length >= MAX_PICKS ? ' (최대)' : ''}</p>
          <button type="button" className="text-button" onClick={clearPicks}>비우기</button>
          <Link className="button" href={boardHref}>나란히 비교</Link>
        </aside>
      )}
    </>
  );
}
