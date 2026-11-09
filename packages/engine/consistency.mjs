// Cross-screen consistency: render every screen of a product at 1440 and 390 wide, read the computed design values of
// each visible element by role (button, input, card, h1 to h3, body text, link, badge), and report
//   drift: the same component drawn differently on two screens (a button radius of 8px here and 4px there), and
//   off-system values: a radius, spacing step, color, typeface, shadow or duration that is not one of the system's tokens.
// A system may declare identity exemptions (identity.logoFont): the logo wordmark set in its own face. Inside the site's
// logo or home link in the header and footer, that face is not an off-system typeface; each such value is reported under
// exempt, never dropped.
// Deterministic: the same screens and system give the same report in the same order.
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { hexToOklch } from './brand.mjs';
import { launch, toUrl } from './diagnose.mjs';

export const CONSISTENCY_WIDTHS = [1440, 390];
export const ROLES = ['button', 'input', 'card', 'h1', 'h2', 'h3', 'body', 'link', 'badge'];

// Which computed values are compared for each role.
export const ROLE_PROPS = {
  button: ['radius', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'gap', 'color', 'background', 'borderColor', 'shadow', 'duration'],
  input: ['radius', 'fontFamily', 'fontSize', 'fontWeight', 'padding', 'color', 'background', 'borderColor', 'shadow', 'duration'],
  card: ['radius', 'padding', 'gap', 'background', 'borderColor', 'shadow', 'duration'],
  h1: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'],
  h2: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'],
  h3: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'],
  body: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color'],
  link: ['fontFamily', 'fontWeight', 'color', 'duration'],
  badge: ['radius', 'fontFamily', 'fontSize', 'fontWeight', 'padding', 'color', 'background', 'borderColor'],
};

// Colors that make a variant. Two buttons whose fill, text and border colors are far apart are different variants
// (primary and ghost), not drift; a heading or an input has one look, so every difference counts.
const VARIANT_PROPS = {
  button: ['color', 'background', 'borderColor'],
  badge: ['color', 'background', 'borderColor'],
  card: ['background', 'borderColor'],
  link: ['color'],
  body: ['color'],
  input: [],
  h1: [],
  h2: [],
  h3: [],
};

export const PROPS = {
  radius: { css: 'border-radius', kind: 'length', system: 'radius' },
  fontFamily: { css: 'font-family', kind: 'exact', system: 'fontFamily' },
  fontSize: { css: 'font-size', kind: 'length', system: null },
  fontWeight: { css: 'font-weight', kind: 'exact', system: null },
  lineHeight: { css: 'line-height', kind: 'length', system: null },
  padding: { css: 'padding', kind: 'length', system: 'spacing' },
  gap: { css: 'gap', kind: 'length', system: 'spacing' },
  color: { css: 'color', kind: 'color', system: 'color' },
  background: { css: 'background-color', kind: 'color', system: 'color' },
  borderColor: { css: 'border-color', kind: 'color', system: 'color' },
  shadow: { css: 'box-shadow', kind: 'exact', system: 'shadow' },
  duration: { css: 'transition-duration', kind: 'time', system: 'duration' },
};
const PROP_ORDER = Object.keys(PROPS);
export const SYSTEM_KINDS = ['radius', 'spacing', 'fontFamily', 'color', 'shadow', 'duration'];

// Tolerances. Lengths within half a pixel are the same (subpixel rounding). Colors within 0.02 in OKLab and 5 of 255 in
// alpha are the same (below a visible step, and above 8-bit rounding). Durations within 1ms are the same. A color pair
// within 0.08 in OKLab is the same variant drawn slightly off (drift); further apart it is a different variant.
export const TOLERANCE = { lengthPx: 0.5, colorDeltaE: 0.02, alpha: 5, durationMs: 1, variantDeltaE: 0.08, variantAlpha: 26 };

const LOAD_WAIT = 15000;
const MAX_PER_ROLE = 300;
const MAX_SELECTORS = 3;

// ---- the design system: a theme CSS file, { tokens } JSON (packages/engine/system.mjs output), or a plain token map ----

// :root custom properties at the top level of a stylesheet. Blocks inside @media and other at-rules are left out, so a
// reduced-motion override does not replace the real durations.
export function parseThemeCss(css) {
  const text = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = {};
  let depth = 0;
  let start = 0;
  let selector = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) selector = text.slice(start, i).trim();
      depth++;
      if (depth === 1) start = i + 1;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        if (selector && !selector.startsWith('@') && selector.split(',').some((s) => s.trim() === ':root')) {
          for (const m of text.slice(start, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) tokens[m[1]] = m[2].trim();
        }
        start = i + 1;
        selector = null;
      }
    }
  }
  return tokens;
}

// Accepts a path to a .css or .json file, a { tokens } object, a plain { '--name': value } object, or a list of these
// (later ones override earlier ones, the way stylesheets load: tokens.css, then theme.css). A { tokens } system
// (taster.system.json) may carry identity.logoFont; a later one that declares it wins.
export function loadSystem(input) {
  if (input == null) return null;
  const list = Array.isArray(input) ? input : [input];
  if (!list.length) return null;
  const tokens = {};
  const sources = [];
  let identity = null;
  const takeIdentity = (obj, where) => {
    const id = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj.identity : null;
    if (id && id.logoFont != null) identity = normIdentity(id, where);
  };
  for (const item of list) {
    if (typeof item === 'string') {
      if (!existsSync(item)) throw new Error(`System file not found: ${item}`);
      const text = readFileSync(item, 'utf8');
      if (/\.json$/i.test(item)) {
        const obj = JSON.parse(text);
        Object.assign(tokens, tokenMap(obj, item));
        takeIdentity(obj, item);
      } else Object.assign(tokens, parseThemeCss(text));
      sources.push(item);
    } else if (item && typeof item === 'object') {
      Object.assign(tokens, tokenMap(item, 'system object'));
      takeIdentity(item, 'system object');
      sources.push(item.source || 'object');
    } else throw new Error(`Not a system: ${item}`);
  }
  const names = Object.keys(tokens).filter((k) => k.startsWith('--'));
  if (!names.length) throw new Error('The system has no CSS custom properties (expected --name: value tokens)');
  return { loaded: true, sources, tokens: Object.fromEntries(names.sort().map((k) => [k, String(tokens[k])])), identity };
}

// { logoFont } with a family name, or null when nothing is declared.
export function normIdentity(identity, where = 'identity') {
  if (identity == null) return null;
  const raw = typeof identity === 'string' ? identity : identity.logoFont;
  if (raw == null) return null;
  if (typeof raw !== 'string' || !raw.replace(/["']/g, '').trim()) throw new Error(`${where}: identity.logoFont must be a font family name`);
  return { logoFont: raw.split(',')[0].replace(/["']/g, '').trim() };
}

function tokenMap(obj, where) {
  const map = obj.tokens && typeof obj.tokens === 'object' ? obj.tokens : obj;
  if (typeof obj.css === 'string' && !obj.tokens) return parseThemeCss(obj.css);
  const out = {};
  for (const [k, v] of Object.entries(map)) if (k.startsWith('--') && (typeof v === 'string' || typeof v === 'number')) out[k] = String(v);
  if (!Object.keys(out).length) throw new Error(`No --tokens in ${where}`);
  return out;
}

// What kind of value a token is, from its name. Unknown names are tried as colors and dropped when they are not one.
export function tokenKind(name) {
  const n = name.toLowerCase();
  if (/radius|radii|rounded|^--r-/.test(n)) return 'radius';
  if (/shadow|^--sh-|elevation/.test(n)) return 'shadow';
  if (/duration|^--dur|delay|stagger/.test(n)) return 'duration';
  if (/(^|-)(font|family|ff|typeface)(-|$)/.test(n) && !/size|weight|line|leading|tracking/.test(n)) return 'fontFamily';
  if (/^--sp-|^--space|spacing|gap|gutter|^--s-\d/.test(n)) return 'spacing';
  return 'color';
}

// ---- in the page ----

/* eslint-disable no-undef */
function collectInPage({ tokens, kinds, maxPerRole }) {
  const SKIP = 'script,style,noscript,template,svg,canvas,iframe,[hidden],[aria-hidden="true"]';
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // Any CSS color (rgb, oklch, lab, color-mix ...) to 8-bit RGBA by painting one pixel. null when fully transparent.
  const rgba = (c) => {
    if (!c || c === 'transparent') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return d[3] === 0 ? null : [d[0], d[1], d[2], d[3]];
  };
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'));
  const sel = (el) => {
    const parts = [];
    for (let cur = el; cur && cur.nodeType === 1 && cur !== document.body; cur = cur.parentElement) {
      if (cur.id && document.querySelectorAll(`#${esc(cur.id)}`).length === 1) {
        parts.unshift(`#${esc(cur.id)}`);
        return parts.join(' > ');
      }
      let seg = cur.tagName.toLowerCase();
      const cls = (cur.getAttribute('class') || '').split(/\s+/).filter((c) => c && /^[A-Za-z_][\w-]*$/.test(c));
      if (cls.length) seg += `.${esc(cls[0])}`;
      const sibs = cur.parentElement ? [...cur.parentElement.children].filter((s) => s.tagName === cur.tagName) : [];
      if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
      parts.unshift(seg);
    }
    return parts.join(' > ') || 'body';
  };
  const ownText = (el) => clean([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const filled = (s) => rgba(s.backgroundColor) !== null || s.backgroundImage !== 'none';
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const borderSides = (s) => sides.filter((d) => parseFloat(s[`border${d}Width`]) > 0 && s[`border${d}Style`] !== 'none' && rgba(s[`border${d}Color`]));
  const isAction = (s) => parseFloat(s.paddingLeft) >= 8 && parseFloat(s.paddingTop) >= 4 && (filled(s) || borderSides(s).length > 0);
  const INPUT_SKIP = /^(hidden|submit|button|reset|checkbox|radio|range|color|file|image)$/;
  const vw = window.innerWidth;

  function roleOf(el, s, r) {
    const tag = el.tagName;
    if (tag === 'BUTTON' || el.getAttribute('role') === 'button' || (tag === 'INPUT' && /^(submit|button|reset)$/.test(el.type))) return 'button';
    if ((tag === 'INPUT' && !INPUT_SKIP.test(el.type)) || tag === 'TEXTAREA' || tag === 'SELECT') return 'input';
    if (tag === 'A' && el.hasAttribute('href')) return isAction(s) ? 'button' : clean(el.textContent) ? 'link' : null;
    if (/^H[1-3]$/.test(tag)) return `h${tag[1]}`;
    if (el.closest('a,button,[role="button"]')) return null;
    const boxed = filled(s) || borderSides(s).length === 4;
    if (boxed) {
      const text = clean(el.innerText);
      if (ownText(el) && text.length <= 24 && r.height <= 32 && r.width <= 240 && parseFloat(s.paddingLeft) >= 4) return 'badge';
      // A card has its own box, padding, content, and sits inside the page gutters (a full-bleed band is not a card).
      if (!/^inline/.test(s.display) && r.left >= 4 && r.right <= vw - 4 && r.height >= 40 && parseFloat(s.paddingTop) >= 8 && parseFloat(s.paddingLeft) >= 8 && text) return 'card';
    }
    if (tag === 'P' && ownText(el)) return 'body';
    return null;
  }

  // The site's logo: the home link or a logo-classed element in the header and footer, and the header's first link.
  const logos = new Set();
  const home = (a) => {
    const h = a.getAttribute('href');
    if (h === '/' || h === './') return true;
    try {
      const u = new URL(a.href);
      return /^https?:$/.test(u.protocol) && u.origin === location.origin && u.pathname === '/';
    } catch {
      return false;
    }
  };
  for (const zone of document.querySelectorAll('header,[role="banner"],footer,[role="contentinfo"]')) {
    for (const a of zone.querySelectorAll('a[href]')) if (home(a)) logos.add(a);
    for (const e of zone.querySelectorAll('[class*="logo" i]')) logos.add(e);
  }
  const banner = document.querySelector('header,[role="banner"]');
  const firstLink = banner && banner.querySelector('a[href]');
  if (firstLink) logos.add(firstLink);
  const inLogo = (el) => [...logos].some((l) => l === el || l.contains(el));

  const elements = [];
  const counts = {};
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest(SKIP)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const role = roleOf(el, s, r);
    if (!role) continue;
    counts[role] = (counts[role] || 0) + 1;
    if (counts[role] > maxPerRole) continue;
    const border = borderSides(s);
    elements.push({
      role,
      selector: sel(el),
      text: clean(el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 40),
      logo: inLogo(el),
      w: r.width,
      h: r.height,
      style: {
        radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
        gap: /flex|grid/.test(s.display) ? [s.rowGap, s.columnGap].map((g) => (g === 'normal' ? '0px' : g)) : null,
        color: rgba(s.color),
        background: rgba(s.backgroundColor),
        borderColor: border.map((d) => rgba(s[`border${d}Color`])),
        shadow: s.boxShadow,
        duration: s.transitionDuration,
      },
    });
  }

  // Resolve each system token the way this page would: set every token on a hidden probe (so chains between system
  // tokens resolve inside the system) and read var(--name) back through a property of its kind. A var() the system
  // does not define falls through to the page's own custom properties.
  let allowed = null;
  if (tokens) {
    allowed = { radius: [], spacing: [], fontFamily: [], color: [], shadow: [], duration: [] };
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;color:rgb(1, 2, 3);font-family:taster-sentinel;letter-spacing:0.123px';
    for (const [k, v] of Object.entries(tokens)) wrap.style.setProperty(k, v);
    document.body.appendChild(wrap);
    for (const [name, kind] of Object.entries(kinds)) {
      const probe = document.createElement('div');
      wrap.appendChild(probe);
      const ps = getComputedStyle(probe);
      const v = `var(${name})`;
      if (kind === 'radius' || kind === 'spacing') {
        probe.style.letterSpacing = v;
        if (ps.letterSpacing !== '0.123px' && /px$/.test(ps.letterSpacing)) allowed[kind].push({ token: name, value: ps.letterSpacing });
      } else if (kind === 'fontFamily') {
        probe.style.fontFamily = v;
        if (ps.fontFamily !== 'taster-sentinel') allowed.fontFamily.push({ token: name, value: ps.fontFamily });
      } else if (kind === 'shadow') {
        probe.style.boxShadow = v;
        allowed.shadow.push({ token: name, value: ps.boxShadow });
      } else if (kind === 'duration') {
        probe.style.transitionDuration = v;
        allowed.duration.push({ token: name, value: ps.transitionDuration });
      } else {
        probe.style.color = v;
        const c = ps.color !== 'rgb(1, 2, 3)' ? rgba(ps.color) : null;
        if (c) allowed.color.push({ token: name, value: c });
      }
    }
    wrap.remove();
  }
  return { elements, counts, allowed };
}
/* eslint-enable no-undef */

async function collectScreen(browser, url, viewport, { system, timeout }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, bypassCSP: true });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForLoadState('load', { timeout: LOAD_WAIT }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const kinds = system ? Object.fromEntries(Object.keys(system.tokens).map((k) => [k, tokenKind(k)])) : null;
    return await page.evaluate(collectInPage, { tokens: system ? system.tokens : null, kinds, maxPerRole: MAX_PER_ROLE });
  } finally {
    await page.close();
  }
}

// ---- values ----

const num = (v) => parseFloat(v);
const fmt = (n) => `${Math.round(n * 100) / 100}`;
const rgbaText = (c) => (c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${fmt(c[3] / 255)})` : 'none');
const hex = (c) => `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const labCache = new Map();
function oklab(c) {
  const key = hex(c);
  if (!labCache.has(key)) {
    const { l, c: ch, h } = hexToOklch(key);
    labCache.set(key, [l, ch * Math.cos((h * Math.PI) / 180), ch * Math.sin((h * Math.PI) / 180)]);
  }
  return labCache.get(key);
}
export function colorDistance(a, b) {
  const [x, y] = [oklab(a), oklab(b)];
  return { deltaE: Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]), alpha: Math.abs(a[3] - b[3]) };
}
const lengths = (list) => list.map((v) => String(v).split(/\s+/).map(num)).flat();
const shorthand = (n) => {
  const [t, r, b, l] = n.map((x) => `${fmt(x)}px`);
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
};
const familyList = (f) => String(f).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
const durations = (d) => String(d).split(',').map((x) => (/ms$/.test(x.trim()) ? num(x) : num(x) * 1000));

// One element's value for one property: text (what the report prints and what groups samples), and the numbers or
// colors that tolerance compares.
export function valueOf(prop, style, box) {
  const s = style;
  switch (prop) {
    case 'radius': {
      if (s.radius.some((v) => /%/.test(v))) return { text: s.radius.some((v) => num(v) >= 50) ? 'full' : s.radius.join(' ') };
      const n = lengths(s.radius);
      // Any radius at or past half the short side draws a full pill or circle; 999px and 9999px look the same.
      if (box && n.every((x) => x >= Math.min(box.w, box.h) / 2 - TOLERANCE.lengthPx)) return { text: 'full' };
      return n.every((x) => x === n[0]) ? { text: `${fmt(n[0])}px`, nums: [n[0]] } : { text: n.map((x) => `${fmt(x)}px`).join(' '), nums: n };
    }
    case 'padding': {
      const n = s.padding.map(num);
      return { text: shorthand(n), nums: n };
    }
    case 'gap': {
      if (!s.gap) return null;
      const n = s.gap.map(num);
      return { text: n[0] === n[1] ? `${fmt(n[0])}px` : `${fmt(n[0])}px ${fmt(n[1])}px`, nums: n };
    }
    case 'fontSize':
      return { text: `${fmt(num(s.fontSize))}px`, nums: [num(s.fontSize)] };
    case 'lineHeight':
      return s.lineHeight === 'normal' ? { text: 'normal' } : { text: `${fmt(num(s.lineHeight))}px`, nums: [num(s.lineHeight)] };
    case 'fontFamily':
      return { text: familyList(s.fontFamily).join(', ') };
    case 'fontWeight':
      return { text: String(s.fontWeight) };
    case 'color':
    case 'background': {
      const c = s[prop];
      return { text: rgbaText(c), colors: c ? [c] : [] };
    }
    case 'borderColor': {
      const list = s.borderColor.filter(Boolean);
      const uniq = [...new Map(list.map((c) => [c.join(','), c])).values()];
      return { text: uniq.length ? uniq.map(rgbaText).join(' ') : 'none', colors: uniq };
    }
    case 'shadow':
      return { text: String(s.shadow).replace(/\s+/g, ' ').trim() };
    case 'duration': {
      const ms = durations(s.duration);
      return { text: ms.map((x) => `${fmt(x)}ms`).join(', '), nums: ms, time: true };
    }
    default:
      throw new Error(`Unknown property ${prop}`);
  }
}

function colorsClose(a, b, dE, dA) {
  if (a.length !== b.length) return false;
  return a.every((c, i) => {
    const d = colorDistance(c, b[i]);
    return d.deltaE <= dE && d.alpha <= dA;
  });
}

// Same value within tolerance.
export function close(prop, a, b) {
  if (!a || !b) return a === b;
  if (a.text === b.text) return true;
  const kind = PROPS[prop].kind;
  if (kind === 'color') return colorsClose(a.colors, b.colors, TOLERANCE.colorDeltaE, TOLERANCE.alpha);
  if ((kind === 'length' || kind === 'time') && a.nums && b.nums && a.nums.length === b.nums.length) {
    const tol = kind === 'time' ? TOLERANCE.durationMs : TOLERANCE.lengthPx;
    return a.nums.every((x, i) => Math.abs(x - b.nums[i]) <= tol);
  }
  return false;
}

function sameVariant(role, a, b) {
  return VARIANT_PROPS[role].every((p) => {
    const [x, y] = [a.values[p], b.values[p]];
    if (!x || !y) return x === y;
    return x.text === y.text || colorsClose(x.colors, y.colors, TOLERANCE.variantDeltaE, TOLERANCE.variantAlpha);
  });
}

// ---- compare ----

// Groups one screen's elements of one role by their exact values.
function groupsOf(elements, role) {
  const props = ROLE_PROPS[role];
  const map = new Map();
  for (const el of elements) {
    if (el.role !== role) continue;
    const values = Object.fromEntries(props.map((p) => [p, valueOf(p, el.style, el)]));
    const key = props.map((p) => values[p]?.text ?? '-').join('|');
    if (!map.has(key)) map.set(key, { key, values, count: 0, selectors: [], elements: [] });
    const g = map.get(key);
    g.count++;
    g.elements.push(el);
    if (g.selectors.length < MAX_SELECTORS && !g.selectors.includes(el.selector)) g.selectors.push(el.selector);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// Drift pairs a style only screen `from` has with the nearest same-variant style only screen `to` has, and reports the
// properties where they differ. A style both screens draw the same way is the reference; an extra style that one
// screen has alone (a caption, a note) is a variant, which the system check judges, not drift.
function driftBetween(role, from, to, record) {
  const props = ROLE_PROPS[role];
  const exact = (g, list) => list.some((m) => props.every((p) => close(p, g.values[p], m.values[p])));
  const toOnly = to.groups.filter((m) => !exact(m, from.groups));
  for (const g of from.groups) {
    if (exact(g, to.groups)) continue;
    const candidates = toOnly.filter((m) => sameVariant(role, g, m));
    let best = null;
    let bestDiff = null;
    for (const m of candidates) {
      const diff = props.filter((p) => !close(p, g.values[p], m.values[p]));
      if (!bestDiff || diff.length < bestDiff.length) [best, bestDiff] = [m, diff];
    }
    if (!best) continue;
    for (const p of bestDiff) {
      record(role, p, g.values[p], from.id, g);
      record(role, p, best.values[p], to.id, best);
    }
  }
}

export function compareScreens(collected, { widths, screens }) {
  const order = new Map(screens.map((s, i) => [s.id, i]));
  const drift = [];
  for (const width of widths) {
    const found = new Map();
    const record = (role, prop, value, screenId, group) => {
      const k = `${role}|${prop}`;
      if (!found.has(k)) found.set(k, { width, role, property: PROPS[prop].css, prop, values: new Map() });
      const f = found.get(k);
      const vk = value ? value.text : 'none';
      if (!f.values.has(vk)) f.values.set(vk, new Map());
      const byScreen = f.values.get(vk);
      if (!byScreen.has(screenId)) byScreen.set(screenId, new Map());
      byScreen.get(screenId).set(group.key, group);
    };
    for (const role of ROLES) {
      const per = screens
        .map((s) => ({ id: s.id, groups: groupsOf(collected[s.id][width].elements, role) }))
        .filter((s) => s.groups.length);
      for (let i = 0; i < per.length; i++) {
        for (let j = i + 1; j < per.length; j++) {
          driftBetween(role, per[j], per[i], record);
          driftBetween(role, per[i], per[j], record);
        }
      }
    }
    const list = [...found.values()].map((f) => ({
      width: f.width,
      role: f.role,
      property: f.property,
      values: [...f.values.entries()]
        .map(([value, byScreen]) => ({
          value,
          screens: [...byScreen.entries()]
            .sort((a, b) => order.get(a[0]) - order.get(b[0]))
            .map(([id, groups]) => {
              const gs = [...groups.values()];
              return { id, count: gs.reduce((n, g) => n + g.count, 0), selectors: [...new Set(gs.flatMap((g) => g.selectors))].slice(0, MAX_SELECTORS) };
            }),
        }))
        .sort((a, b) => order.get(a.screens[0].id) - order.get(b.screens[0].id) || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)),
      _sort: [ROLES.indexOf(f.role), PROP_ORDER.indexOf(f.prop)],
    }));
    list.sort((a, b) => a._sort[0] - b._sort[0] || a._sort[1] - b._sort[1]);
    drift.push(...list.map(({ _sort, ...f }) => f));
  }
  return drift;
}

// The resolved allowed values per kind, as numbers and colors the checks can compare.
function allowedSets(raw) {
  const pxList = (list) => list.map((t) => ({ token: t.token, value: t.value, n: num(t.value) }));
  return {
    radius: pxList(raw.radius),
    spacing: pxList(raw.spacing),
    fontFamily: raw.fontFamily.map((t) => ({ token: t.token, value: t.value, primary: familyList(t.value)[0] })),
    color: raw.color.map((t) => ({ token: t.token, value: rgbaText(t.value), c: t.value })),
    shadow: raw.shadow.map((t) => ({ token: t.token, value: String(t.value).replace(/\s+/g, ' ').trim() })),
    duration: raw.duration.map((t) => ({ token: t.token, value: t.value, n: durations(t.value)[0] })),
  };
}

const nearestBy = (list, dist) => list.map((t) => [t, dist(t)]).sort((a, b) => a[1] - b[1] || (a[0].token < b[0].token ? -1 : 1))[0]?.[0] || null;

// Checks one value against the system. Returns null when it is on the system, else { value, nearest }.
function offSystem(prop, el, allowed) {
  const kind = PROPS[prop].system;
  const set = allowed[kind];
  if (!kind || !set.length) return null;
  const s = el.style;
  const pxOk = (n) => n === 0 || set.some((t) => Math.abs(t.n - n) <= TOLERANCE.lengthPx);
  const nearPx = (n) => nearestBy(set, (t) => Math.abs(t.n - n));
  if (prop === 'radius') {
    const v = valueOf('radius', s, el);
    if (v.text === 'full') {
      // A full pill is on the system when some radius token also draws it full at this size.
      const half = Math.min(el.w, el.h) / 2 - TOLERANCE.lengthPx;
      return set.some((t) => t.n >= half) ? null : { value: 'full', nearest: nearestBy(set, (t) => -t.n) };
    }
    if (!v.nums) return { value: v.text, nearest: null };
    const bad = v.nums.find((n) => !pxOk(n));
    return bad === undefined ? null : { value: v.text, nearest: nearPx(bad) };
  }
  if (prop === 'padding' || prop === 'gap') {
    const v = valueOf(prop, s, el);
    if (!v) return null;
    const bad = v.nums.find((n) => !pxOk(n));
    return bad === undefined ? null : { value: v.text, nearest: nearPx(bad) };
  }
  if (prop === 'fontFamily') {
    const primary = familyList(s.fontFamily)[0];
    return set.some((t) => t.primary === primary) ? null : { value: familyList(s.fontFamily).join(', '), nearest: set[0] };
  }
  if (prop === 'color' || prop === 'background' || prop === 'borderColor') {
    const v = valueOf(prop, s, el);
    for (const c of v.colors) {
      if (set.some((t) => colorsClose([c], [t.c], TOLERANCE.colorDeltaE, TOLERANCE.alpha))) continue;
      return { value: rgbaText(c), nearest: nearestBy(set, (t) => colorDistance(c, t.c).deltaE + colorDistance(c, t.c).alpha / 255) };
    }
    return null;
  }
  if (prop === 'shadow') {
    const v = valueOf('shadow', s, el);
    return v.text === 'none' || set.some((t) => t.value === v.text) ? null : { value: v.text, nearest: set[0] };
  }
  if (prop === 'duration') {
    const ms = durations(s.duration);
    const bad = ms.find((n) => n !== 0 && !set.some((t) => Math.abs(t.n - n) <= TOLERANCE.durationMs));
    return bad === undefined ? null : { value: valueOf('duration', s, el).text, nearest: nearestBy(set, (t) => Math.abs(t.n - bad)) };
  }
  return null;
}

// Off-system values, and apart from them the values an identity exemption covers: only font-family, only inside the
// logo, only the declared face. Returns { offSystem, exempt }.
export function checkSystem(collected, { widths, screens, identity = null }) {
  const out = [];
  const exempt = [];
  const logoFace = identity && identity.logoFont ? identity.logoFont.toLowerCase() : null;
  const reason = logoFace ? `logo face declared by the system identity (${identity.logoFont})` : null;
  const sorted = (found) =>
    [...found.values()]
      .sort((a, b) => a._sort[0] - b._sort[0] || a._sort[1] - b._sort[1] || (a._sort[2] < b._sort[2] ? -1 : a._sort[2] > b._sort[2] ? 1 : 0))
      .map(({ _sort, ...f }) => f);
  for (const width of widths) {
    for (const screen of screens) {
      const { elements, allowed } = collected[screen.id][width];
      if (!allowed) continue;
      const sets = allowedSets(allowed);
      const found = new Map();
      const spared = new Map();
      for (const el of elements) {
        for (const prop of ROLE_PROPS[el.role]) {
          const miss = offSystem(prop, el, sets);
          if (!miss) continue;
          const isExempt = logoFace && prop === 'fontFamily' && el.logo && familyList(el.style.fontFamily)[0] === logoFace;
          const into = isExempt ? spared : found;
          const k = `${el.role}|${prop}|${miss.value}`;
          if (!into.has(k)) {
            into.set(k, {
              width,
              screen: screen.id,
              role: el.role,
              property: PROPS[prop].css,
              kind: PROPS[prop].system,
              value: miss.value,
              count: 0,
              selectors: [],
              ...(isExempt ? { reason } : { nearest: miss.nearest ? { token: miss.nearest.token, value: miss.nearest.value } : null }),
              _sort: [ROLES.indexOf(el.role), PROP_ORDER.indexOf(prop), miss.value],
            });
          }
          const f = into.get(k);
          f.count++;
          if (f.selectors.length < MAX_SELECTORS && !f.selectors.includes(el.selector)) f.selectors.push(el.selector);
        }
      }
      out.push(...sorted(found));
      exempt.push(...sorted(spared));
    }
  }
  return { offSystem: out, exempt };
}

// ---- entry points ----

// A short id for each screen: the file name, or the URL path ('/' is home). Repeated ids get -2, -3.
export function screenIds(targets) {
  const seen = new Map();
  return targets.map((t) => {
    if (t && typeof t === 'object') return { id: String(t.id), source: t.source };
    let id;
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      id = u.pathname.replace(/\.[a-z0-9]+$/i, '').replace(/^\/+|\/+$/g, '').replace(/[^\w]+/g, '-').toLowerCase() || 'home';
    } else {
      id = basename(t.replace(/^file:\/\//i, ''), extname(t)).replace(/[^\w]+/g, '-').toLowerCase() || 'screen';
    }
    if (id === 'index') id = 'home';
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    return { id: n > 1 ? `${id}-${n}` : id, source: t };
  });
}

// screens: URLs, file paths or { id, source }. system: anything loadSystem accepts, or null. identity: { logoFont } (or
// the family name) to exempt the logo face; it overrides what the system declares.
export async function checkConsistency(targets, { system = null, identity = null, widths = CONSISTENCY_WIDTHS, timeout = 30000 } = {}) {
  if (!Array.isArray(targets) || !targets.length) throw new Error('Give at least one screen');
  let sys = system == null ? null : system.loaded === true ? system : loadSystem(system);
  const declared = normIdentity(identity, 'identity option');
  if (declared && !sys) throw new Error('An identity exemption needs a system to check against');
  if (declared) sys = { ...sys, identity: declared };
  if (targets.length < 2 && !sys) throw new Error('Give two or more screens to compare, or one screen and a system');
  const screens = screenIds(targets).map((s) => ({ ...s, url: toUrl(s.source) }));
  const ids = screens.map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Screen ids repeat: ${ids.join(', ')}`);
  const browser = await launch();
  const collected = {};
  try {
    for (const s of screens) {
      collected[s.id] = {};
      for (const width of widths) {
        const viewport = { width, height: width < 768 ? 844 : 900 };
        collected[s.id][width] = await collectScreen(browser, s.url, viewport, { system: sys, timeout });
      }
    }
  } finally {
    await browser.close();
  }
  return buildReport(collected, { screens, widths, system: sys });
}

export function buildReport(collected, { screens, widths, system }) {
  const drift = compareScreens(collected, { widths, screens });
  const identity = system ? system.identity || null : null;
  const { offSystem: offSystemFindings, exempt } = system ? checkSystem(collected, { widths, screens, identity }) : { offSystem: [], exempt: [] };
  let systemSummary = null;
  if (system) {
    const first = collected[screens[0].id][widths[0]].allowed;
    const kinds = Object.fromEntries(SYSTEM_KINDS.map((k) => [k, first ? first[k].length : 0]));
    systemSummary = {
      sources: system.sources,
      tokens: Object.keys(system.tokens).length,
      kinds,
      unchecked: SYSTEM_KINDS.filter((k) => !kinds[k]),
      identity,
    };
  }
  const roles = Object.fromEntries(
    screens.map((s) => [s.id, Object.fromEntries(widths.map((w) => [w, Object.fromEntries(ROLES.filter((r) => collected[s.id][w].counts[r]).map((r) => [r, collected[s.id][w].counts[r]]))]))]),
  );
  return {
    screens: screens.map(({ id, source, url }) => ({ id, source, url })),
    widths,
    tolerance: TOLERANCE,
    system: systemSummary,
    roles,
    drift,
    offSystem: offSystemFindings,
    exempt,
    findings: drift.length + offSystemFindings.length,
    ok: drift.length + offSystemFindings.length === 0,
  };
}

export function formatConsistencyText(report) {
  const ids = report.screens.map((s) => s.id);
  const out = [`${ids.length} screen${ids.length === 1 ? '' : 's'} (${ids.join(', ')}) at ${report.widths.join(' and ')} wide`];
  if (report.system) {
    const k = report.system.kinds;
    out.push(`system: ${report.system.tokens} tokens (${SYSTEM_KINDS.map((x) => `${k[x]} ${x}`).join(', ')})`);
    if (report.system.unchecked.length) out.push(`not checked against the system (no tokens of this kind): ${report.system.unchecked.join(', ')}`);
  } else out.push('system: none given, only cross-screen drift is checked');
  out.push('', `Drift: ${report.drift.length}`);
  for (const d of report.drift) {
    out.push(`  ${d.role} ${d.property} at ${d.width}`);
    for (const v of d.values) out.push(`    ${v.value}  ${v.screens.map((s) => `${s.id} (${s.count}: ${s.selectors.join(', ')})`).join('; ')}`);
  }
  if (report.system) {
    out.push('', `Off system: ${report.offSystem.length}`);
    for (const f of report.offSystem) {
      out.push(`  ${f.screen}  ${f.role} ${f.property} ${f.value} at ${f.width}  (${f.count}: ${f.selectors.join(', ')})${f.nearest ? `  nearest ${f.nearest.token} ${f.nearest.value}` : ''}`);
    }
    if (report.system.identity) {
      const ex = report.exempt || [];
      out.push('', `Exempt as identity (logo face ${report.system.identity.logoFont}), not counted: ${ex.length}`);
      for (const f of ex) out.push(`  ${f.screen}  ${f.role} ${f.property} ${f.value} at ${f.width}  (${f.count}: ${f.selectors.join(', ')})`);
    }
  }
  out.push('', report.ok ? 'CONSISTENCY OK' : `CONSISTENCY FAIL ${report.findings} finding${report.findings === 1 ? '' : 's'}`);
  return out.join('\n');
}
