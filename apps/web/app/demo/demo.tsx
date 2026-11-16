'use client';

/* The /demo stage: examples/rebuild/before.html and after.html in two same-origin frames at their 1300x871 first
   screen, scaled to the column, and three cursors drawn over them. The diagnose cursor's spots are what the detector
   finds when it runs inside the before frame; the last count is what it finds inside the after frame. Every frame is
   drawn from timeline.ts as a function of time, so pause, replay and the reduced motion end state are the same code.
   The frames are decoration (inert, out of the tab order); the counters, the token sliders and the steps below say
   the same in text. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FRAME,
  TOKEN_RANGE,
  countsAt,
  diagnosePose,
  orderSpots,
  plan as makePlan,
  revealAt,
  swapPose,
  systemPose,
  tokensAt,
  visitedAt,
  type Anchor,
  type Band,
  type Plan,
  type Pose,
  type Slider,
  type Spot,
} from './timeline.ts';

export type Script = { src: string; integrity: string };

type Finding = { ruleId: string; selector: string; rect: { x: number; y: number; w: number; h: number } };
type Report = { findings: Finding[]; counts: Record<string, number> };
type FrameWindow = Window & { tasterDetect?: (options: { maxPerRule?: number }) => Report; __tasterRules?: Record<string, { name: string }> };
type Measured = {
  spots: Spot[];
  bands: Band[];
  names: Record<string, string>;
  total: number;
  /** Rules the detector still finds in the after frame. */
  stays: string[];
  /** The rebuilt page's own radius and spacing tokens, as number and unit, to scale from. */
  base: Record<Slider, [string, number, string][]>;
};

const BEFORE = '/examples/rebuild/before.html';
const AFTER = '/examples/rebuild/after.html';
const INSTALL = 'https://github.com/makim-414/taster#install';
const TOKENS: Record<Slider, string[]> = {
  radius: ['--radius', '--r-sm', '--r-md', '--r-card', '--r-xl', '--r-2xl', '--r-3xl', '--r-4xl'],
  density: ['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-8', '--sp-12', '--sp-16'],
};
const CURSORS = [
  { who: 'diagnose', name: '진단' },
  { who: 'swap', name: '교체' },
  { who: 'system', name: '시스템' },
] as const;
// The thumb of a native range input, to place the system cursor on it.
const THUMB = 16;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** The frame's window once its page has loaded (it may have loaded before this ran). */
function loaded(frame: HTMLIFrameElement): Promise<FrameWindow> {
  return new Promise((resolve) => {
    const done = () => {
      const doc = frame.contentDocument;
      if (doc && doc.readyState === 'complete' && doc.URL !== 'about:blank') {
        resolve(frame.contentWindow as FrameWindow);
        return true;
      }
      return false;
    };
    if (!done()) frame.addEventListener('load', function onLoad() {
      if (done()) frame.removeEventListener('load', onLoad);
    });
  });
}

/** Adds one of the pinned scripts to a frame's page, the way the bookmarklet's overlay adds them. */
function addScript(doc: Document, { src, integrity }: Script): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = doc.createElement('script');
    s.src = src;
    s.integrity = integrity;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`${src} did not load`));
    doc.head.appendChild(s);
  });
}

/** Findings grouped by element and cut to the first screen; one spot per element with every rule it hit. */
function spotsOf(report: Report): Spot[] {
  const by = new Map<string, Spot>();
  for (const f of report.findings) {
    const x = Math.max(0, f.rect.x);
    const y = Math.max(0, f.rect.y);
    const w = Math.min(FRAME.w, f.rect.x + f.rect.w) - x;
    const h = Math.min(FRAME.h, f.rect.y + f.rect.h) - y;
    if (w <= 0 || h <= 0) continue;
    const spot = by.get(f.selector) ?? { box: { x, y, w, h }, rules: [] };
    if (!spot.rules.includes(f.ruleId)) spot.rules.push(f.ruleId);
    by.set(f.selector, spot);
  }
  return orderSpots([...by.values()]);
}

/** The before page's top level blocks as bands from the top of the frame to its foot, with no gap between them. */
function bandsOf(doc: Document): Band[] {
  const tops = [...doc.body.children]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.height > 8 && r.top < FRAME.h)
    .map((r) => Math.max(0, r.top))
    .sort((a, b) => a - b);
  const starts = [0, ...tops.filter((t) => t > 8 && t < FRAME.h - 8)];
  return starts.map((top, i) => ({ top, bottom: starts[i + 1] ?? FRAME.h }));
}

function tokenBase(doc: Document): Measured['base'] {
  const cs = getComputedStyle(doc.documentElement);
  const read = (name: string): [string, number, string] | null => {
    const m = /^\s*([\d.]+)(px|rem)\s*$/.exec(cs.getPropertyValue(name));
    return m ? [name, Number(m[1]), m[2]] : null;
  };
  return {
    radius: TOKENS.radius.map(read).filter((v): v is [string, number, string] => v !== null),
    density: TOKENS.density.map(read).filter((v): v is [string, number, string] => v !== null),
  };
}

const sliderText = (which: Slider, value: number, base: Measured['base'] | undefined): string => {
  if (which === 'density') return `${Math.round(value * 100)}%`;
  const card = base?.radius.find(([name]) => name === '--r-card');
  return card ? `${Math.round(card[1] * value)}px` : `${Math.round(value * 100)}%`;
};

export function CursorDemo({ detect, rules }: { detect: Script; rules: Script }) {
  const reduced = useReducedMotion();
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [onScreen, setOnScreen] = useState(false);
  const [scale, setScale] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLIFrameElement>(null);
  const afterRef = useRef<HTMLIFrameElement>(null);
  const afterWrapRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLParagraphElement>(null);
  const foundRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLElement>(null);
  const sliderRefs = { radius: useRef<HTMLInputElement>(null), density: useRef<HTMLInputElement>(null) };
  const outputRefs = { radius: useRef<HTMLOutputElement>(null), density: useRef<HTMLOutputElement>(null) };
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const time = useRef(0);
  // Values the visitor set by hand while the demo was paused; the animation takes over again on play.
  const manual = useRef<Partial<Record<Slider, number>>>({});
  const drawn = useRef({ chip: -2, tokens: '', counts: '' });

  const plan: Plan | null = useMemo(() => (measured ? makePlan(measured.spots, measured.bands) : null), [measured]);
  const stays = useMemo(() => new Set(measured?.stays ?? []), [measured]);

  // Measure once both frames have loaded: the detector in each, the before page's blocks, the after page's tokens.
  useEffect(() => {
    let live = true;
    (async () => {
      const before = beforeRef.current;
      const after = afterRef.current;
      if (!before || !after) return;
      const [bw, aw] = await Promise.all([loaded(before), loaded(after)]);
      await addScript(bw.document, rules);
      await Promise.all([addScript(bw.document, detect), addScript(aw.document, detect)]);
      await Promise.all([bw.document.fonts.ready, aw.document.fonts.ready]);
      if (!bw.tasterDetect || !aw.tasterDetect) throw new Error('the detector did not start');
      const rb = bw.tasterDetect({ maxPerRule: 40 });
      const ra = aw.tasterDetect({ maxPerRule: 40 });
      const names = Object.fromEntries(Object.entries(bw.__tasterRules ?? {}).map(([id, r]) => [id, r.name]));
      const result: Measured = {
        spots: spotsOf(rb),
        bands: bandsOf(bw.document),
        names,
        total: Object.keys(rb.counts).length,
        stays: Object.keys(ra.counts),
        base: tokenBase(aw.document),
      };
      if (live) setMeasured(result);
    })().catch(() => {
      if (live) setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [detect, rules]);

  // The frames are laid out at 1300 wide and scaled to the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => setScale(stage.clientWidth / FRAME.w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Animate only while the stage is on screen.
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const applyTokens = useCallback(
    (values: Record<Slider, number>) => {
      const key = `${values.radius.toFixed(3)} ${values.density.toFixed(3)}`;
      if (drawn.current.tokens === key) return;
      drawn.current.tokens = key;
      const root = afterRef.current?.contentDocument?.documentElement;
      for (const which of ['radius', 'density'] as const) {
        const v = values[which];
        for (const [name, n, unit] of measured?.base[which] ?? []) {
          if (Math.abs(v - 1) < 0.001) root?.style.removeProperty(name);
          else root?.style.setProperty(name, `${+(n * v).toFixed(3)}${unit}`);
        }
        const input = sliderRefs[which].current;
        const text = sliderText(which, v, measured?.base);
        if (input && document.activeElement !== input) input.value = String(v);
        input?.setAttribute('aria-valuetext', text);
        if (outputRefs[which].current) outputRefs[which].current.textContent = text;
      }
    },
    // The ref objects are stable; only the measured base changes what is written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measured],
  );

  // One frame of the demo at time t.
  const draw = useCallback(
    (t: number) => {
      if (!measured || !plan || !scale) return;
      const { spots } = measured;
      const line = revealAt(plan, t);
      if (afterWrapRef.current) afterWrapRef.current.style.clipPath = `inset(0 0 ${(FRAME.h - line).toFixed(2)}px 0)`;
      if (marksRef.current) marksRef.current.style.clipPath = `inset(${(line * scale).toFixed(2)}px 0 0 0)`;

      const seen = visitedAt(plan, t);
      marksRef.current?.querySelectorAll<HTMLElement>('.demo-mark').forEach((el, i) => el.toggleAttribute('data-on', i <= seen));

      // The chip names the rules of the spot the diagnose cursor is on, until it moves to the next one.
      const next = seen + 1 < plan.visits.length ? plan.visits[seen + 1] : seen >= 0 ? plan.visits[seen] + 1.2 : 0;
      const chipAt = seen >= 0 && t < next - 0.05 ? seen : -1;
      const chip = chipRef.current;
      if (chip && drawn.current.chip !== chipAt) {
        drawn.current.chip = chipAt;
        chip.toggleAttribute('data-on', chipAt >= 0);
        if (chipAt >= 0) {
          const s = spots[chipAt];
          chip.replaceChildren(
            ...s.rules.map((id) => {
              const row = document.createElement('span');
              const code = document.createElement('code');
              code.textContent = id;
              const name = document.createElement('span');
              name.className = 'demo-chip-name';
              name.textContent = measured.names[id] ?? '';
              row.append(code, ' ', name);
              return row;
            }),
          );
          const stageW = FRAME.w * scale;
          const stageH = FRAME.h * scale;
          const big = s.box.h > FRAME.h / 3;
          const below = (s.box.y + s.box.h) * scale + 6;
          let top = big ? (s.box.y + 70) * scale : below + chip.offsetHeight < stageH ? below : s.box.y * scale - chip.offsetHeight - 6;
          let left = (big ? s.box.x + 110 : s.box.x) * scale;
          left = Math.max(4, Math.min(left, stageW - chip.offsetWidth - 4));
          top = Math.max(4, Math.min(top, stageH - chip.offsetHeight - 4));
          chip.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
        }
      }

      const counts = countsAt(plan, spots, t, stays);
      const key = `${counts.found} ${counts.remaining}`;
      if (drawn.current.counts !== key) {
        drawn.current.counts = key;
        if (foundRef.current) foundRef.current.textContent = String(counts.found);
        if (leftRef.current) leftRef.current.textContent = String(counts.remaining);
      }
      endRef.current?.toggleAttribute('data-on', t >= plan.end);

      const auto = tokensAt(plan, t);
      applyTokens({ radius: manual.current.radius ?? auto.radius, density: manual.current.density ?? auto.density });

      // Cursors, in pixels of the board (the stage and the bar under it).
      const board = boardRef.current;
      const stage = stageRef.current;
      if (!board || !stage || reduced) return;
      const b = board.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const resolve = (a: Anchor): [number, number] => {
        if (a.at === 'frame') return [st.left - b.left + a.x * scale, st.top - b.top + a.y * scale];
        const r = sliderRefs[a.which].current?.getBoundingClientRect();
        if (!r) return [0, 0];
        const range = TOKEN_RANGE[a.which];
        const f = (a.value - range.min) / (range.max - range.min);
        return [r.left - b.left + THUMB / 2 + f * (r.width - THUMB) + (a.dx ?? 0), r.top - b.top + r.height / 2 + (a.dy ?? 0)];
      };
      const poses: Pose[] = [diagnosePose(plan, spots, t), swapPose(plan, t), systemPose(plan, t)];
      poses.forEach((pose, i) => {
        const el = cursorRefs.current[i];
        if (!el) return;
        const [x0, y0] = resolve(pose.from);
        const [x1, y1] = resolve(pose.to);
        const x = Math.max(0, Math.min(b.width - 4, x0 + (x1 - x0) * pose.p));
        const y = Math.max(0, Math.min(b.height - 4, y0 + (y1 - y0) * pose.p));
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.toggleAttribute('data-flip', x > b.width - 96);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measured, plan, stays, scale, reduced, applyTokens],
  );

  // Paused, reduced or freshly laid out: draw the one frame that should be on screen now.
  useEffect(() => {
    if (!plan) return;
    if (reduced) time.current = plan.end;
    drawn.current.chip = -2;
    draw(time.current);
  }, [plan, reduced, scale, draw]);

  useEffect(() => {
    if (!plan || reduced || !playing || !onScreen) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      time.current += Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (time.current >= plan.loop) time.current = 0;
      draw(time.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [plan, reduced, playing, onScreen, draw]);

  const play = () => {
    manual.current = {};
    setPlaying((p) => !p);
  };
  const replay = () => {
    manual.current = {};
    time.current = 0;
    drawn.current.chip = -2;
    draw(0);
    setPlaying(true);
  };
  const onSlide = (which: Slider, value: number) => {
    setPlaying(false);
    manual.current = { ...manual.current, [which]: value };
    if (plan) applyTokens({ radius: manual.current.radius ?? tokensAt(plan, time.current).radius, density: manual.current.density ?? tokensAt(plan, time.current).density });
  };

  const counting = !measured && !failed;
  return (
    <section className="demo" aria-labelledby="demo-stage-title" data-reduced={reduced ? '' : undefined}>
      <h2 id="demo-stage-title" className="visually-hidden">
        재구성 예시 데모
      </h2>
      <div className="demo-board" ref={boardRef}>
        <div className="demo-stage" ref={stageRef} style={{ aspectRatio: `${FRAME.w} / ${FRAME.h}` }} inert>
          <div className="demo-frames" style={{ width: FRAME.w, height: FRAME.h, transform: scale ? `scale(${scale})` : undefined }}>
            <iframe ref={beforeRef} src={BEFORE} title="고치기 전 페이지, before.html" tabIndex={-1} width={FRAME.w} height={FRAME.h} />
            <div className="demo-after" ref={afterWrapRef} data-whole={failed || undefined}>
              <iframe ref={afterRef} src={AFTER} title="다시 지은 판, after.html" tabIndex={-1} width={FRAME.w} height={FRAME.h} />
            </div>
          </div>
          <div className="demo-marks" ref={marksRef}>
            {measured && scale
              ? measured.spots.map((s, i) => (
                  <span
                    key={i}
                    className="demo-mark"
                    style={{ transform: `translate(${(s.box.x * scale).toFixed(1)}px, ${(s.box.y * scale).toFixed(1)}px)`, width: s.box.w * scale, height: s.box.h * scale }}
                  />
                ))
              : null}
            <div className="demo-chip" ref={chipRef} />
          </div>
          <p className="demo-end" ref={endRef}>
            규칙 {measured?.total ?? ''}개 → {measured?.stays.length ?? ''}개
          </p>
        </div>

        <div className="demo-bar">
          <p className="demo-counts">
            {counting ? (
              '검사기를 돌리는 중입니다'
            ) : failed ? (
              '검사기를 불러오지 못해 데모를 멈췄습니다'
            ) : (
              <>
                찾은 규칙 <b ref={foundRef}>0</b>개, 남은 규칙 <b ref={leftRef}>0</b>개
              </>
            )}
          </p>
          <div className="demo-tokens" role="group" aria-label="다시 지은 판의 토큰">
            {(['radius', 'density'] as const).map((which) => (
              <div className="demo-token" key={which}>
                <label htmlFor={`demo-${which}`}>{which === 'radius' ? '모서리' : '간격'}</label>
                <output htmlFor={`demo-${which}`} ref={outputRefs[which]}>
                  {sliderText(which, 1, measured?.base)}
                </output>
                <input
                  id={`demo-${which}`}
                  ref={sliderRefs[which]}
                  type="range"
                  min={TOKEN_RANGE[which].min}
                  max={TOKEN_RANGE[which].max}
                  step={TOKEN_RANGE[which].step}
                  defaultValue={1}
                  disabled={!measured}
                  onChange={(e) => onSlide(which, Number(e.currentTarget.value))}
                />
              </div>
            ))}
          </div>
          {reduced ? (
            <p className="demo-note">움직임 줄이기 설정이라 마지막 화면만 보여 줍니다.</p>
          ) : (
            <div className="demo-controls">
              <button type="button" onClick={play} disabled={!measured}>
                {playing ? '일시 정지' : '재생'}
              </button>
              <button type="button" className="demo-replay" onClick={replay} disabled={!measured}>
                처음부터
              </button>
            </div>
          )}
        </div>

        {reduced ? null : (
          <div className="demo-cursors" aria-hidden="true">
            {CURSORS.map((c, i) => (
              <div
                key={c.who}
                className="demo-cursor"
                data-who={c.who}
                ref={(el) => {
                  cursorRefs.current[i] = el;
                }}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2 1.5 L2 16 L6 12.2 L9 18.5 L11.8 17.2 L8.9 11 L14.5 11 Z" />
                </svg>
                <span className="demo-cursor-tag">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="demo-result">
        {measured ? `1300 폭 첫 화면에서 규칙 ${measured.total}개 → ${measured.stays.length}개.` : '1300 폭 첫 화면에서 잰 규칙 수가 여기에 나옵니다.'}
        {measured?.stays.length ? ` 다시 지은 판에 남은 규칙: ${measured.stays.map((id) => `${id} ${measured.names[id] ?? ''}`.trim()).join(', ')}.` : ''}
      </p>
      <ul className="demo-links">
        <li>
          <a href={INSTALL}>Taster 설치하기</a>
        </li>
        <li>
          <a href="/">내 사이트 진단해 보기</a>
        </li>
      </ul>
      <p className="fineprint">
        수는 이 브라우저가 1300 폭 첫 화면 한 장에서 잰 값이라, 1440 폭과 390 폭을 함께 재는 진단 결과나 저장소 README 의 수와 다를 수
        있습니다. README 의 고치기 전 수에는 390 폭에서만 걸리는 규칙 하나(RSP-01, 화면보다 넓은 페이지)가 더 들어 있습니다. 다시 지은
        판은 어두운 판이 기본이고, 기기가 밝은 화면을 고르면 같은 시스템의 밝은 판으로 바뀝니다.
      </p>
    </section>
  );
}
