// Design system: the brand's identity plus one balanced setting of the eight weighting axes, turned into every token the
// axes drive. Taster makes it once, with the builder, before any screen is built; every screen then loads its theme.css.
//
//   designSystem({ brand, references, intent })  reads the brand site and the references in a real browser
//   composeSystem(input)                         the same from already measured pages (no browser)
//   tuneSystem(system, { axis: value })          the builder moves a weight; balance moves the rest and says why
//   systemForCategory(system, category)          the axes that matter for one kind of part, with their tokens
//   writeSystem(dir, system)                     taster.system.json and theme.css
//
// Deterministic: the same pages and intent give the same JSON. Every number below is documented in
// skills/taster/references/system.md (measurement to axis, token tables, contrast floor).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import taxonomy from '../../data/taxonomy/taxonomy.json' with { type: 'json' };
import { AXIS_IDS, DEFAULTS, STEPS, balance, createAxes, snapValue, validateAxes } from '../../data/taxonomy/axes.mjs';
import { TASTER_FONT, brandTheme, contrast as hexContrast, hexToOklch, oklchToHex } from './brand.mjs';
import { EXTRACT_SOURCE, launch, toUrl } from './diagnose.mjs';

export const SYSTEM_VERSION = '1.0.0';
export const MEASURE_SOURCE = readFileSync(new URL('./measure.js', import.meta.url), 'utf8');
const AXIS = Object.fromEntries(taxonomy.axes.map((a) => [a.id, a]));
const AA = 4.5;
const EPS = 1e-9;

// ---- steps and words ----
const stepIndex = (axis, v) => STEPS[axis].findIndex((s) => Math.abs(s - v) < EPS);
export const stepName = (axis, v) => taxonomy.snap[axis].names[stepIndex(axis, v)];
function meaning(axis, v) {
  const anchors = AXIS[axis].anchors;
  const key = String(v);
  if (anchors[key]) return anchors[key];
  const keys = Object.keys(anchors).map(Number).sort((a, b) => a - b);
  const lo = keys.filter((k) => k < v).pop();
  const hi = keys.find((k) => k > v);
  const head = (k) => anchors[String(k)].split(':')[0];
  return `Between ${head(lo)} and ${head(hi)}.`;
}

// ---- color: parse, composite, contrast ----
const num = (n, d = 3) => String(Number(Number(n).toFixed(d)));
const oklch = (l, c = 0, h = 0, alpha = null) => `oklch(${num(l)} ${num(c)} ${num(h)}${alpha == null ? '' : ` / ${num(alpha)}%`})`;
function rgbOf(str) {
  const s = String(str).trim();
  let m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) return { rgb: [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)), a: 1 };
  m = s.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/i);
  if (m) {
    const hex = oklchToHex({ l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) });
    const a = m[4] == null ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
    return { rgb: rgbOf(hex).rgb, a };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  }
  throw new Error(`Cannot read color ${str}`);
}
const hexOf = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const over = (top, base) => top.rgb.map((v, i) => v * top.a + base[i] * (1 - top.a));
// Contrast of a text color on a surface that sits on the page background, all composited the way the browser paints.
function ratioOn(text, surface, page) {
  const bg = over(rgbOf(page), [0, 0, 0]);
  const surf = over(rgbOf(surface), bg);
  return hexContrast(hexOf(over(rgbOf(text), surf)), hexOf(surf));
}
const rgbToOklch = (rgb) => hexToOklch(hexOf(rgb));

// ---- the scheme: dark is the shipped core of registry/src/tokens.css, light is generated here ----
const SCHEME_BASE = {
  dark: { '--background': 'oklch(0.12 0 0)', '--foreground': 'oklch(0.985 0 0)' },
  light: {
    '--background': 'oklch(0.985 0 0)',
    '--foreground': 'oklch(0.18 0 0)',
    '--card-foreground': 'oklch(0.18 0 0)',
    '--popover-foreground': 'oklch(0.18 0 0)',
    '--primary': 'oklch(0.205 0 0)',
    '--primary-foreground': 'oklch(0.985 0 0)',
    '--secondary-foreground': 'oklch(0.18 0 0)',
    '--accent-foreground': 'oklch(0.18 0 0)',
    '--ring': 'oklch(0.556 0 0)',
    '--sidebar': 'oklch(0.97 0 0)',
    '--sidebar-foreground': 'oklch(0.18 0 0)',
    '--sidebar-primary': 'oklch(0.205 0 0)',
    '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
    '--sidebar-accent': 'oklch(0.94 0 0)',
    '--sidebar-accent-foreground': 'oklch(0.18 0 0)',
    '--sidebar-border': 'oklch(0 0 0 / 10%)',
    '--sidebar-ring': 'oklch(0.556 0 0)',
    '--info': 'oklch(0.205 0 0)',
    '--info-foreground': 'oklch(0.985 0 0)',
    '--warning': 'oklch(0.55 0.13 50)',
    '--warning-foreground': 'oklch(0.985 0 0)',
  },
};
const NEUTRAL = {
  dark: { brand: 'oklch(0.985 0 0)', tint: [1, 0, 0], highlight: 0.7, onBrand: null, warning: 'oklch(0.72 0.14 38)', chart: [0.98, 0.82, 0.66, 0.5, 0.38, 0.28] },
  light: { brand: 'oklch(0.205 0 0)', tint: [0, 0, 0], highlight: 0.45, onBrand: 'oklch(0.985 0 0)', warning: 'oklch(0.55 0.13 50)', chart: [0.25, 0.4, 0.52, 0.64, 0.76, 0.86] },
};
// Semantic colors when no brand site was read: the shipped values on dark, the brand intake's light values on light.
const SEMANTIC_DEFAULT = {
  dark: { '--success': 'oklch(0.65 0.15 160)', '--danger': 'oklch(0.704 0.191 22.216)' },
  light: (() => {
    const t = brandTheme({ brand: { dark: false } }).tokens;
    return { '--success': t['--success'], '--danger': t['--danger'], '--destructive': t['--destructive'], '--delta-up': t['--delta-up'], '--delta-down': t['--delta-down'] };
  })(),
};

// ---- token tables: one entry per snap step, lowest step first. These are the formulas. ----
// density: spacing = round(base * factor / 2) * 2 px, so every value stays on a 2px grid and the regular step is the
// shipped 4px grid exactly.
const SPACE_BASE = { '--sp-1': 4, '--sp-2': 8, '--sp-3': 12, '--sp-4': 16, '--sp-5': 20, '--sp-6': 24, '--sp-8': 32, '--sp-12': 48, '--sp-16': 64 };
export const TABLES = {
  density: {
    spaceFactor: [1.25, 1.125, 1, 0.875, 0.75],
    '--control-sm': [36, 34, 32, 30, 28],
    '--control-md': [40, 38, 36, 34, 32],
    '--lh-normal': [1.6, 1.55, 1.5, 1.45, 1.4],
    '--lh-snug': [1.35, 1.325, 1.3, 1.275, 1.25],
  },
  contrast: {
    dark: { '--muted-foreground': [0.66, 0.708, 0.78, 0.86], '--text-subtle': [0.65, 0.65, 0.7, 0.76], '--muted': [0.25, 0.269, 0.29, 0.31] },
    light: { '--muted-foreground': [0.52, 0.49, 0.43, 0.35], '--text-subtle': [0.52, 0.51, 0.46, 0.4], '--muted': [0.96, 0.95, 0.935, 0.92] },
  },
  roundness: { radiusPx: [0, 4, 10, 14, 20], ratio: { '--r-sm': 0.6, '--r-md': 0.8, '--r-card': 1, '--r-xl': 1.4, '--r-2xl': 1.8, '--r-3xl': 2.2, '--r-4xl': 2.6 } },
  'type-expression': {
    '--t-display': [22, 29, 36, 48, 60],
    '--t-h1': [20, 25, 30, 37, 44],
    '--t-h2': [18, 21, 24, 28, 32],
    '--t-title': [15, 16, 16, 17, 18],
    '--lh-tight': [1.25, 1.175, 1.1, 1.05, 1],
    '--w-semi': [500, 600, 600, 700, 700],
  },
  'color-restraint': { softAlpha: [20, 16, 12], highlightChroma: 0.12, chartChroma: 0.14, highlightTurn: 150 },
  elevation: {
    dark: {
      '--sh-card': ['none', '0 1px 2px rgba(0,0,0,.3), 0 1px 1px rgba(0,0,0,.2)', '0 1px 3px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25)', '0 2px 4px rgba(0,0,0,.35), 0 6px 16px rgba(0,0,0,.3)', '0 4px 8px rgba(0,0,0,.4), 0 12px 28px rgba(0,0,0,.35)'],
      '--sh-pop': ['none', '0 8px 24px rgba(0,0,0,.35)', '0 10px 30px rgba(0,0,0,.4)', '0 12px 36px rgba(0,0,0,.45)', '0 16px 48px rgba(0,0,0,.5)'],
      '--card': [2, 3, 4, 5, 6].map((a) => oklch(1, 0, 0, a)),
      '--popover': [0.16, 0.18, 0.2, 0.21, 0.22].map((l) => oklch(l)),
      '--scrim': [45, 55, 60, 65, 70].map((a) => oklch(0, 0, 0, a)),
    },
    light: {
      '--sh-card': ['none', '0 1px 2px rgba(0,0,0,.06), 0 1px 1px rgba(0,0,0,.04)', '0 1px 3px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06)', '0 2px 4px rgba(0,0,0,.08), 0 6px 16px rgba(0,0,0,.08)', '0 4px 8px rgba(0,0,0,.1), 0 12px 28px rgba(0,0,0,.12)'],
      '--sh-pop': ['none', '0 8px 24px rgba(0,0,0,.12)', '0 10px 30px rgba(0,0,0,.14)', '0 12px 36px rgba(0,0,0,.16)', '0 16px 48px rgba(0,0,0,.2)'],
      '--card': [oklch(0, 0, 0, 3), oklch(1), oklch(1), oklch(1), oklch(1)],
      '--popover': [1, 1, 1, 1, 1].map((l) => oklch(l)),
      '--scrim': [30, 40, 45, 50, 55].map((a) => oklch(0, 0, 0, a)),
    },
  },
  motion: {
    '--dur-press': [100, 130, 160, 180, 200],
    '--dur-tooltip': [100, 110, 125, 150, 180],
    '--dur-dropdown': [120, 160, 200, 240, 280],
    '--dur-modal': [150, 250, 400, 420, 450],
    '--stagger-step': [0, 30, 50, 60, 80],
    '--press-scale': [1, 0.98, 0.97, 0.96, 0.95],
    '--enter-scale': [1, 0.97, 0.95, 0.94, 0.92],
    '--enter-offset': [0, 4, 8, 12, 16],
    '--blur-mask': [0, 1, 2, 4, 6],
  },
  stroke: {
    dark: { border: [0, 8, 12, 18, 28], soft: [0, 0.06, 0.09, 0.14, 0.22], input: [12, 15, 20, 28, 40], tint: '255, 255, 255', l: 1 },
    light: { border: [0, 8, 12, 18, 28], soft: [0, 0.05, 0.08, 0.12, 0.2], input: [15, 18, 24, 32, 45], tint: '0, 0, 0', l: 0 },
    '--icon-stroke': [1.5, 2, 2, 2, 2],
  },
};
// Reduced motion keeps the soft version from packages/registry/src/tokens.css; theme.css re-states it so its own :root does
// not win over the media query.
const REDUCED_MOTION = { '--dur-press': '1ms', '--dur-tooltip': '1ms', '--dur-dropdown': '1ms', '--dur-modal': '1ms', '--stagger-step': '0ms', '--press-scale': '1', '--enter-scale': '1', '--enter-offset': '0px', '--blur-mask': '0px' };
const REDUCED_TRANSPARENCY = { '--bg-elev': 'var(--bg-sunken)', '--scrim': 'oklch(0 0 0 / 80%)' };

// Moves a hue away from the semantic hues (green near 150, red near 27) so a highlight never reads as an outcome.
function clearHue(h, avoid) {
  const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  let out = ((h % 360) + 360) % 360;
  for (let i = 0; i < 24 && avoid.some((x) => gap(out, x) < 35); i++) out = (out + 5) % 360;
  return out;
}

function axisTokens(axis, v, ctx) {
  const i = stepIndex(axis, v);
  const s = ctx.scheme;
  const out = {};
  switch (axis) {
    case 'density': {
      const t = TABLES.density;
      for (const [k, base] of Object.entries(SPACE_BASE)) out[k] = `${Math.max(2, Math.round((base * t.spaceFactor[i]) / 2) * 2)}px`;
      out['--control-sm'] = `${t['--control-sm'][i]}px`;
      out['--control-md'] = `${t['--control-md'][i]}px`;
      out['--lh-normal'] = num(t['--lh-normal'][i]);
      out['--lh-snug'] = num(t['--lh-snug'][i]);
      break;
    }
    case 'contrast': {
      const t = TABLES.contrast[s];
      out['--muted-foreground'] = oklch(t['--muted-foreground'][i]);
      out['--text-subtle'] = oklch(t['--text-subtle'][i]);
      out['--muted'] = oklch(t['--muted'][i]);
      out['--secondary'] = oklch(t['--muted'][i]);
      break;
    }
    case 'roundness': {
      const r = TABLES.roundness.radiusPx[i];
      out['--radius'] = `${num(r / 16, 4)}rem`;
      for (const [k, f] of Object.entries(TABLES.roundness.ratio)) out[k] = `${num(r * f, 2)}px`;
      break;
    }
    case 'type-expression': {
      const t = TABLES['type-expression'];
      out['--font'] = ctx.font;
      for (const k of ['--t-display', '--t-h1', '--t-h2', '--t-title']) out[k] = `${t[k][i]}px`;
      out['--lh-tight'] = num(t['--lh-tight'][i]);
      out['--w-semi'] = String(t['--w-semi'][i]);
      break;
    }
    case 'color-restraint': {
      const t = TABLES['color-restraint'];
      const n = NEUTRAL[s];
      const alpha = t.softAlpha[i];
      const hue = ctx.brandLch && ctx.brandLch.c >= 0.04 ? ctx.brandLch.h : null;
      out['--brand'] = ctx.brandHex || n.brand;
      const highlightHue = hue == null ? null : clearHue(hue + t.highlightTurn, [150, 27]);
      out['--highlight'] = i === 0 && highlightHue != null ? oklch(n.highlight, t.highlightChroma, highlightHue) : oklch(n.highlight);
      out['--accent-soft'] = ctx.brandLch ? oklch(ctx.brandLch.l, ctx.brandLch.c, ctx.brandLch.h, alpha) : oklch(...n.tint, alpha);
      n.chart.forEach((l, k) => {
        let h = null;
        if (hue != null && i <= 1) h = i === 0 && k % 2 === 1 ? highlightHue : hue;
        out[`--chart-${k + 1}`] = h == null ? oklch(l) : oklch(l, Math.min(t.chartChroma, ctx.brandLch.c), h);
      });
      const soft = (color) => {
        const c = /^#/.test(color) ? hexToOklch(color) : (() => { const m = color.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/); return { l: +m[1], c: +m[2], h: +m[3] }; })();
        return oklch(c.l, c.c, c.h, alpha);
      };
      out['--success-soft'] = soft(ctx.success);
      out['--warning-soft'] = soft(ctx.warning);
      out['--danger-soft'] = soft(ctx.danger);
      break;
    }
    case 'elevation': {
      const t = TABLES.elevation[s];
      for (const k of ['--sh-card', '--sh-pop', '--card', '--popover', '--scrim']) out[k] = t[k][i];
      break;
    }
    case 'motion': {
      const t = TABLES.motion;
      for (const k of ['--dur-press', '--dur-tooltip', '--dur-dropdown', '--dur-modal', '--stagger-step']) out[k] = `${t[k][i]}ms`;
      out['--press-scale'] = num(t['--press-scale'][i]);
      out['--enter-scale'] = num(t['--enter-scale'][i]);
      out['--enter-offset'] = `${t['--enter-offset'][i]}px`;
      out['--blur-mask'] = `${t['--blur-mask'][i]}px`;
      break;
    }
    case 'stroke': {
      const t = TABLES.stroke[s];
      out['--border'] = oklch(t.l, 0, 0, t.border[i]);
      out['--border-soft'] = `rgba(${t.tint}, ${num(t.soft[i])})`;
      out['--input'] = oklch(t.l, 0, 0, t.input[i]);
      out['--icon-stroke'] = num(TABLES.stroke['--icon-stroke'][i]);
      break;
    }
    default:
      throw new Error(`Unknown axis ${axis}`);
  }
  return out;
}

// Every token the system sets, in a fixed order: identity (brand intake), scheme base, then each axis's drives.
export function systemTokens(axes, { scheme = 'dark', identity = null } = {}) {
  const idTokens = identity?.tokens || {};
  const semantic = identity ? idTokens : SEMANTIC_DEFAULT[scheme];
  const brandHex = idTokens['--brand'] || null;
  const ctx = {
    scheme,
    brandHex,
    brandLch: brandHex ? hexToOklch(brandHex) : null,
    font: idTokens['--font'] || TASTER_FONT,
    success: semantic['--success'],
    danger: semantic['--danger'],
    warning: NEUTRAL[scheme].warning,
  };
  const tokens = {};
  for (const [k, v] of Object.entries(identity ? idTokens : semantic)) if (k !== '--brand' && k !== '--font') tokens[k] = v;
  if (!tokens['--accent-fg'] && NEUTRAL[scheme].onBrand) tokens['--accent-fg'] = NEUTRAL[scheme].onBrand;
  if (scheme === 'light') Object.assign(tokens, SCHEME_BASE.light);
  for (const axis of AXIS_IDS) {
    const t = axisTokens(axis, axes[axis], ctx);
    for (const prop of AXIS[axis].drives) tokens[prop] = t[prop];
  }
  return tokens;
}

// WCAG AA for every text token on every surface it can sit on. Throws when any pair is under 4.5:1.
export function contrastReport(tokens, scheme = 'dark') {
  const all = { ...SCHEME_BASE.dark, ...tokens };
  if (scheme === 'light') Object.assign(all, SCHEME_BASE.light, tokens);
  const page = all['--background'];
  const surfaces = ['--background', '--card', '--popover', '--muted', '--secondary'];
  const texts = ['--foreground', '--muted-foreground', '--text-subtle'];
  const pairs = [];
  for (const t of texts) for (const s of surfaces) pairs.push({ text: t, surface: s, ratio: ratioOn(all[t], all[s], page) });
  for (const t of ['--success', '--danger']) if (all[t]) pairs.push({ text: t, surface: '--background', ratio: ratioOn(all[t], page, page) });
  if (all['--brand'] && all['--accent-fg']) pairs.push({ text: '--accent-fg', surface: '--brand', ratio: ratioOn(all['--accent-fg'], all['--brand'], page) });
  return pairs.map((p) => ({ ...p, ratio: Number(p.ratio.toFixed(2)), aa: p.ratio >= AA }));
}
function assertAA(report) {
  const bad = report.filter((p) => !p.aa);
  if (bad.length) throw new Error(`Contrast under ${AA}:1: ${bad.map((p) => `${p.text} on ${p.surface} ${p.ratio}:1`).join(', ')}`);
}

// ---- measurement to axis ----
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const weightedMedian = (items) => {
  const s = items.filter((x) => Number.isFinite(x.v) && x.w > 0).sort((a, b) => a.v - b.v);
  const total = s.reduce((n, x) => n + x.w, 0);
  let acc = 0;
  for (const x of s) if ((acc += x.w) >= total / 2) return x.v;
  return null;
};
// The step whose generated value is closest to the measurement. A tie goes to the lower step (toward calm).
function nearest(axis, measured, generated, scale = (x) => x) {
  let best = 0;
  generated.forEach((g, i) => {
    if (Math.abs(scale(g) - scale(measured)) < Math.abs(scale(generated[best]) - scale(measured)) - EPS) best = i;
  });
  return STEPS[axis][best];
}
const shift = (axis, v, by) => STEPS[axis][Math.min(STEPS[axis].length - 1, Math.max(0, stepIndex(axis, v) + by))];
const luminance = (rgb) => hexContrast(hexOf(rgb), '#000000') * 0.05 - 0.05;
const shadowReach = (value) => value === 'none' ? 0 : Math.max(...value.split(/,(?![^(]*\))/).map((l) => {
  const n = l.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat);
  return Math.abs(n[1] || 0) + (n[2] || 0) + Math.max(0, n[3] || 0);
}));
const FADE = new Set(['opacity', 'color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke', 'text-decoration-color', 'box-shadow', 'visibility']);

// What the generated tokens look like at every step, the yardstick a measurement is compared against.
function yardstick(scheme) {
  const at = (axis) => STEPS[axis].map((v) => axisTokens(axis, v, { scheme, font: TASTER_FONT, success: SEMANTIC_DEFAULT.dark['--success'], danger: SEMANTIC_DEFAULT.dark['--danger'], warning: NEUTRAL[scheme].warning }));
  const page = SCHEME_BASE[scheme]['--background'];
  const px = (s) => parseFloat(s);
  return {
    controlMd: at('density').map((t) => px(t['--control-md'])),
    cardPadding: at('density').map((t) => px(t['--sp-6'])),
    gap: at('density').map((t) => px(t['--sp-5'])),
    lineHeight: at('density').map((t) => Number(t['--lh-normal'])),
    mutedRatio: at('contrast').map((t) => ratioOn(t['--muted-foreground'], page, page)),
    radius: TABLES.roundness.radiusPx,
    displayRatio: at('type-expression').map((t) => px(t['--t-display']) / 14),
    shadowReach: at('elevation').map((t) => shadowReach(t['--sh-card'])),
    feedbackMs: at('motion').map((t) => (px(t['--dur-press']) + px(t['--dur-tooltip']) + px(t['--dur-dropdown'])) / 3),
    borderRatio: at('stroke').map((t) => ratioOn(t['--border'], page, page)),
  };
}
const YARD = { dark: yardstick('dark'), light: yardstick('light') };
export const yardsticks = () => YARD;

// Maps one page's raw measurements (packages/engine/measure.js) to axis values. An axis with no evidence on the page is null.
export function axesFromMeasure(m) {
  const scheme = luminance(m.page.background) < 0.2 ? 'dark' : 'light';
  const Y = YARD[scheme];
  const out = {};
  const r1 = (x) => Math.round(x * 10) / 10;

  // density: the mean of the steps four signals land on, snapped.
  {
    const body = m.text.filter((t) => !t.heading && t.size >= 12 && t.size <= 22 && t.lineHeight);
    const signals = [];
    const ctrl = median(m.density.controlHeights);
    if (ctrl != null) signals.push(['controls', `${r1(ctrl)}px controls`, nearest('density', ctrl, Y.controlMd)]);
    const pad = median(m.density.cardPadding);
    if (pad != null) signals.push(['padding', `${r1(pad)}px card padding`, nearest('density', pad, Y.cardPadding)]);
    const gap = median(m.density.gaps);
    if (gap != null) signals.push(['gaps', `${r1(gap)}px gaps`, nearest('density', gap, Y.gap)]);
    const lh = weightedMedian(body.map((t) => ({ v: t.lineHeight, w: t.chars })));
    if (lh != null) signals.push(['lineHeight', `body line height ${num(lh, 2)}`, nearest('density', lh, Y.lineHeight)]);
    out.density = signals.length
      ? { value: snapValue('density', signals.reduce((n, s) => n + s[2], 0) / signals.length), evidence: signals.map((s) => `${s[1]} (${stepName('density', s[2])})`).join(', ') }
      : { value: null, evidence: 'no controls, cards, gaps or body text to measure' };
  }

  // contrast: the lower quartile (by characters) of body text contrast against what is behind it, which is where muted
  // text sits, compared with the muted text each step generates on its own page background, on a log scale.
  {
    const samples = m.text.filter((t) => t.behind && t.color);
    if (!samples.length) out.contrast = { value: null, evidence: 'no text on a solid background' };
    else {
      const ratio = (t) => hexContrast(hexOf(over({ rgb: t.color.slice(0, 3), a: t.color[3] ?? 1 }, t.behind)), hexOf(t.behind));
      const body = samples.filter((t) => !t.heading);
      const pool = (body.length ? body : samples).map((t) => ({ v: ratio(t), w: t.chars })).sort((a, b) => a.v - b.v);
      const total = pool.reduce((n, x) => n + x.w, 0);
      let acc = 0;
      const r = pool.find((x) => (acc += x.w) >= total / 4).v;
      const under = samples.filter((t) => ratio(t) < AA).length;
      out.contrast = {
        value: nearest('contrast', r, Y.mutedRatio, Math.log),
        evidence: `the quieter quarter of body text at ${num(r, 1)}:1${under ? `, ${under} text runs under 4.5:1` : ''}`,
      };
    }
  }

  // roundness: the typical card radius against the generated card radius per step; controls when there are no cards.
  {
    const card = median(m.radii.cards);
    const ctrl = median(m.radii.controls);
    if (card != null) out.roundness = { value: nearest('roundness', card, Y.radius), evidence: `${r1(card)}px on ${m.radii.cards.length} cards` };
    else if (ctrl != null) out.roundness = { value: nearest('roundness', ctrl / TABLES.roundness.ratio['--r-md'], Y.radius), evidence: `${r1(ctrl)}px on controls, no cards` };
    else if (m.radii.pills) out.roundness = { value: 0.75, evidence: `${m.radii.pills} pill shaped controls, no cards` };
    else out.roundness = { value: null, evidence: 'no cards or controls' };
  }

  // type-expression: largest text over body text against the generated display over a 14px body, on a log scale;
  // a heavy (800+) or light (400 or less) display weight moves it one step.
  {
    const body = weightedMedian(m.text.filter((t) => !t.heading && t.size >= 10 && t.size <= 24).map((t) => ({ v: t.size, w: t.chars })));
    const top = [...m.text].sort((a, b) => b.size - a.size || b.weight - a.weight)[0];
    if (!body || !top) out['type-expression'] = { value: null, evidence: 'no body text' };
    else {
      const ratio = top.size / body;
      let v = nearest('type-expression', ratio, Y.displayRatio, Math.log);
      if (top.weight >= 800) v = shift('type-expression', v, 1);
      else if (top.weight <= 400) v = shift('type-expression', v, -1);
      out['type-expression'] = { value: v, evidence: `largest text ${r1(top.size)}px at weight ${top.weight} over ${r1(body)}px body (${num(ratio, 2)}x)` };
    }
  }

  // color-restraint: hue families among non-neutral colors (OKLCH chroma 0.05 or more), weighted by painted area.
  // A family counts when it holds 3% or more of the colored weight. Tinted surfaces are colored fills over 15% of the page.
  {
    const chromatic = m.colors.map((c) => ({ ...c, lch: rgbToOklch(c.rgb) })).filter((c) => c.lch.c >= 0.05).sort((a, b) => b.weight - a.weight || a.lch.h - b.lch.h);
    const total = chromatic.reduce((n, c) => n + c.weight, 0);
    const families = [];
    const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    for (const c of chromatic) {
      const f = families.find((x) => gap(x.hue, c.lch.h) <= 35);
      if (f) f.weight += c.weight;
      else families.push({ hue: c.lch.h, weight: c.weight });
    }
    const counted = families.filter((f) => total && f.weight / total >= 0.03);
    const tint = chromatic.filter((c) => c.kind === 'background' || c.kind === 'gradient').reduce((n, c) => n + c.weight, 0) / (m.page.width * m.page.height);
    const H = counted.length;
    const v = H === 0 ? 1 : H === 1 ? (tint >= 0.15 ? 0.75 : 1) : H === 2 ? 0.5 : 0.25;
    out['color-restraint'] = {
      value: snapValue('color-restraint', v),
      evidence: `${H} hue ${H === 1 ? 'family' : 'families'}${H ? ` (${counted.map((f) => Math.round(f.hue)).join(', ')} degrees)` : ''}, colored fills on ${Math.round(tint * 100)}% of the page${v < 0.5 ? ', below the restraint floor' : ''}`,
    };
  }

  // elevation: the shadow reach (offset + blur + spread) on cards against the generated card shadow per step. Shadows
  // only on controls or overlays count one step lower.
  {
    const onCards = m.shadows.filter((s) => s.role === 'card');
    if (m.cards && onCards.length / m.cards >= 0.25) {
      const reach = median(onCards.map((s) => s.reach));
      out.elevation = { value: nearest('elevation', reach, Y.shadowReach), evidence: `shadow reach ${r1(reach)}px on ${onCards.length} of ${m.cards} cards` };
    } else if (m.shadows.length) {
      const reach = median(m.shadows.map((s) => s.reach));
      out.elevation = { value: shift('elevation', nearest('elevation', reach, Y.shadowReach), -1), evidence: `shadows (reach ${r1(reach)}px) only on ${m.shadows.length} controls or overlays, not on cards` };
    } else out.elevation = { value: 0, evidence: 'no shadows' };
  }

  // motion: the median duration of transitions that move something against the generated feedback durations per step.
  // Only fades means still. Keyframe animations lift it to lively (one or two) or expressive (three or more).
  {
    const moving = m.motion.transitions.filter((t) => !FADE.has(t.property));
    let v;
    let evidence;
    if (moving.length) {
      const ms = median(moving.map((t) => t.ms));
      v = nearest('motion', ms, Y.feedbackMs);
      evidence = `${moving.length} moving transitions at ${Math.round(ms)}ms`;
    } else if (m.motion.transitions.length) {
      v = 0;
      evidence = `${m.motion.transitions.length} fades of color or opacity only`;
    } else if (m.motion.interactive || m.motion.animated) {
      v = 0;
      evidence = `no transitions on ${m.motion.interactive} interactive elements`;
    }
    if (m.motion.animated) {
      v = Math.max(v ?? 0, m.motion.animated >= 3 ? 1 : 0.75);
      evidence += `, ${m.motion.animated} keyframe animations`;
    }
    out.motion = v == null ? { value: null, evidence: 'nothing interactive or animated' } : { value: v, evidence };
  }

  // stroke: the contrast of card borders and divider rules against what is behind them, compared with the generated
  // --border per step; 2px or heavier is heavy. Cards with no borders at all are none.
  {
    const lines = [...m.borders.borderedCards, ...m.borders.dividers].filter((b) => b.color && b.behind);
    if (lines.length) {
      const width = median(lines.map((b) => b.width));
      const ratio = median(lines.map((b) => hexContrast(hexOf(over({ rgb: b.color.slice(0, 3), a: b.color[3] ?? 1 }, b.behind)), hexOf(b.behind))));
      const v = width >= 2 ? 1 : Math.max(0.25, nearest('stroke', ratio, Y.borderRatio));
      out.stroke = { value: v, evidence: `${lines.length} borders and rules, ${r1(width)}px at ${num(ratio, 2)}:1 against their background` };
    } else if (m.cards) out.stroke = { value: 0, evidence: `${m.cards} cards with no border` };
    else out.stroke = { value: null, evidence: 'no cards or rules' };
  }

  return { scheme, axes: out };
}

// ---- reading pages ----
const label = (target) => (/^(https?|file):\/\//i.test(target) ? target : basename(target));

export async function readPage(browser, target, { timeout = 30000 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, bypassCSP: true });
  try {
    await page.goto(toUrl(target), { waitUntil: 'domcontentloaded', timeout });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: EXTRACT_SOURCE });
    await page.addScriptTag({ content: MEASURE_SOURCE });
    const [content, measures] = await page.evaluate(() => [window.tasterExtract(), window.tasterMeasure()]);
    return { label: label(target), content, measures };
  } finally {
    await page.close();
  }
}

// ---- intent ----
function checkSettings(settings, what) {
  if (settings == null) return {};
  if (typeof settings !== 'object' || Array.isArray(settings)) throw new TypeError(`${what} must be an object of { axis: value }`);
  const bad = validateAxes(settings).filter((v) => ['unknown-axis', 'not-a-number', 'out-of-range'].includes(v.code));
  if (bad.length) throw new Error(`Invalid ${what}: ${bad.map((b) => b.message).join('; ')}. Axes: ${AXIS_IDS.join(', ')}; values 0 to 1 on the steps in taxonomy snap.`);
  return settings;
}

// Holds every pinned axis at its value and moves the others the least (data/taxonomy/axes.mjs balance). With two or more
// pinned axes it runs the same balance over a copy of the taxonomy whose pinned axes have that single step.
function settle(start, pinned) {
  const keys = AXIS_IDS.filter((a) => a in pinned);
  if (keys.length <= 1) return balance(start, keys[0] ?? null);
  const spec = { ...taxonomy, snap: { ...taxonomy.snap } };
  for (const k of keys) spec.snap[k] = { steps: [start[k]], names: [stepName(k, start[k])] };
  try {
    return createAxes(spec).balance(start, null);
  } catch {
    const only = Object.fromEntries(keys.map((k) => [k, start[k]]));
    const hit = validateAxes(only).filter((v) => v.code === 'constraint');
    throw new Error(`These weights cannot all hold together: ${keys.map((k) => `${k}=${start[k]}`).join(', ')}; no setting of the other axes satisfies every constraint. ${hit.map((h) => `${h.constraint}: ${h.message.split(': ').slice(1).join(': ')}`).join(' ')}`);
  }
}

// Why balance moved an axis: the constraints that would break if only that axis went back.
function reasons(result, axis, before) {
  const hit = validateAxes({ ...result, [axis]: before }).filter((v) => v.code === 'constraint');
  return hit.map((h) => ({ constraint: h.constraint, principle: taxonomy.constraints.find((c) => c.id === h.constraint).principle }));
}
function moves(start, result, pinned) {
  const out = {};
  for (const a of AXIS_IDS) {
    if (a in pinned || Math.abs(start[a] - result[a]) < EPS) continue;
    out[a] = { from: start[a], fromStep: stepName(a, start[a]), to: result[a], toStep: stepName(a, result[a]), because: reasons(result, a, start[a]) };
  }
  return out;
}
// The brand's own tokens, the ones a nested theme scope must not drop.
const IDENTITY_KEYS = ['--brand', '--accent-fg', '--font', '--success', '--danger', '--destructive', '--delta-up', '--delta-down'];
const moveLine = (axis, m) => `${axis} moved ${m.fromStep} (${m.from}) to ${m.toStep} (${m.to}): ${m.because.map((b) => `"${b.principle}" (${b.constraint})`).join('; ') || 'to keep the other moves valid'}`;

function finish({ source, scheme, identity, surface, axes, axisNotes, measured, notes, tuned = [] }) {
  const problems = validateAxes(axes);
  if (problems.length) throw new Error(`Unbalanced system: ${problems.map((p) => p.message).join('; ')}`);
  const tokens = systemTokens(axes, { scheme, identity });
  const contrast = contrastReport(tokens, scheme);
  assertAA(contrast);
  const steps = Object.fromEntries(AXIS_IDS.map((a) => [a, stepName(a, axes[a])]));
  const block = (sel, map, pad = '  ') => [`${sel} {`, ...Object.entries(map).map(([k, v]) => `${pad}${k}: ${v};`), `${sel.match(/^\s*/)[0]}}`];
  // As in the brand theme: past :root alone, since packages/registry/src/themes/light.css sets tokens on :root[data-theme="light"],
  // which would beat a plain :root. Nested .theme-dark and .theme-light scopes keep their own surfaces, and get the
  // brand identity back (tokens.css resets --brand and --font in .theme-dark).
  const own = identity ? Object.fromEntries(IDENTITY_KEYS.filter((k) => k in tokens).map((k) => [k, tokens[k]])) : {};
  const css = [
    '/* Design system generated by Taster. Load after registry/src/tokens.css; components read the alias tokens only. */',
    `/* ${AXIS_IDS.map((a) => `${a} ${steps[a]}`).join(', ')}; ${scheme} scheme */`,
    ...block(':root, :root[data-theme]', tokens),
    ...(Object.keys(own).length ? block('.theme-dark, .theme-light', own) : []),
    '@media (prefers-reduced-motion: reduce) {',
    ...block('  :root, :root[data-theme]', REDUCED_MOTION, '    '),
    '}',
    '@media (prefers-reduced-transparency: reduce) {',
    ...block('  :root, :root[data-theme]', REDUCED_TRANSPARENCY, '    '),
    '}',
    '',
  ].join('\n');
  return {
    version: SYSTEM_VERSION,
    taxonomy: taxonomy.version,
    source,
    surface: surface || null,
    scheme,
    identity,
    axes,
    steps,
    axisNotes,
    measured,
    tokens,
    contrast: { floor: AA, lowest: contrast.reduce((a, b) => (b.ratio < a.ratio ? b : a)), pairs: contrast },
    css,
    notes,
    tuned,
  };
}

// Builds the system from already read pages: { brand: readPage result | null, references: [readPage results], intent }.
export function composeSystem({ brand = null, references = [], intent = {} } = {}) {
  const wanted = checkSettings(intent.axes, 'intent axes');
  if (intent.surface != null && !taxonomy.surfaces.some((s) => s.id === intent.surface)) {
    throw new Error(`Unknown surface ${intent.surface}. Known: ${taxonomy.surfaces.map((s) => s.id).join(', ')}`);
  }
  if (intent.scheme != null && !['dark', 'light'].includes(intent.scheme)) throw new Error('scheme must be dark or light');
  const notes = [];

  // Identity: the brand site wins for color, typeface and logo.
  const brandRead = brand ? axesFromMeasure(brand.measures) : null;
  const scheme = intent.scheme || (brand ? (brand.content?.brand?.dark ? 'dark' : 'light') : 'dark');
  let identity = null;
  if (brand) {
    const content = { ...brand.content, brand: { ...(brand.content?.brand || {}), dark: scheme === 'dark' } };
    const theme = brandTheme(content);
    const tokens = { ...theme.tokens };
    if (tokens['--brand'] && tokens['--accent-fg'] && hexContrast(tokens['--brand'], tokens['--accent-fg']) < AA) {
      const better = hexContrast(tokens['--brand'], '#ffffff') >= hexContrast(tokens['--brand'], '#000000') ? '#ffffff' : '#000000';
      notes.push(`Text on the brand color moves from ${tokens['--accent-fg']} to ${better} to reach ${AA}:1.`);
      tokens['--accent-fg'] = better;
    }
    // A logo read from a local file keeps only its file name, so a saved system never carries a machine's paths.
    const local = (src) => (typeof src === 'string' && /^file:/i.test(src) ? basename(decodeURIComponent(new URL(src).pathname)) : src);
    const logo = theme.source.logo ? { ...theme.source.logo, ...(theme.source.logo.src ? { src: local(theme.source.logo.src) } : {}) } : null;
    // The logo's own face is identity, not a system typeface: consistency checks list it as exempt inside the logo only.
    const logoFont = theme.source.fonts?.logo || null;
    const idNotes = theme.notes.map((n) => n.replace(/file:\/\/\S+?([^/\s)]+)\)/g, '$1)'));
    const primary = String(tokens['--font'] || '').split(',')[0].replace(/["']/g, '').trim();
    if (logoFont && logoFont !== primary) idNotes.push(`The logo text is set in ${logoFont}. It stays the logo's own face (identity.logoFont): consistency checks list it as exempt inside the logo only, and the same face anywhere else is off the system.`);
    identity = { name: theme.source.name, logo, color: theme.source.color, fonts: theme.source.fonts, logoFont, tokens, notes: idNotes };
    notes.push(...identity.notes);
  } else {
    notes.push('No brand site given: the neutral accent and the Taster typeface stay. Ask the owner for a color, a typeface and the logo, or an existing page to absorb them from.');
  }
  if (intent.scheme) notes.push(`The builder chose a ${intent.scheme} scheme.`);
  else if (!brand) notes.push('Dark scheme, the shipped core of registry/src/tokens.css.');

  // Axes: builder intent, then the references (their mean, snapped), then the brand site, then the taxonomy default.
  const refReads = references.map((r) => ({ label: r.label, ...axesFromMeasure(r.measures) }));
  const start = {};
  const axisNotes = {};
  for (const a of AXIS_IDS) {
    let value;
    let src;
    let from;
    const refHits = refReads.filter((r) => r.axes[a].value != null);
    if (a in wanted) {
      value = snapValue(a, wanted[a]);
      src = 'intent';
      from = `the builder set ${wanted[a]}${Math.abs(value - wanted[a]) > EPS ? `, snapped to ${value}` : ''}`;
    } else if (refHits.length) {
      value = snapValue(a, refHits.reduce((n, r) => n + r.axes[a].value, 0) / refHits.length);
      src = 'reference';
      from = refHits.map((r) => `${r.label}: ${stepName(a, r.axes[a].value)} from ${r.axes[a].evidence}`).join('; ') + (refHits.length > 1 ? `; mean snapped to ${stepName(a, value)}` : '');
    } else if (brandRead && brandRead.axes[a].value != null) {
      value = brandRead.axes[a].value;
      src = 'brand';
      from = `${brand.label}: ${brandRead.axes[a].evidence}`;
    } else {
      value = DEFAULTS[a];
      src = 'default';
      from = `taxonomy default${brandRead || refReads.length ? ` (no evidence: ${(brandRead || refReads[0]).axes[a].evidence})` : ''}`;
    }
    start[a] = value;
    axisNotes[a] = { source: src, from };
  }

  const pinned = Object.fromEntries(Object.keys(wanted).map((a) => [a, start[a]]));
  const axes = settle(start, pinned);
  const moved = moves(start, axes, pinned);
  for (const a of AXIS_IDS) {
    axisNotes[a] = { value: axes[a], step: stepName(a, axes[a]), meaning: meaning(a, axes[a]), ...axisNotes[a], moved: moved[a] || null };
  }
  for (const [a, m] of Object.entries(moved)) notes.push(`Balance: ${moveLine(a, m)}.`);
  if (intent.surface) notes.push(`Surface ${intent.surface}: recorded for the screens; set axes to change the tone.`);

  return finish({
    source: { brand: brand ? brand.label : null, references: references.map((r) => r.label) },
    scheme,
    identity,
    surface: intent.surface,
    axes,
    axisNotes,
    measured: {
      brand: brandRead ? { scheme: brandRead.scheme, axes: brandRead.axes } : null,
      references: refReads.map((r) => ({ source: r.label, scheme: r.scheme, axes: r.axes })),
    },
    notes,
  });
}

// Reads the brand site and every reference in one browser, then composes the system.
export async function designSystem({ brand = null, references = [], intent = {} } = {}) {
  checkSettings(intent?.axes, 'intent axes');
  if (!brand && !references.length) return composeSystem({ intent });
  const browser = await launch();
  try {
    const b = brand ? await readPage(browser, brand) : null;
    const refs = [];
    for (const r of references) refs.push(await readPage(browser, r));
    return composeSystem({ brand: b, references: refs, intent });
  } finally {
    await browser.close();
  }
}

// The exchange with the builder: hold the moved axes, balance the rest, and say what moved and why.
export function tuneSystem(system, changes) {
  if (!system || typeof system !== 'object' || !system.axes) throw new TypeError('tuneSystem needs a system from designSystem');
  const prior = validateAxes(system.axes);
  if (prior.length) throw new Error(`The system's own axes are not valid: ${prior.map((p) => p.message).join('; ')}`);
  checkSettings(changes, 'axis change');
  if (!Object.keys(changes).length) throw new Error('Name at least one axis to move');
  const start = { ...system.axes };
  const pinned = {};
  for (const [a, v] of Object.entries(changes)) start[a] = pinned[a] = snapValue(a, v);
  const axes = settle(start, pinned);
  const moved = moves({ ...system.axes, ...pinned }, axes, pinned);
  const axisNotes = {};
  const lines = [];
  const balanced = [];
  for (const a of AXIS_IDS) {
    const prev = system.axisNotes?.[a] || {};
    if (a in pinned) {
      axisNotes[a] = { ...prev, value: axes[a], step: stepName(a, axes[a]), meaning: meaning(a, axes[a]), source: 'intent', from: `the builder moved it from ${stepName(a, system.axes[a])} (${system.axes[a]}) to ${stepName(a, axes[a])} (${axes[a]})`, moved: null };
      lines.push(`${a} set to ${stepName(a, axes[a])} (${axes[a]}) by the builder`);
    } else {
      axisNotes[a] = { ...prev, value: axes[a], step: stepName(a, axes[a]), meaning: meaning(a, axes[a]), moved: moved[a] || null };
      if (moved[a]) balanced.push(moveLine(a, moved[a]));
    }
  }
  lines.push(...balanced);
  if (!balanced.length) lines.push('no other axis had to move');
  const entry = { changes: pinned, moved, summary: lines };
  return finish({
    source: system.source,
    scheme: system.scheme,
    identity: system.identity,
    surface: system.surface,
    axes,
    axisNotes,
    measured: system.measured,
    notes: [...(system.notes || []).filter((n) => !n.startsWith('Balance: ')), ...balanced.map((l) => `Balance: ${l}.`)],
    tuned: [...(system.tuned || []), entry],
  });
}

// The axes that matter for one category, most relevant first, with the tokens each drives in this system.
export function systemForCategory(system, category) {
  const row = taxonomy.relevance[category];
  if (!row) throw new Error(`Unknown category ${category}. Known: ${Object.keys(taxonomy.relevance).join(', ')}`);
  const cat = taxonomy.categories.find((c) => c.id === category);
  const order = AXIS_IDS.filter((a) => row[a] > 0).sort((a, b) => row[b] - row[a] || AXIS_IDS.indexOf(a) - AXIS_IDS.indexOf(b));
  return {
    category,
    name: cat?.name || category,
    axes: order.map((a) => ({
      axis: a,
      relevance: row[a],
      value: system.axes[a],
      step: stepName(a, system.axes[a]),
      meaning: meaning(a, system.axes[a]),
      tokens: Object.fromEntries(AXIS[a].drives.map((p) => [p, system.tokens[p]])),
    })),
    ignored: AXIS_IDS.filter((a) => !(row[a] > 0)),
    note: order.length ? 'Read these tokens through the alias layer (var(--r-card), var(--sp-4) ...); never type their values into the part.' : 'No axis applies: this category is governed by rules, not by visual weights.',
  };
}

export function writeSystem(dir, system) {
  mkdirSync(dir, { recursive: true });
  const json = join(dir, 'taster.system.json');
  const css = join(dir, 'theme.css');
  writeFileSync(json, `${JSON.stringify(system, null, 2)}\n`);
  writeFileSync(css, system.css);
  return { json, css };
}
export const readSystem = (file) => JSON.parse(readFileSync(file, 'utf8'));

// ---- CLI: node packages/engine/cli.mjs --system [brand] [--ref x ...] [--axis a=v ...] [--surface s] [--scheme dark|light] --out dir
//           node packages/engine/cli.mjs --tune dir/taster.system.json a=v ...
const pairs = (list) => Object.fromEntries((list || []).map((p) => {
  const m = String(p).match(/^([a-z-]+)=(.+)$/);
  if (!m) throw new Error(`Expected axis=value, got ${p}`);
  return [m[1], Number(m[2])];
}));
export function formatSystem(system) {
  const out = [`${system.scheme} scheme${system.source.brand ? `, brand from ${system.source.brand}` : ''}${system.source.references.length ? `, references ${system.source.references.join(', ')}` : ''}`];
  for (const a of AXIS_IDS) {
    const n = system.axisNotes[a];
    out.push(`  ${a.padEnd(16)} ${String(n.value).padEnd(5)} ${n.step.padEnd(11)} ${n.source}: ${n.from}`);
    if (n.moved) out.push(`  ${''.padEnd(16)} balance: ${moveLine(a, n.moved)}`);
  }
  out.push(`  lowest text contrast ${system.contrast.lowest.ratio}:1 (${system.contrast.lowest.text} on ${system.contrast.lowest.surface})`);
  return [...out, '', ...system.notes.map((n) => `- ${n}`)].join('\n');
}
export async function runSystemCli(argv) {
  const { parseArgs } = await import('node:util');
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      system: { type: 'boolean' },
      tune: { type: 'string' },
      ref: { type: 'string', multiple: true },
      axis: { type: 'string', multiple: true },
      surface: { type: 'string' },
      scheme: { type: 'string' },
      out: { type: 'string' },
      json: { type: 'boolean' },
    },
  });
  let system;
  let dir = values.out;
  if (values.tune) {
    system = tuneSystem(readSystem(values.tune), pairs(positionals));
    dir = dir || dirname(values.tune);
    const last = system.tuned[system.tuned.length - 1];
    if (!values.json) console.log(last.summary.map((l) => `- ${l}`).join('\n'));
  } else {
    if (positionals.length > 1) throw new Error('One brand site at most; pass references with --ref');
    system = await designSystem({ brand: positionals[0] || null, references: values.ref || [], intent: { axes: pairs(values.axis), surface: values.surface, scheme: values.scheme } });
  }
  if (dir) {
    const files = writeSystem(dir, system);
    if (!values.json) console.log(`wrote ${files.json} and ${files.css}`);
  }
  console.log(values.json ? JSON.stringify(system, null, 2) : formatSystem(system));
  return 0;
}
