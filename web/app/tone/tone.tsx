'use client';

// The tone step on the web: a pad on two axes, the nearest real sites (first screens opened on request by
// /api/tone-shot, never stored), and Taster parts running live in the tokens of that spot. The rules are
// engine/tone.mjs, the same code the pick_tone tool runs, so the page and the agent give the same answer.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import data from '../../../taxonomy/tone-refs.json';
import { axesToTokens, describeAxes, nearestRefs, quadrantOf, readSpot, toneAxes, toneParts, tokensCss, toneUrl, DEMO_BRAND, TONE_AXES, type Spot, type ToneCatalog, type ToneRef } from '../../../engine/tone.mjs';
import { CopyButton } from '../components/copy-button';
import { LookBar } from '../components/look-bar';
import { LiveFrame, useStudio, type Look } from '../components/studio';

const catalog = data as unknown as ToneCatalog;
const PRAISE_ON = { x: 'X', reddit: 'Reddit', hackernews: 'Hacker News' } as const;
type Shot = { status: 'ok'; image: string } | { status: 'blocked' | 'failed' | 'busy' | 'loading' };
const NO_SHOT: Record<Exclude<Shot['status'], 'ok'>, string> = {
  loading: '첫 화면을 여는 중입니다.',
  blocked: '봇 확인이나 차단 화면이 떠서 화면 없이 링크만 둡니다.',
  failed: '제때 열리지 않았습니다. 링크로 직접 열어 보세요.',
  busy: '요청이 몰려 잠시 뒤에 다시 엽니다.',
};
const hostOf = (url: string) => new URL(url).host.replace(/^www\./, '');
const pct = (v: number) => Math.round(v * 100);

// The plot sits inside the pad with this much room, so dots on an edge stay whole.
const INSET = 14;
const DOT = 10;
type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box, gap = 3) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
const toPx = (r: Spot, w: number, h: number) => ({ x: INSET + r.x * (w - 2 * INSET), y: INSET + (1 - r.y) * (h - 2 * INSET) });

// Names beside the dots, placed one by one where they cover no other name and no dot; a name that fits nowhere is
// left out (its card still says it). The nearest go first. On a narrow pad only the nearest get names.
function placeNames(refs: ToneRef[], near: string[], w: number, h: number, measure: (text: string) => number, everyone: boolean) {
  const lineH = 18;
  const dots: Box[] = refs.map((r) => {
    const p = toPx(r, w, h);
    return { x: p.x - DOT / 2, y: p.y - DOT / 2, w: DOT, h: DOT };
  });
  const placed: Box[] = [];
  const out: Record<string, { left: number; top: number }> = {};
  const order = [...near.map((id) => refs.find((r) => r.id === id)!).filter(Boolean), ...(everyone ? refs.filter((r) => !near.includes(r.id)).sort((a, b) => b.y - a.y || a.x - b.x) : [])];
  for (const r of order) {
    const p = toPx(r, w, h);
    const tw = Math.ceil(measure(r.name)) + 2;
    const tries: Box[] = [
      { x: p.x + 9, y: p.y - lineH / 2, w: tw, h: lineH },
      { x: p.x - 9 - tw, y: p.y - lineH / 2, w: tw, h: lineH },
      { x: p.x - tw / 2, y: p.y - 8 - lineH, w: tw, h: lineH },
      { x: p.x - tw / 2, y: p.y + 8, w: tw, h: lineH },
    ];
    const own = refs.indexOf(r);
    const spot = tries.find((b) => b.x >= 2 && b.y >= 2 && b.x + b.w <= w - 2 && b.y + b.h <= h - 2 && !placed.some((q) => overlaps(q, b)) && !dots.some((d, i) => i !== own && overlaps(d, b, 1)));
    if (!spot) continue;
    placed.push(spot);
    out[r.id] = { left: spot.x, top: spot.y };
  }
  return out;
}

function RefCard({ r, number, shot, onRetry }: { r: ToneRef; number: number; shot?: Shot; onRetry: () => void }) {
  const p = r.praise;
  return (
    <li className="ref-card">
      <div className="ref-shot">
        {shot?.status === 'ok' ? (
          // A data URL from the capture route: nothing for an image optimizer to fetch.
          <img src={shot.image} alt={`${r.name} 첫 화면`} width={1280} height={800} />
        ) : (
          <p className="ref-shot-note">
            {NO_SHOT[shot?.status === undefined ? 'loading' : shot.status]}
            {(shot?.status === 'failed' || shot?.status === 'busy') && <button type="button" className="text-button" onClick={onRetry}>다시 열기</button>}
          </p>
        )}
      </div>
      <div className="ref-text">
        <h3><span className="ref-number">{number}</span> {r.name}</h3>
        <p className="ref-note">{r.note.ko}</p>
        <p className="ref-links">
          <a href={r.url} target="_blank" rel="noopener noreferrer">{hostOf(r.url)} 열기</a>
          {p && <a href={p.url} target="_blank" rel="noopener noreferrer">{PRAISE_ON[p.on]} 칭찬 글, {p.date}</a>}
        </p>
        {p?.caveat && <p className="ref-caveat">{p.caveat.ko}</p>}
        {!p && <p className="ref-caveat">손으로 놓은 기준점이고, 연결한 칭찬 글은 아직 없습니다.</p>}
      </div>
    </li>
  );
}

function PartFrame({ id, look }: { id: string; look: Look }) {
  const [height, setHeight] = useState(360);
  return (
    <figure className="part">
      <figcaption>{id}</figcaption>
      <div className="part-frame" style={{ height: Math.min(Math.max(height, 280), 640) }}>
        <LiveFrame id={id} look={look} title={`${id} 실행 화면`} onHeight={setHeight} />
      </div>
    </figure>
  );
}

export function Tone() {
  const studio = useStudio();
  const { ready, theme, brand, source } = studio;
  const [spot, setSpot] = useState<Spot>({ x: 0.5, y: 0.5 });
  const [genre, setGenre] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [shots, setShots] = useState<Record<string, Shot>>({});
  const [retry, setRetry] = useState(0);
  const [names, setNames] = useState<Record<string, { left: number; top: number }>>({});
  const [size, setSize] = useState({ w: 400, h: 400 });
  const [href, setHref] = useState('');
  const pad = useRef<HTMLDivElement>(null);
  const shotsNow = useRef(shots);
  shotsNow.current = shots;

  // The address decides the spot, so an agent can hand over a link.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has('x') || q.has('y')) setSpot(readSpot({ x: q.get('x') ?? 0.5, y: q.get('y') ?? 0.5 }));
    const g = q.get('genre');
    if (g && catalog.genres.some((x) => x.id === g)) setGenre(g);
  }, []);

  // The spot moves every frame while dragging; the axes change only when a step does, and only then do the tokens (and
  // the message to every live part) change.
  const fresh = toneAxes(spot, genre || undefined);
  const axesKey = TONE_AXES.map((a) => fresh[a.id]).join(',');
  const axes = useMemo(() => fresh, [axesKey]);
  const steps = useMemo(() => describeAxes(axes), [axes]);
  const toneTokens = useMemo(() => axesToTokens(axes, { theme, brand }), [axes, theme, brand]);
  const look = useMemo<Look>(() => ({ theme, tokens: { ...toneTokens, ...studio.tokens } }), [theme, toneTokens, studio.tokens]);
  const near = useMemo(() => nearestRefs(catalog, spot, { genre: genre || undefined, limit: 4 }), [spot, genre]);
  const nearIds = near.map((r) => r.id);
  const nearKey = nearIds.join(',');
  const quadrant = quadrantOf(catalog, spot)!;
  const parts = toneParts(spot);
  const pool = genre ? catalog.refs.filter((r) => r.genres.includes(genre)) : catalog.refs;

  // Names on the pad follow its size and the nearest set.
  const layout = useCallback(() => {
    const el = pad.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setSize({ w: width, h: height });
    const cs = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    setNames(placeNames(catalog.refs, nearKey.split(','), width, height, (t) => ctx.measureText(t).width, width >= 400));
  }, [nearKey]);
  useEffect(() => {
    layout();
    const el = pad.current;
    if (!el) return;
    const observer = new ResizeObserver(layout);
    observer.observe(el);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => observer.disconnect();
  }, [layout]);

  // First screens for the nearest four, once the spot rests. A busy answer is asked again on the next move.
  useEffect(() => {
    if (!ready || dragging) return;
    const want = nearKey.split(',').filter((id) => !shotsNow.current[id] || shotsNow.current[id].status === 'busy');
    if (!want.length) return;
    const mark = (status: Shot['status']) => setShots((s) => ({ ...s, ...Object.fromEntries(want.map((id) => [id, { status } as Shot])) }));
    const timer = setTimeout(async () => {
      mark('loading');
      try {
        const res = await fetch('/api/tone-shot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: want }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return mark(res.status === 429 || res.status === 503 ? 'busy' : 'failed');
        setShots((s) => ({ ...s, ...(body.shots as Record<string, Shot>) }));
      } catch {
        mark('failed');
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [nearKey, dragging, ready, retry]);

  // The address follows the spot once it rests (browsers limit how often it may change).
  useEffect(() => {
    if (!ready || dragging) return;
    const timer = setTimeout(() => {
      const url = toneUrl(location.origin, { ...spot, genre: genre || undefined, theme, brand });
      setHref(url);
      history.replaceState(null, '', url.slice(location.origin.length));
    }, 300);
    return () => clearTimeout(timer);
  }, [spot, genre, theme, brand, ready, dragging]);

  const fromPointer = (e: PointerEvent<HTMLDivElement>): Spot => {
    const r = pad.current!.getBoundingClientRect();
    return readSpot({ x: (e.clientX - r.left - INSET) / (r.width - 2 * INSET), y: 1 - (e.clientY - r.top - INSET) / (r.height - 2 * INSET) });
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    // A press on a dot lands on that site's spot.
    const r = pad.current!.getBoundingClientRect();
    const hitDot = pool.find((ref) => {
      const p = toPx(ref, r.width, r.height);
      return Math.hypot(p.x - (e.clientX - r.left), p.y - (e.clientY - r.top)) <= 12;
    });
    setSpot(hitDot ? { x: hitDot.x, y: hitDot.y } : fromPointer(e));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setSpot(fromPointer(e));
  };
  const stop = () => setDragging(false);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const move = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] } as Record<string, number[]>)[e.key];
    if (!move) return;
    e.preventDefault();
    setSpot((s) => readSpot({ x: s.x + move[0], y: s.y + move[1] }));
  };

  const where = `브랜드 개성 ${pct(spot.x)}, 화려 ${pct(spot.y)}, ${quadrant.ko} 쪽`;
  const genreName = catalog.genres.find((g) => g.id === genre)?.ko;
  const demo = !brand && toneTokens['--brand'] === DEMO_BRAND;
  const message = `Taster 톤 지도에서 ${where}${genreName ? `, 결 ${genreName}` : ''} 를 골랐어. 가까운 레퍼런스는 ${near.map((r) => r.name).join(', ')}. 축은 ${steps.map((s) => `${s.ko} ${s.stepKo}`).join(', ')}. 이 톤으로 진행해 줘.${href ? ` ${href}` : ''}`;

  return (
    <div className="page gallery-page tone-page">
      <header className="masthead">
        <p className="wordmark"><Link href="/">Taster</Link></p>
        <nav className="site-nav" aria-label="사이트">
          <Link href="/">진단</Link>
          <Link href="/components">부품</Link>
          <Link href="/tone" aria-current="page">톤 고르기</Link>
        </nav>
      </header>
      <main>
        <header className="gallery-head">
          <h1>톤 고르기</h1>
          <p>원하는 톤에 점을 놓으세요. 가로는 상업성에서 브랜드 개성, 세로는 미니멀에서 화려입니다. 가까운 실제 사이트 네 곳은 방향을 잡는 용도이고, 아래 Taster 부품은 그 위치의 토큰으로 실제로 그린 결과입니다.</p>
        </header>

        <div className="tone-grid">
          <section className="tone-map" aria-labelledby="map-title">
            <div className="tone-map-head">
              <h2 id="map-title">톤 지도</h2>
              <div className="seg" role="group" aria-label="결">
                <button type="button" className="seg-item" aria-pressed={!genre} onClick={() => setGenre('')}>전체</button>
                {catalog.genres.map((g) => (
                  <button key={g.id} type="button" className="seg-item" aria-pressed={genre === g.id} onClick={() => setGenre(g.id)}>{g.ko}</button>
                ))}
              </div>
            </div>
            <div className="pad-row" aria-hidden="true"><span>출시·프로모션</span><span>크리에이티브 스튜디오</span></div>
            <div
              ref={pad}
              className="pad"
              role="slider"
              tabIndex={0}
              aria-label="톤 위치. 방향키로 옮기고, Shift 를 누르면 크게 움직입니다."
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct(spot.x)}
              aria-valuetext={`${where}. 가장 가까운 곳 ${near[0]?.name}`}
              data-dragging={dragging ? '' : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stop}
              onPointerCancel={stop}
              onLostPointerCapture={stop}
              onKeyDown={onKeyDown}
            >
              {/* The plot is a drawing of data, so it is one SVG; names are text beside it. */}
              <svg className="pad-plot" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
                <line className="pad-axis" x1={0} x2={size.w} y1={size.h / 2} y2={size.h / 2} />
                <line className="pad-axis" x1={size.w / 2} x2={size.w / 2} y1={0} y2={size.h} />
                {catalog.refs.map((r) => {
                  const p = toPx(r, size.w, size.h);
                  return <circle key={r.id} className="pad-dot" cx={p.x} cy={p.y} r={DOT / 2} data-near={nearIds.includes(r.id) ? '' : undefined} data-out={genre && !r.genres.includes(genre) ? '' : undefined} />;
                })}
                <circle className="pad-you" r={11} cx={0} cy={0} style={{ transform: `translate(${toPx(spot, size.w, size.h).x}px, ${toPx(spot, size.w, size.h).y}px)` }} />
              </svg>
              {catalog.refs.map((r) => names[r.id] && (
                <span key={r.id} className="pad-name" aria-hidden="true" data-near={nearIds.includes(r.id) ? '' : undefined} data-out={genre && !r.genres.includes(genre) ? '' : undefined} style={{ left: names[r.id].left, top: names[r.id].top }}>
                  {r.name}
                </span>
              ))}
            </div>
            <div className="pad-row" aria-hidden="true"><span>깔끔한 SaaS</span><span>에디토리얼·럭셔리</span></div>
            <p className="tone-readout">브랜드 개성 <b>{pct(spot.x)}</b>, 화려 <b>{pct(spot.y)}</b>, {quadrant.ko} 쪽</p>
            <p className="tone-hint">점을 끌거나 지도를 누르세요. 점 위를 누르면 그 사이트 자리로 갑니다. 가독성은 고르는 값이 아니라 늘 지키는 바닥이라, 어느 위치에서도 글자 대비는 낮아지지 않습니다.</p>
            <details className="tone-all">
              <summary>레퍼런스 전체 {pool.length}곳</summary>
              <div className="tone-chips">
                {pool.map((r) => (
                  <button key={r.id} type="button" className="chip" aria-pressed={nearIds.includes(r.id)} onClick={() => setSpot({ x: r.x, y: r.y })}>
                    {r.name}<span className="visually-hidden"> 자리로 옮기기</span>
                  </button>
                ))}
              </div>
            </details>
          </section>

          <section className="tone-refs" aria-labelledby="refs-title">
            <h2 id="refs-title">가까운 실제 사이트</h2>
            <ol className="ref-list">
              {near.map((r, i) => (
                <RefCard key={r.id} r={r} number={i + 1} shot={shots[r.id]} onRetry={() => { setShots((s) => { const next = { ...s }; delete next[r.id]; return next; }); setRetry((n) => n + 1); }} />
              ))}
            </ol>
          </section>
        </div>

        <section className="tone-parts" aria-labelledby="parts-title">
          <h2 id="parts-title">이 위치로 그린 Taster 부품</h2>
          <p className="tone-parts-lede">레퍼런스는 방향만 잡습니다. 실제로 받게 될 화면은 이쪽이고, 지금 위치의 토큰으로 실제로 돌아갑니다. 레퍼런스와 똑같이 나온다고 약속하지 않습니다.</p>
          <dl className="axes">
            {steps.map((s) => (
              <div key={s.id} className="axis">
                <dt>{s.ko}</dt>
                <dd>{s.stepKo}</dd>
              </div>
            ))}
          </dl>
          {demo && <p className="tone-hint">이 위치는 색을 쓰는데 브랜드 색이 없어 시연용 색을 입혔습니다. 아래에서 내 색을 고르면 바뀝니다.</p>}
          <LookBar />
          <div className="parts">
            {ready && parts.map((id) => <PartFrame key={id} id={id} look={look} />)}
          </div>
        </section>

        <section className="send" aria-labelledby="send-title">
          <h2 id="send-title">에이전트에게 알려 주기</h2>
          <p className="send-text">{message}</p>
          <div className="send-tools">
            <CopyButton text={message} label="이 글 복사" className="button" />
            <CopyButton text={tokensCss(look.tokens)} label="토큰 CSS 복사" />
            {href && <CopyButton text={href} label="이 링크 복사" />}
          </div>
          {source && <p className="tone-hint">{source} 에서 읽은 브랜드를 함께 입혔습니다.</p>}
        </section>

        <p className="tone-note">레퍼런스 화면은 요청할 때 각 사이트의 첫 화면을 열어 보여 주고, 어디에도 저장하지 않습니다. 봇 확인이나 차단 화면이 나오면 우회하지 않고 링크만 둡니다. 쿠키 창은 거부만 누르고, 거부 단추가 없으면 가리기만 합니다. 위치는 손으로 놓았습니다.</p>
      </main>
    </div>
  );
}
