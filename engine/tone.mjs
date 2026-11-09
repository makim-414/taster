// The tone step: a spot on two axes (x: commerce 0 to brand personality 1, y: minimal 0 to expressive 1) and an
// optional genre become the nearest real references (taxonomy/tone-refs.json) and a set of token values. Pure
// functions with no file or browser access, so the MCP tool (server.mjs) and the web page (apps/web/app/tone) import
// the same code and answer the same.
//
// The spot sets the eight weighting axes by their ids and snap steps (density, contrast, roundness, type-expression,
// color-restraint, elevation, motion, stroke). `toneAxes` returns them as { id: step }, the shape a design system
// takes as builder intent. The rule: each corner of the map holds one setting, the spot blends the four, the genre
// nudges, every value snaps to its nearest step, and the result goes through the design system's balance()
// (taxonomy/axes.mjs), so a tone never breaks a design constraint (for example, loud type only with quiet color) and
// what the tone page shows is what design_system would build from these axes. Readability is a floor, not a dial: no
// setting lowers text contrast below the defaults.
import { balance } from '../taxonomy/axes.mjs';

export const TONE_AXES = [
  { id: 'density', name: 'Density', ko: '밀도', steps: [0, 0.25, 0.5, 0.75, 1], names: ['spacious', 'airy', 'regular', 'snug', 'compact'], namesKo: ['넉넉함', '여유', '보통', '촘촘', '빽빽'] },
  { id: 'contrast', name: 'Contrast', ko: '대비', steps: [0.25, 0.5, 0.75, 1], names: ['minimum', 'standard', 'crisp', 'maximum'], namesKo: ['최소', '보통', '또렷', '최대'] },
  { id: 'roundness', name: 'Roundness', ko: '둥글기', steps: [0, 0.25, 0.5, 0.75, 1], names: ['square', 'crisp', 'soft', 'round', 'pillow'], namesKo: ['각짐', '살짝', '부드러움', '둥긂', '아주 둥긂'] },
  { id: 'type-expression', name: 'Type expression', ko: '글자 표현', steps: [0, 0.25, 0.5, 0.75, 1], names: ['quiet', 'plain', 'branded', 'display', 'poster'], namesKo: ['조용', '담백', '브랜드', '디스플레이', '포스터'] },
  { id: 'color-restraint', name: 'Color restraint', ko: '색 절제', steps: [0.5, 0.75, 1], names: ['two-hue', 'one-hue', 'achromatic'], namesKo: ['두 색', '한 색', '무채색'] },
  { id: 'elevation', name: 'Elevation', ko: '깊이', steps: [0, 0.25, 0.5, 0.75, 1], names: ['flat', 'lifted', 'raised', 'floating', 'layered'], namesKo: ['평평', '살짝 뜸', '뜸', '떠 있음', '겹침'] },
  { id: 'motion', name: 'Motion', ko: '움직임', steps: [0, 0.25, 0.5, 0.75, 1], names: ['still', 'minimal', 'standard', 'lively', 'expressive'], namesKo: ['정지', '최소', '보통', '활발', '화려'] },
  { id: 'stroke', name: 'Stroke', ko: '선', steps: [0, 0.25, 0.5, 0.75, 1], names: ['none', 'hairline', 'light', 'medium', 'heavy'], namesKo: ['없음', '머리카락', '가늘게', '보통', '굵게'] },
];

// One setting per corner of the map, named after the quadrants in tone-refs.json. Each corner already keeps every
// design constraint: loud type only with quiet color, so the launch corner is colorful with branded type and the
// studio corner has poster type in ink.
const CORNERS = {
  'clean-saas': { density: 0.7, contrast: 0.5, roundness: 0.5, 'type-expression': 0.25, 'color-restraint': 1, elevation: 0.25, motion: 0.25, stroke: 0.25 },
  'launch-promo': { density: 0.3, contrast: 0.75, roundness: 0.75, 'type-expression': 0.5, 'color-restraint': 0.5, elevation: 0.75, motion: 1, stroke: 0 },
  'editorial-luxury': { density: 0, contrast: 0.5, roundness: 0, 'type-expression': 0.5, 'color-restraint': 1, elevation: 0, motion: 0, stroke: 0.5 },
  'creative-studio': { density: 0.3, contrast: 1, roundness: 0.1, 'type-expression': 1, 'color-restraint': 1, elevation: 0.1, motion: 1, stroke: 0.5 },
};

// A genre moves a few axes the same way wherever the spot is, after what its sites share (tone-refs.json genres).
// Geek and developer sites are denser, sharper, flatter and more lined than their spot alone says; editorial ones
// airier, squarer and louder in type; and so on. Monospace body text is not one of them: Taster flags it (AC-09).
const GENRE_NUDGE = {
  geek: { density: 0.35, contrast: 0.25, roundness: -0.25, elevation: -0.25, stroke: 0.25 },
  editorial: { density: -0.25, roundness: -0.25, 'type-expression': 0.25, 'color-restraint': 0.25, elevation: -0.25 },
  illustration: { roundness: 0.35, 'color-restraint': -0.25, motion: 0.25 },
  'product-photo': { 'type-expression': 0.25, 'color-restraint': 0.25, elevation: -0.25, stroke: -0.25 },
  'product-screen': { 'type-expression': -0.25, 'color-restraint': 0.25, elevation: 0.25 },
  utility: { density: 0.5, roundness: -0.5, 'type-expression': -0.25, 'color-restraint': 0.25, elevation: -0.25, motion: -0.25, stroke: 0.25 },
};

// The brand color the parts wear when the visitor has not given one and the spot calls for color. Only a stand in.
export const DEMO_BRAND = '#0b5cd5';

const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
const round2 = (v) => Math.round(v * 100) / 100;

/** A spot from loose input: numbers or strings, clamped to 0..1 and rounded to two decimals. */
export function readSpot({ x, y } = {}) {
  return { x: round2(clamp01(Number(x ?? 0.5))), y: round2(clamp01(Number(y ?? 0.5))) };
}

export function snap(axis, value) {
  const a = typeof axis === 'string' ? TONE_AXES.find((t) => t.id === axis) : axis;
  let best = a.steps[0];
  for (const s of a.steps) if (Math.abs(s - value) < Math.abs(best - value) - 1e-9) best = s;
  return best;
}

// balance() searches the snapped grid for the smallest change that keeps every constraint. The spot moves every frame
// while dragging, so results are kept per snapped setting (a few hundred at most).
const balanced = new Map();

/** The eight axes for a spot, each on its snap step and inside every design constraint. */
export function toneAxes(spot, genre) {
  const { x, y } = readSpot(spot);
  const nudge = GENRE_NUDGE[genre] || {};
  const out = {};
  for (const a of TONE_AXES) {
    const c = (q) => CORNERS[q][a.id];
    const blended = (1 - x) * (1 - y) * c('clean-saas') + (1 - x) * y * c('launch-promo') + x * (1 - y) * c('editorial-luxury') + x * y * c('creative-studio');
    out[a.id] = snap(a, clamp01(blended + (nudge[a.id] || 0)));
  }
  const key = TONE_AXES.map((a) => out[a.id]).join(',');
  if (!balanced.has(key)) balanced.set(key, balance(out));
  const kept = balanced.get(key);
  return Object.fromEntries(TONE_AXES.map((a) => [a.id, kept[a.id]]));
}

/** The axes with their names and step names, for people. */
export function describeAxes(axes) {
  return TONE_AXES.map((a) => {
    const i = a.steps.indexOf(axes[a.id]);
    return { id: a.id, name: a.name, ko: a.ko, value: axes[a.id], step: a.names[i], stepKo: a.namesKo[i] };
  });
}

// ---- axes to tokens. Names are the ones registry/src/tokens.css defines; values differ per theme where the base does.
const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48, 16: 64 };
const DENSITY = { 0: [1.25, 1.65, 1.35], 0.25: [1.125, 1.6, 1.32], 0.5: [1, 1.5, 1.3], 0.75: [0.875, 1.45, 1.25], 1: [0.75, 1.4, 1.2] };
const RADIUS = { 0: '0rem', 0.25: '0.25rem', 0.5: '0.625rem', 0.75: '0.875rem', 1: '1.25rem' };
// Muted and subtle text never go lighter (dark) or paler (light) than the defaults, which already hold 4.5:1.
const CONTRAST = {
  dark: { 0.25: [0.708, 0.65, 0.25], 0.5: [0.708, 0.65, 0.269], 0.75: [0.78, 0.72, 0.29], 1: [0.86, 0.8, 0.31] },
  light: { 0.25: [0.46, 0.52, 0.97], 0.5: [0.46, 0.52, 0.965], 0.75: [0.4, 0.46, 0.955], 1: [0.32, 0.38, 0.945] },
};
const TYPE = {
  0: [30, 26, 21, 16, 1.2, 500],
  0.25: [32, 28, 22, 16, 1.15, 600],
  0.5: [36, 30, 24, 16, 1.1, 600],
  0.75: [44, 34, 26, 17, 1.05, 600],
  1: [56, 40, 28, 18, 1, 600],
};
const ELEVATION = {
  dark: {
    0: ['none', '0 0 0 1px var(--border)', '2%'],
    0.25: ['0 1px 2px rgba(0,0,0,.3), 0 1px 1px rgba(0,0,0,.2)', '0 8px 24px rgba(0,0,0,.35)', '3%'],
    0.5: ['0 2px 6px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.25)', '0 12px 32px rgba(0,0,0,.4)', '5%'],
    0.75: ['0 8px 20px rgba(0,0,0,.4), 0 2px 4px rgba(0,0,0,.25)', '0 16px 40px rgba(0,0,0,.45)', '6%'],
    1: ['0 1px 1px rgba(0,0,0,.25), 0 6px 12px rgba(0,0,0,.3), 0 18px 36px rgba(0,0,0,.3)', '0 24px 56px rgba(0,0,0,.5)', '7%'],
  },
  light: {
    0: ['none', '0 0 0 1px var(--border)'],
    0.25: ['0 1px 2px oklch(0.24 0.02 280 / 6%), 0 1px 1px oklch(0.24 0.02 280 / 4%)', '0 8px 24px oklch(0.24 0.04 280 / 12%)'],
    0.5: ['0 2px 6px oklch(0.24 0.02 280 / 8%), 0 1px 2px oklch(0.24 0.02 280 / 6%)', '0 12px 32px oklch(0.24 0.04 280 / 14%)'],
    0.75: ['0 8px 20px oklch(0.24 0.02 280 / 10%), 0 2px 4px oklch(0.24 0.02 280 / 6%)', '0 16px 40px oklch(0.24 0.04 280 / 16%)'],
    1: ['0 1px 1px oklch(0.24 0.02 280 / 6%), 0 6px 12px oklch(0.24 0.02 280 / 8%), 0 18px 36px oklch(0.24 0.02 280 / 10%)', '0 24px 56px oklch(0.24 0.04 280 / 18%)'],
  },
};
// press, tooltip, dropdown, modal (ms), stagger (ms), press scale, enter scale, enter offset (px), blur mask (px)
const MOTION = {
  0: [1, 1, 1, 1, 0, 1, 1, 0, 0],
  0.25: [120, 100, 150, 300, 30, 0.98, 0.97, 4, 1],
  0.5: [160, 125, 200, 400, 50, 0.97, 0.95, 8, 2],
  0.75: [180, 140, 240, 440, 65, 0.96, 0.93, 12, 3],
  1: [200, 150, 280, 480, 80, 0.95, 0.9, 16, 4],
};
// border, border-soft, input (alpha in percent), icon stroke
const STROKE = {
  dark: { 0: [4, 3, 10, 1.5], 0.25: [8, 6, 15, 1.75], 0.5: [12, 8, 18, 2], 0.75: [18, 12, 24, 2], 1: [28, 18, 32, 2.25] },
  light: { 0: [7, 4, 14, 1.5], 0.25: [13, 7, 18, 1.75], 0.5: [18, 10, 22, 2], 0.75: [26, 14, 30, 2], 1: [38, 20, 40, 2.25] },
};

function luminance(hex) {
  const lin = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
}
/** Text on a brand color: white or near black, whichever reads better (the same choice as brand.mjs). */
export function textOn(hex) {
  const l = luminance(hex);
  return 1.05 / (l + 0.05) >= (l + 0.05) / (luminance('#111111') + 0.05) ? '#ffffff' : '#111111';
}
export const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Token overrides for a set of axes.
 * @param {Record<string, number>} axes from toneAxes
 * @param {{ theme?: 'dark' | 'light', brand?: string | null }} [options] brand as #rrggbb; without one, a spot that calls
 *   for color wears DEMO_BRAND so the difference shows
 */
export function axesToTokens(axes, { theme = 'dark', brand = null } = {}) {
  const t = theme === 'light' ? 'light' : 'dark';
  const out = {};

  const [f, lh, lhSnug] = DENSITY[axes.density];
  for (const [k, px] of Object.entries(SPACE)) out[`--sp-${k}`] = `${px <= 4 ? 4 : Math.round((px * f) / 4) * 4}px`;
  out['--control-sm'] = `${Math.max(28, Math.round((32 * f) / 2) * 2)}px`;
  out['--control-md'] = `${Math.max(32, Math.round((36 * f) / 2) * 2)}px`;
  out['--lh-normal'] = String(lh);
  out['--lh-snug'] = String(lhSnug);

  const [muted, subtle, surface] = CONTRAST[t][axes.contrast];
  const ink = t === 'dark' ? '0 0' : '0.006 280';
  out['--muted-foreground'] = `oklch(${muted} ${ink})`;
  out['--text-subtle'] = `oklch(${subtle} ${ink})`;
  out['--muted'] = `oklch(${surface} ${t === 'dark' ? '0 0' : '0.002 95'})`;

  out['--radius'] = RADIUS[axes.roundness];

  const [display, h1, h2, title, tight, semi] = TYPE[axes['type-expression']];
  Object.assign(out, { '--t-display': `${display}px`, '--t-h1': `${h1}px`, '--t-h2': `${h2}px`, '--t-title': `${title}px`, '--lh-tight': String(tight), '--w-semi': String(semi) });

  const restraint = axes['color-restraint'];
  const hex = isHex(brand) ? brand : restraint < 1 ? DEMO_BRAND : null;
  if (hex) {
    out['--brand'] = hex;
    out['--accent-fg'] = textOn(hex);
  }
  if (restraint < 1) {
    // One hue: the data ramp steps the brand toward the page. Two hues: every other step takes a second hue across the wheel.
    const second = 'oklch(from var(--brand) l c calc(h + 150))';
    const mix = (pct, base = 'var(--brand)') => `color-mix(in oklch, ${base} ${pct}%, var(--bg))`;
    const ramp = restraint === 0.5
      ? ['var(--brand)', second, mix(62), mix(62, second), mix(34), mix(34, second)]
      : ['var(--brand)', mix(80), mix(62), mix(46), mix(32), mix(20)];
    ramp.forEach((v, i) => { out[`--chart-${i + 1}`] = v; });
    out['--accent-soft'] = `color-mix(in oklch, var(--brand) ${t === 'dark' ? 16 : 10}%, transparent)`;
    out['--highlight'] = restraint === 0.5 ? second : mix(70);
  }

  const [card, pop, cardFill] = ELEVATION[t][axes.elevation];
  out['--sh-card'] = card;
  out['--sh-pop'] = pop;
  if (cardFill) out['--card'] = `oklch(1 0 0 / ${cardFill})`;

  const [press, tip, drop, modal, stagger, pressScale, enterScale, offset, blur] = MOTION[axes.motion];
  Object.assign(out, {
    '--dur-press': `${press}ms`, '--dur-tooltip': `${tip}ms`, '--dur-dropdown': `${drop}ms`, '--dur-modal': `${modal}ms`,
    '--stagger-step': `${stagger}ms`, '--press-scale': String(pressScale), '--enter-scale': String(enterScale),
    '--enter-offset': `${offset}px`, '--blur-mask': `${blur}px`,
  });

  const [border, soft, input, icon] = STROKE[t][axes.stroke];
  const line = t === 'dark' ? 'oklch(1 0 0' : 'oklch(0.25 0.01 280';
  out['--border'] = `${line} / ${border}%)`;
  out['--border-soft'] = `${line} / ${soft}%)`;
  out['--input'] = `${line} / ${input}%)`;
  out['--icon-stroke'] = String(icon);
  return out;
}

/** The tokens as a block to load after registry/src/tokens.css, the same selector brand.mjs uses. */
export function tokensCss(tokens, comment = 'Tone tokens generated by Taster from a spot on the tone map.') {
  return [`/* ${comment} Load after registry/src/tokens.css. */`, ':root, :root[data-theme], .theme-dark, .theme-light {', ...Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`), '}', ''].join('\n');
}

export function quadrantOf(catalog, spot) {
  const { x, y } = readSpot(spot);
  return catalog.quadrants.find((q) => (x < 0.5 ? q.x[0] === 0 : q.x[0] === 0.5) && (y < 0.5 ? q.y[0] === 0 : q.y[0] === 0.5));
}

/** The references closest to a spot, nearest first. A known genre limits the set to that genre. */
export function nearestRefs(catalog, spot, { genre, limit = 4 } = {}) {
  const { x, y } = readSpot(spot);
  const pool = genre && catalog.genres.some((g) => g.id === genre) ? catalog.refs.filter((r) => r.genres.includes(genre)) : catalog.refs;
  return pool
    .map((r) => ({ ...r, distance: round2(Math.hypot(r.x - x, r.y - y)) }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(limit, pool.length)));
}

/** Registry parts that show a tone well: cards, buttons and borders, a data ramp, and a moving part on the loud side. */
export function toneParts(spot) {
  const { y } = readSpot(spot);
  return ['marketing/pricing-cards', y >= 0.6 ? 'marketing/step-showcase' : 'blocks/card', 'blocks/bar'];
}

/** The address of the tone page for a spot, so an agent can hand over a link. */
export function toneUrl(base, { x, y, genre, theme, brand } = {}) {
  const s = readSpot({ x, y });
  const q = [`x=${s.x}`, `y=${s.y}`];
  if (genre) q.push(`genre=${genre}`);
  if (theme) q.push(`theme=${theme}`);
  if (isHex(brand)) q.push(`brand=${brand.slice(1).toLowerCase()}`);
  return `${String(base).replace(/\/$/, '')}/tone?${q.join('&')}`;
}

/**
 * Everything the tone step answers for one spot.
 * @param {object} catalog the parsed taxonomy/tone-refs.json
 * @param {{ x?: number, y?: number, genre?: string, theme?: 'dark' | 'light', brand?: string | null, limit?: number }} input
 */
export function pickTone(catalog, { x, y, genre, theme = 'dark', brand = null, limit = 4 } = {}) {
  const spot = readSpot({ x, y });
  const known = genre && catalog.genres.some((g) => g.id === genre) ? genre : undefined;
  const axes = toneAxes(spot, known);
  const tokens = axesToTokens(axes, { theme, brand });
  return {
    spot,
    quadrant: quadrantOf(catalog, spot),
    genre: known ? catalog.genres.find((g) => g.id === known) : null,
    axes,
    steps: describeAxes(axes),
    tokens,
    css: tokensCss(tokens),
    demoBrand: !isHex(brand) && tokens['--brand'] === DEMO_BRAND,
    refs: nearestRefs(catalog, spot, { genre: known, limit }),
    parts: toneParts(spot),
  };
}
