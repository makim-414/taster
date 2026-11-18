'use client';

/* The /demo stage: a before page and an after page in two same-origin frames laid out at 1300x871 and scaled to the
   column, with two crews of agents drawn over them. The diagnose crew's spots are what the detector finds when it runs
   inside the before frame (at 1300 wide, and at 390 wide in a hidden frame); the rebuild crew's layers are the after
   page's own boxes and lines, read from its DOM; the last count is what the detector finds inside the after frame.
   Every frame is drawn from timeline.ts as a function of time, so pause, 2x, replay and the reduced motion end state
   are the same code. The stage is decoration (inert, out of the tab order); the bar, the token sliders and the steps
   below say the same in text.

   The pages default to the worked rebuild in examples/rebuild. A recording run (scripts/demo/record.mjs) sets
   window.__TASTER_DEMO__ before the page loads to point the same overlay at two other pages. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layersOf, pageHeight, spotsOf, tokenBase, type Rebuild, type Report, type TokenBase } from './measure.ts';
import { ARROW_PATH, ARROW_TIP } from './stageshow.ts';
import {
  TOKEN_RANGE,
  VIEW,
  agentAt,
  cameraAt,
  crossAt,
  foundAt,
  layerAt,
  layersShownAt,
  markAt,
  phaseAt,
  plan as makePlan,
  systemAt,
  tokensAt,
  type Anchor,
  type Crew,
  type Layer,
  type Plan,
  type Slider,
  type Spot,
} from './timeline.ts';

export type Script = { src: string; integrity: string };

type FrameWindow = Window & { tasterDetect?: (options: { maxPerRule?: number }) => Report; __tasterRules?: Record<string, { name: string }> };
type Pages = { before: string; after: string; record: boolean; speed: number };
type Measured = {
  spots: Spot[];
  /** Rules found on the before page only at 390 wide. */
  extra: string[];
  names: Record<string, string>;
  /** Every rule found on the before page, at either width. */
  found: string[];
  /** Rules the detector still finds on the after page, at either width. */
  stays: string[];
  layers: Layer[];
  beforeH: number;
  afterH: number;
  base: TokenBase;
};

declare global {
  interface Window {
    __TASTER_DEMO__?: { before?: unknown; after?: unknown; record?: unknown; speed?: unknown };
  }
}

const EXAMPLE: Pages = { before: '/examples/rebuild/before.html', after: '/examples/rebuild/after.html', record: false, speed: 1 };
const NARROW = { w: 390, h: 844 };
const INSTALL = 'https://github.com/makim-414/taster#install';
const SLIDERS = ['radius', 'density'] as const;
// The thumb of a native range input, to place the system cursor on it.
const THUMB = 16;

/** The pages to frame: the worked rebuild, or the two http(s) pages a recording run set before the page loaded. */
function choosePages(): Pages {
  const set = typeof window === 'undefined' ? undefined : window.__TASTER_DEMO__;
  if (!set || typeof set.before !== 'string' || typeof set.after !== 'string') return EXAMPLE;
  try {
    const before = new URL(set.before, window.location.href);
    const after = new URL(set.after, window.location.href);
    if (![before, after].every((u) => u.protocol === 'http:' || u.protocol === 'https:')) return EXAMPLE;
    return { before: before.href, after: after.href, record: set.record === true, speed: set.speed === 2 ? 2 : 1 };
  } catch {
    return EXAMPLE;
  }
}

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
    const url = new URL(src, window.location.href);
    s.src = url.href;
    s.integrity = integrity;
    if (url.origin !== new URL(doc.URL).origin) s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`${src} did not load`));
    doc.head.appendChild(s);
  });
}

const sliderText = (which: Slider, value: number, base: TokenBase | undefined): string => {
  if (which === 'density') return `${Math.round(value * 100)}%`;
  const first = base?.radius.find(([, n, unit]) => unit === 'px' && n > 0 && n < 100) ?? base?.radius.find(([, n]) => n > 0 && n < 6);
  if (!first) return `${Math.round(value * 100)}%`;
  const px = first[2] === 'px' ? first[1] : first[1] * 16;
  return `${Math.round(px * value)}px`;
};

const two = (n: number) => String(n).padStart(2, '0');

export function CursorDemo({ detect, rules }: { detect: Script; rules: Script }) {
  const reduced = useReducedMotion();
  const [pages, setPages] = useState<Pages | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [onScreen, setOnScreen] = useState(false);
  const [scale, setScale] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLIFrameElement>(null);
  const afterRef = useRef<HTMLIFrameElement>(null);
  const beforeNarrowRef = useRef<HTMLIFrameElement>(null);
  const afterNarrowRef = useRef<HTMLIFrameElement>(null);
  const beforeWrapRef = useRef<HTMLDivElement>(null);
  const afterWrapRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  const extraRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const systemRef = useRef<HTMLDivElement>(null);
  const crewRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const tuneRef = useRef<HTMLDivElement>(null);
  const sliderRefs = { radius: useRef<HTMLInputElement>(null), density: useRef<HTMLInputElement>(null) };
  const outputRefs = { radius: useRef<HTMLOutputElement>(null), density: useRef<HTMLOutputElement>(null) };
  const rebuild = useRef<Rebuild | null>(null);
  const time = useRef(0);
  const speedRef = useRef(1);
  // Values the visitor set by hand while the demo was paused; the animation takes over again on play.
  const manual = useRef<Partial<Record<Slider, number>>>({});
  const drawn = useRef({ tokens: '', status: '', crew: '', scroll: [-1, -1], phase: '', boxes: [] as string[], last: 0 });

  useEffect(() => setPages(choosePages()), []);
  useEffect(() => {
    if (!pages) return;
    speedRef.current = pages.speed;
    setSpeed(pages.speed);
    if (!pages.record) return;
    document.documentElement.setAttribute('data-demo-record', '');
    return () => document.documentElement.removeAttribute('data-demo-record');
  }, [pages]);

  const plan: Plan | null = useMemo(
    () => (measured ? makePlan({ spots: measured.spots, extra: measured.extra, layers: measured.layers, beforeH: measured.beforeH, afterH: measured.afterH, tune: measured.base.radius.length > 0 && measured.base.density.length > 0 }) : null),
    [measured],
  );
  // Each agent's jobs, to find the one it is on without scanning every job each frame.
  const jobsBy = useMemo(() => (plan ? Array.from({ length: plan.build.count }, (_, a) => plan.build.jobs.filter((j) => j.agent === a)) : []), [plan]);

  // Measure once the four frames have loaded: the detector in each, the after page's layers and tokens.
  useEffect(() => {
    if (!pages) return;
    let live = true;
    (async () => {
      const frames = [beforeRef.current, afterRef.current, beforeNarrowRef.current, afterNarrowRef.current];
      if (frames.some((f) => !f)) return;
      const [bw, aw, bn, an] = await Promise.all(frames.map((f) => loaded(f as HTMLIFrameElement)));
      await addScript(bw.document, rules);
      await Promise.all([bw, aw, bn, an].map((w) => addScript(w.document, detect)));
      await Promise.all([bw, aw, bn, an].map((w) => w.document.fonts.ready));
      for (const w of [bw, aw]) w.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (!bw.tasterDetect || !aw.tasterDetect) throw new Error('the detector did not start');
      const rb = bw.tasterDetect({ maxPerRule: 40 });
      const ra = aw.tasterDetect({ maxPerRule: 40 });
      // The narrow frames add the rules only a phone width shows; the demo still runs if they cannot be measured.
      const narrow = (w: FrameWindow) => {
        try {
          return Object.keys(w.tasterDetect?.({ maxPerRule: 1 }).counts ?? {});
        } catch {
          return [];
        }
      };
      const wide = Object.keys(rb.counts);
      const extra = narrow(bn).filter((id) => !wide.includes(id));
      const stays = [...new Set([...Object.keys(ra.counts), ...narrow(an)])];
      const beforeH = pageHeight(bw.document);
      const afterH = pageHeight(aw.document);
      const base = tokenBase(aw.document);
      const built = layersOf(aw.document);
      rebuild.current = built;
      const names = Object.fromEntries(Object.entries(bw.__tasterRules ?? {}).map(([id, r]) => [id, r.name]));
      const result: Measured = { spots: spotsOf(rb, beforeH), extra, names, found: [...wide, ...extra], stays, layers: built.layers, beforeH, afterH, base };
      if (live) setMeasured(result);
    })().catch(() => {
      if (live) setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [pages, detect, rules]);

  // The frames are laid out at 1300 wide and scaled to the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => setScale(stage.clientWidth / VIEW.w);
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
      for (const which of SLIDERS) {
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
    (t: number, live: boolean) => {
      if (!measured || !plan || !scale) return;
      const { spots, layers } = measured;
      const cam = cameraAt(plan, t);
      const phase = phaseAt(plan, t);
      const forward = live && t >= drawn.current.last;
      drawn.current.last = t;

      // The camera: both frames scroll to it, each as far as its page goes.
      const scrolls = [
        [beforeRef.current, measured.beforeH],
        [afterRef.current, measured.afterH],
      ] as const;
      scrolls.forEach(([frame, h], k) => {
        const y = Math.round(Math.min(cam, Math.max(0, h - VIEW.h)));
        if (drawn.current.scroll[k] === y) return;
        drawn.current.scroll[k] = y;
        frame?.contentWindow?.scrollTo({ top: y, left: 0, behavior: 'instant' });
      });
      const cross = crossAt(plan, t);
      if (beforeWrapRef.current) beforeWrapRef.current.style.opacity = String(1 - cross);
      if (afterWrapRef.current) afterWrapRef.current.style.opacity = String(cross);

      // The after page, layer by layer.
      const built = rebuild.current;
      if (built) {
        built.run(t < plan.end);
        for (let i = 0; i < layers.length; i++) {
          const st = layerAt(plan, layers, i, t);
          built.show(i, st.shown, forward);
          built.type(i, st.typed);
        }
      }

      const sx = (x: number) => x * scale;
      const sy = (y: number) => (y - cam) * scale;

      // Diagnose: an outline per spot and a chip with its rules while its agent is there.
      spots.forEach((s, i) => {
        const el = markRefs.current[i];
        if (!el) return;
        const m = markAt(plan, i, t);
        el.style.transform = `translate(${sx(s.box.x).toFixed(1)}px, ${sy(s.box.y).toFixed(1)}px)`;
        el.style.width = `${(s.box.w * scale * m.drawn).toFixed(1)}px`;
        el.style.height = `${(s.box.h * scale * m.drawn).toFixed(1)}px`;
        el.style.opacity = m.drawn > 0 ? String(m.fade) : '0';
        el.toggleAttribute('data-chip', m.chip);
      });
      extraRef.current?.toggleAttribute('data-on', t >= plan.diag.extraAt && t < plan.cross.start);

      // Rebuild: each agent's box, with the layer's size, while it works there.
      jobsBy.forEach((jobs, a) => {
        const el = boxRefs.current[a];
        if (!el) return;
        const job = jobs.find((j) => t >= j.arrive && t < j.done + 0.3);
        const st = job ? layerAt(plan, layers, job.target, t) : null;
        if (!job || !st || st.box === null) {
          el.style.opacity = '0';
          return;
        }
        const b = layers[job.target].box;
        el.style.opacity = t > job.done ? String(1 - (t - job.done) / 0.3) : '1';
        el.style.transform = `translate(${sx(b.x).toFixed(1)}px, ${sy(b.y).toFixed(1)}px)`;
        el.style.width = `${(b.w * scale * st.box).toFixed(1)}px`;
        el.style.height = `${(b.h * scale * st.box).toFixed(1)}px`;
        const label = `${b.w} x ${b.h}`;
        if (drawn.current.boxes[a] !== label) {
          drawn.current.boxes[a] = label;
          const tag = el.firstElementChild;
          if (tag) tag.textContent = label;
        }
      });

      // The bar.
      const found = foundAt(plan, spots, measured.extra, t).size;
      const shown = layersShownAt(plan, layers, t);
      const crewNow = phase === 'diagnose' ? plan.diag.count : plan.build.count;
      const status =
        phase === 'diagnose' ? `규칙 ${found}개 찾음` : phase === 'rebuild' ? `레이어 ${shown} / ${layers.length}` : phase === 'tune' ? '토큰 조정' : `레이어 ${layers.length} / ${layers.length}`;
      const total = plan.end;
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${Math.min(1, t / total).toFixed(4)})`;
      if (drawn.current.status !== status && statusRef.current) {
        drawn.current.status = status;
        statusRef.current.textContent = status;
      }
      const crewText = `${phase === 'diagnose' ? '진단' : '재구성'} 에이전트 ${crewNow}`;
      if (drawn.current.crew !== crewText && crewRef.current) {
        drawn.current.crew = crewText;
        crewRef.current.textContent = crewText;
        dotsRef.current?.setAttribute('data-crew', phase === 'diagnose' ? 'diagnose' : 'build');
      }
      if (drawn.current.phase !== phase) {
        drawn.current.phase = phase;
        boardRef.current?.setAttribute('data-phase', phase);
        tuneRef.current?.toggleAttribute('data-on', phase === 'tune' || phase === 'end');
        setEnded(phase === 'end');
      }

      const auto = tokensAt(plan, t);
      applyTokens({ radius: manual.current.radius ?? auto.radius, density: manual.current.density ?? auto.density });

      // Cursors, in pixels of the board (the stage and the panels over it).
      const board = boardRef.current;
      const stage = stageRef.current;
      if (!board || !stage || reduced) return;
      const b = board.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const ox = st.left - b.left;
      const oy = st.top - b.top;
      const place = (el: HTMLElement | null, x: number, y: number, on: boolean) => {
        if (!el) return;
        el.style.opacity = on ? '1' : '0';
        if (!on) return;
        const cx = Math.max(-20, Math.min(b.width + 20, x));
        const cy = Math.max(-20, Math.min(b.height + 20, y));
        el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
        el.toggleAttribute('data-flip', cx > b.width - 90);
      };
      const crews: [Crew, number][] = [
        [plan.diag, 0],
        [plan.build, plan.diag.count],
      ];
      for (const [c, offset] of crews) {
        for (let a = 0; a < c.count; a++) {
          const pose = agentAt(c, a, t);
          place(cursorRefs.current[offset + a], ox + sx(pose.at.x), oy + sy(pose.at.y), pose.on);
        }
      }
      const sys = systemAt(plan, t);
      const resolve = (a: Anchor): [number, number] => {
        const which = a.which === 'rest' ? 'density' : a.which;
        const r = sliderRefs[which].current?.getBoundingClientRect();
        if (!r) return [0, 0];
        if (a.which === 'rest') return [r.left - b.left + r.width / 2, r.bottom - b.top + 24];
        const range = TOKEN_RANGE[which];
        const f = (a.value - range.min) / (range.max - range.min);
        return [r.left - b.left + THUMB / 2 + f * (r.width - THUMB), r.top - b.top + r.height / 2];
      };
      const [x0, y0] = resolve(sys.from);
      const [x1, y1] = resolve(sys.to);
      place(systemRef.current, x0 + (x1 - x0) * sys.p, y0 + (y1 - y0) * sys.p, sys.on);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measured, plan, jobsBy, scale, reduced, applyTokens],
  );

  // Paused, reduced or freshly laid out: draw the one frame that should be on screen now.
  useEffect(() => {
    if (!plan) return;
    if (reduced) time.current = plan.end;
    drawn.current.scroll = [-1, -1];
    draw(time.current, false);
  }, [plan, reduced, scale, draw]);

  useEffect(() => {
    if (!plan || reduced || !playing || !onScreen) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      time.current = Math.min(plan.end, time.current + Math.min(0.1, Math.max(0, (now - last) / 1000)) * speedRef.current);
      last = now;
      draw(time.current, true);
      if (time.current < plan.end) raf = requestAnimationFrame(frame);
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
    drawn.current.last = 0;
    for (const el of document.querySelectorAll<HTMLInputElement>('.demo-tune input')) el.blur();
    draw(0, false);
    setPlaying(true);
  };
  const toggleSpeed = () => {
    const next = speedRef.current === 1 ? 2 : 1;
    speedRef.current = next;
    setSpeed(next);
  };
  const onSlide = (which: Slider, value: number) => {
    setPlaying(false);
    manual.current = { ...manual.current, [which]: value };
    if (plan) applyTokens({ radius: manual.current.radius ?? tokensAt(plan, time.current).radius, density: manual.current.density ?? tokensAt(plan, time.current).density });
  };

  const state = failed ? 'failed' : !measured ? 'measuring' : ended ? 'end' : 'playing';
  const total = measured?.found.length ?? 0;
  const left = measured?.stays.length ?? 0;
  const agents = plan?.build.count ?? 0;
  const pagesNow = pages ?? EXAMPLE;
  return (
    <section className="demo" aria-labelledby="demo-stage-title" data-reduced={reduced ? '' : undefined} data-record={pages?.record ? '' : undefined}>
      <h2 id="demo-stage-title" className="visually-hidden">
        에이전트가 다시 짓는 데모
      </h2>
      <div className="demo-board" ref={boardRef} data-state={state} data-phase="diagnose">
        <div className="demo-stage" ref={stageRef} style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }} inert>
          <div className="demo-frames" style={{ width: VIEW.w, height: VIEW.h, transform: scale ? `scale(${scale})` : undefined }}>
            {pages ? (
              <>
                <div className="demo-frame" ref={beforeWrapRef}>
                  <iframe ref={beforeRef} src={pages.before} title="고치기 전 페이지" tabIndex={-1} width={VIEW.w} height={VIEW.h} />
                </div>
                <div className="demo-frame demo-after" ref={afterWrapRef} data-whole={failed || undefined}>
                  <iframe ref={afterRef} src={pages.after} title="다시 지은 페이지" tabIndex={-1} width={VIEW.w} height={VIEW.h} />
                </div>
              </>
            ) : null}
          </div>
          <div className="demo-marks">
            {measured?.spots.map((s, i) => (
              <div
                key={i}
                className="demo-mark"
                data-in={s.box.h > VIEW.h * 0.4 || s.box.y + s.box.h > measured.beforeH - 80 ? '' : undefined}
                ref={(el) => {
                  markRefs.current[i] = el;
                }}
              >
                <span className="demo-chip">
                  {s.rules.map((id) => (
                    <span key={id}>
                      <code>{id}</code> <span className="demo-chip-name">{measured.names[id] ?? ''}</span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {measured?.extra.length ? (
              <div className="demo-extra" ref={extraRef}>
                {measured.extra.map((id) => (
                  <span key={id}>
                    <code>{id}</code> <span className="demo-chip-name">{measured.names[id] ?? ''}</span>, 390 폭에서
                  </span>
                ))}
              </div>
            ) : null}
            {plan
              ? Array.from({ length: plan.build.count }, (_, a) => (
                  <div
                    key={a}
                    className="demo-box"
                    style={{ ['--turn' as string]: String(Math.round((a * 360) / plan.build.count)) }}
                    ref={(el) => {
                      boxRefs.current[a] = el;
                    }}
                  >
                    <span className="demo-size" />
                  </div>
                ))
              : null}
          </div>
        </div>

        <div className="demo-dock" data-end={ended || undefined}>
          <div className="demo-play">
            <p className="demo-live">
              <span className="demo-dots" ref={dotsRef} data-crew="diagnose" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <i key={i} style={{ ['--turn' as string]: String(i * 72) }} />
                ))}
              </span>
              <span ref={crewRef}>{failed ? '' : '에이전트'}</span>
              <b ref={statusRef}>{failed ? '검사기를 불러오지 못해 데모를 멈췄습니다' : measured ? '' : '검사기를 돌리는 중입니다'}</b>
            </p>
            <span className="demo-line" aria-hidden="true">
              <span ref={lineRef} />
            </span>
            {reduced ? null : (
              <div className="demo-buttons">
                <button type="button" className="demo-quiet" onClick={toggleSpeed} disabled={!measured} aria-label={`재생 속도 ${speed}x, 누르면 ${speed === 1 ? 2 : 1}x`}>
                  {speed}x
                </button>
                <button type="button" className="demo-quiet" onClick={play} disabled={!measured}>
                  {playing ? '일시 정지' : '재생'}
                </button>
                <button type="button" className="demo-quiet" onClick={replay} disabled={!measured}>
                  처음부터
                </button>
              </div>
            )}
          </div>
          <div className="demo-end">
            <p className="demo-done">
              <span>
                에이전트 <b>{agents}</b>개가 <b>{plan ? plan.rebuildSeconds.toFixed(1) : ''}</b>초 만에 다시 지었습니다
              </span>
              <span>
                규칙 <b>{total}</b>개 → <b>{left}</b>개
              </span>
            </p>
            <div className="demo-buttons">
              <a className="demo-open" href={pagesNow.after} target="_blank" rel="noreferrer">
                다시 지은 페이지 열기
              </a>
              {reduced ? null : (
                <button type="button" className="demo-quiet" onClick={replay}>
                  다시 보기
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="demo-tune" ref={tuneRef} role="group" aria-label="다시 지은 페이지의 토큰" hidden={Boolean(plan && !plan.tune)}>
          {SLIDERS.map((which) => (
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

        {reduced || !plan ? null : (
          <div className="demo-cursors" aria-hidden="true">
            {Array.from({ length: plan.diag.count + plan.build.count }, (_, i) => {
              const diag = i < plan.diag.count;
              const n = diag ? i : i - plan.diag.count;
              return (
                <div
                  key={i}
                  className="demo-cursor"
                  data-who={diag ? 'diagnose' : 'build'}
                  style={diag ? undefined : { ['--turn' as string]: String(Math.round((n * 360) / plan.build.count)) }}
                  ref={(el) => {
                    cursorRefs.current[i] = el;
                  }}
                >
                  <svg viewBox="0 0 22 22" aria-hidden="true" style={{ marginLeft: -ARROW_TIP.x, marginTop: -ARROW_TIP.y }}>
                    <path d={ARROW_PATH} />
                  </svg>
                  <span className="demo-cursor-tag">{diag ? `진단 ${n + 1}` : `에이전트 ${two(n + 1)}`}</span>
                </div>
              );
            })}
            <div className="demo-cursor" data-who="system" ref={systemRef}>
              <svg viewBox="0 0 22 22" aria-hidden="true" style={{ marginLeft: -ARROW_TIP.x, marginTop: -ARROW_TIP.y }}>
                <path d={ARROW_PATH} />
              </svg>
              <span className="demo-cursor-tag">시스템</span>
            </div>
          </div>
        )}

        {pages ? (
          <div className="demo-narrow" aria-hidden="true" inert>
            <iframe ref={beforeNarrowRef} src={pages.before} title="고치기 전 페이지, 390 폭" tabIndex={-1} width={NARROW.w} height={NARROW.h} />
            <iframe ref={afterNarrowRef} src={pages.after} title="다시 지은 페이지, 390 폭" tabIndex={-1} width={NARROW.w} height={NARROW.h} />
          </div>
        ) : null}
      </div>

      {reduced ? <p className="demo-note">움직임 줄이기 설정이라 마지막 화면만 보여 줍니다. 각 단계는 아래 목록에 글로 적었습니다.</p> : null}
      <p className="demo-result">
        {measured && plan
          ? `고치기 전 페이지에서 규칙 ${total}개(1300 폭과 390 폭), 다시 지은 페이지에서 ${left}개. 다시 지은 페이지의 레이어 ${measured.layers.length}개를 에이전트 ${agents}개가 쌓았습니다.`
          : '두 페이지에서 잰 규칙 수와 레이어 수가 여기에 나옵니다.'}
        {measured?.stays.length ? ` 다시 지은 페이지에 남은 규칙: ${measured.stays.map((id) => `${id} ${measured.names[id] ?? ''}`.trim()).join(', ')}.` : ''}
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
        수는 이 브라우저가 1300 폭 창과 390 폭 창에서 잰 값을 합친 것이라, 저장소 README 의 수와 같은 기준입니다. 고치기 전 수에는 390
        폭에서만 걸리는 규칙(RSP-01, 화면보다 넓은 페이지)이 들어 있습니다. 레이어는 다시 지은 페이지에서 상자를 만드는 요소와 글줄이고,
        걸린 시간은 이 데모가 1배속으로 레이어를 쌓는 시간입니다. 다시 지은 페이지는 어두운 판이 기본이고, 기기가 밝은 화면을 고르면 같은
        시스템의 밝은 판으로 바뀝니다.
      </p>
    </section>
  );
}
