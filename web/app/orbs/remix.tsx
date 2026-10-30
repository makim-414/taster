'use client';
import { useEffect, useMemo, useState } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { ORB_KNOBS, ORB_STATES, decodeRecipe, encodeRecipe, recipeToCode, sanitizeRecipe, type OrbRecipe, type OrbRecipeState } from '../../../registry/src/motion/_orb-recipe.ts';
import { ORB_RECIPES } from '../../../registry/src/motion/orb-recipes.ts';
import { TASTER_MARK_CODE, tasterMark } from './frames.ts';

const STATE_LABEL: Record<OrbRecipeState, string> = {
  working: 'working, 일하는 중',
  searching: 'searching, 찾는 중',
  solving: 'solving, 푸는 중',
  listening: 'listening, 듣는 중',
  connecting: 'connecting, 도구 연결',
  weaving: 'weaving, 자료 엮기',
  composing: 'composing, 글 쓰는 중',
  breathing: 'breathing, 기다리는 중',
  shaping: 'shaping, 모양 만드는 중',
};
// The knob names in the shared file are English, for the package; this page speaks Korean.
const KNOB_LABEL: Record<string, string> = {
  particles: '입자 수',
  ghostA: '궤도 진하기',
  scanMul: '스캔 세기',
  dimBase: '스캔 전 밝기',
  moveCount: '움직임 수',
  rings: '고리 수',
  thr: '연결 거리',
  signals: '신호 수',
  lineW: '선 굵기',
  turns: '꼬임 수',
  bandMul: '띠 너비',
  wobMul: '흔들림',
  spin: '회전',
  shape: '모양 고정 (-1 순환, 0 원, 1 삼각, 2 사각)',
  spread: '퍼짐',
};
const BRAND = '#2f6f5e';
const REPO = 'https://github.com/makim-414/taster';

function colorOf(recipe: OrbRecipe): string | undefined {
  if (!recipe.tint || recipe.tint === 'ink') return undefined;
  return recipe.tint === 'brand' ? BRAND : recipe.tint;
}

function Orb({ recipe, size = 64 }: { recipe: OrbRecipe; size?: 64 | 32 | 20 }) {
  return <ThinkingOrb state={recipe.state} size={size} speed={recipe.speed} dots={recipe.dots} dotSize={recipe.dotSize} opts={recipe.opts} color={colorOf(recipe)} theme="light" />;
}

function Slider({ id, label, min, max, step, value, onChange }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="knob">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{Number(value.toFixed(2))}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="orb-copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? '복사했습니다' : label}
    </button>
  );
}

export function Remix() {
  const [recipe, setRecipe] = useState<OrbRecipe>(() => sanitizeRecipe(ORB_RECIPES[0])!);
  const [origin, setOrigin] = useState('https://taster-six.vercel.app');

  // A share link opens on its recipe; the address follows every change, so copying it always shares what is on screen.
  useEffect(() => {
    setOrigin(window.location.origin);
    const shared = new URLSearchParams(window.location.search).get('r');
    const decoded = shared ? decodeRecipe(shared) : null;
    if (decoded) setRecipe(decoded);
  }, []);
  const encoded = useMemo(() => encodeRecipe(recipe), [recipe]);
  useEffect(() => {
    window.history.replaceState(null, '', `/orbs?r=${encoded}`);
  }, [encoded]);

  const set = (patch: Partial<OrbRecipe>) => setRecipe((r) => sanitizeRecipe({ ...r, ...patch })!);
  const setOpt = (key: string, value: number) => setRecipe((r) => sanitizeRecipe({ ...r, opts: { ...r.opts, [key]: value } })!);
  const tintMode = !recipe.tint || recipe.tint === 'ink' ? 'ink' : recipe.tint === 'brand' ? 'brand' : 'custom';
  const code = `npm install thinking-orbs\n\nimport { ThinkingOrb } from 'thinking-orbs'\n\n${recipeToCode(recipe).replace('tint="brand"', 'color="#your-brand"').replace(/tint="(#[^"]+)"/, 'color="$1"')}`;
  const json = JSON.stringify({ id: 'your-recipe', name: 'Your recipe', by: 'your-github-handle', note: 'One sentence: what this variation is for.', ...recipe }, null, 2);

  return (
    <main className="page">
      <header className="masthead">
        <p className="wordmark">
          <a href="/">Taster</a>
        </p>
        <p className="tagline">오브를 내 제품에 맞게 바꿉니다</p>
      </header>

      <section className="intro" aria-labelledby="orbs-title">
        <h1 id="orbs-title">모두 같은 오브를 쓰면, 그것도 슬롭이 됩니다</h1>
        <p className="lede">에이전트가 일하는 동안 보이는 점 오브입니다. 값을 돌려 내 제품의 것으로 만들고, 주소로 공유하고, 코드로 가져가세요. 상태는 멋이 아니라 에이전트가 지금 하는 일에 맞춰 고릅니다.</p>
      </section>

      <section className="orb-lab" aria-label="오브 조절">
        <div className="orb-stage">
          <div className="orb-sizes">
            <Orb recipe={recipe} size={64} />
            <Orb recipe={recipe} size={32} />
            <Orb recipe={recipe} size={20} />
          </div>
          <p className="orb-status">
            <Orb recipe={recipe} size={20} />
            <span>{STATE_LABEL[recipe.state].split(', ')[1]}</span>
          </p>
        </div>
        <div className="orb-controls">
          <div className="knob knob-wide">
            <label htmlFor="orb-state">상태</label>
            <select id="orb-state" value={recipe.state} onChange={(e) => setRecipe({ state: e.target.value as OrbRecipeState, speed: recipe.speed, dots: recipe.dots, dotSize: recipe.dotSize, tint: recipe.tint })}>
              {ORB_STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <Slider id="orb-speed" label="속도" min={0.1} max={3} step={0.05} value={recipe.speed ?? 1} onChange={(v) => set({ speed: v })} />
          <Slider id="orb-dots" label="점 개수" min={0.2} max={3} step={0.05} value={recipe.dots ?? 1} onChange={(v) => set({ dots: v })} />
          <Slider id="orb-size" label="점 크기" min={0.4} max={2.5} step={0.05} value={recipe.dotSize ?? 1} onChange={(v) => set({ dotSize: v })} />
          {ORB_KNOBS[recipe.state].map((k) => (
            <Slider key={k.key} id={`orb-${k.key}`} label={KNOB_LABEL[k.key] ?? k.label} min={k.min} max={k.max} step={k.step} value={recipe.opts?.[k.key] ?? k.value} onChange={(v) => setOpt(k.key, v)} />
          ))}
          <fieldset className="knob knob-wide orb-tint">
            <legend>색</legend>
            <label>
              <input type="radio" name="tint" checked={tintMode === 'ink'} onChange={() => set({ tint: 'ink' })} /> 기본 잉크
            </label>
            <label>
              <input type="radio" name="tint" checked={tintMode === 'brand'} onChange={() => set({ tint: 'brand' })} /> 브랜드색
            </label>
            <label>
              <input type="radio" name="tint" checked={tintMode === 'custom'} onChange={() => set({ tint: '#2f4f8f' })} /> 직접
              <input type="color" aria-label="직접 고른 색" value={tintMode === 'custom' ? recipe.tint : '#2f4f8f'} onChange={(e) => set({ tint: e.target.value })} />
            </label>
          </fieldset>
        </div>
      </section>

      <section className="install orb-wide" aria-labelledby="take-title">
        <h2 id="take-title">가져가기</h2>
        <div className="copyline orb-code">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
        <div className="orb-actions">
          <Copy text={code} label="코드 복사" />
          <Copy text={`${origin}/orbs?r=${encoded}`} label="공유 주소 복사" />
          <Copy text={json} label="레시피 복사" />
        </div>
        <p>
          잘 나온 변형은 모음집에 올려 주세요. 레시피를 <a href={`${REPO}/edit/main/registry/recipes/orbs.json`}>registry/recipes/orbs.json</a> 에 더해 PR 을 보내면, 검사를 통과한 뒤 아래에 만든 사람 이름과 함께 실립니다.
        </p>
      </section>

      <section className="install orb-wide" aria-labelledby="gallery-title">
        <h2 id="gallery-title">모음집</h2>
        <ul className="orb-gallery">
          {ORB_RECIPES.map((r) => (
            <li key={r.id}>
              <button type="button" className="orb-card" onClick={() => setRecipe(sanitizeRecipe(r)!)} aria-label={`${r.name} 불러오기`}>
                <Orb recipe={sanitizeRecipe(r)!} size={64} />
                <span className="orb-card-name">{r.name}</span>
                <span className="orb-card-note">{r.note}</span>
                <span className="orb-card-by">{r.by}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="install orb-wide" aria-labelledby="frame-title">
        <h2 id="frame-title">모양까지 바꾸기</h2>
        <p>값으로 부족하면 frame 으로 모양 자체를 바꿉니다. 내 로고를 점으로 찍어 돌리는 것도 됩니다. 아래는 Taster 의 T 입니다.</p>
        <div className="orb-frame">
          <ThinkingOrb frame={tasterMark} size={64} theme="light" aria-label="점으로 찍은 T" />
          <div className="copyline orb-code">
            <pre>
              <code>{TASTER_MARK_CODE}</code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="colophon">
        <p>
          오브는 Jakub Antalik 의 <a href="https://libraries.dev/orbs">thinking-orbs</a> 입니다(MIT). Taster 는 변형을 데이터로 나누는 틀만 얹었습니다. <a href={REPO}>GitHub 저장소</a>.
        </p>
      </footer>
    </main>
  );
}
