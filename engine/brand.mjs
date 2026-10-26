// Brand intake: turn what extract.js read from a site (logo, solid action color, fonts, light or dark) into token
// overrides, so a swap or a rebuild keeps the owner's brand instead of the repo's neutral defaults.
// Deterministic: the same content gives the same theme. Every choice it makes is written into `notes`.
import { readFileSync } from 'node:fs';

const DETECT = readFileSync(new URL('../rules/detect.js', import.meta.url), 'utf8');
function fontList(name) {
  const m = DETECT.match(new RegExp(`var ${name} = \\{([\\s\\S]*?)\\};`));
  return new Set(m ? [...m[1].matchAll(/'([^']+)'|(\b[a-z][\w-]*)\s*:/g)].map((x) => (x[1] || x[2]).toLowerCase()) : []);
}
const DEFAULT_FONTS = fontList('DEFAULT_FONTS');
const FAVORITE_FONTS = fontList('FAVORITE_FONTS');
const KOREAN_FONT_RE = new RegExp(DETECT.match(/var KOREAN_FONT_RE = \/(.+)\/i;/)[1], 'i');

export const TASTER_FONT = "'IBM Plex Sans', 'IBM Plex Sans KR', -apple-system, system-ui, sans-serif";
const HANGUL_FALLBACK = "'IBM Plex Sans KR'";

// ---- color math: sRGB hex to OKLCH and back (Bjorn Ottosson's OKLab) ----
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function hexToOklch(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(n.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c: C, h: H };
}
export function oklchToHex({ l, c, h }) {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(v))) * 255).toString(16).padStart(2, '0')).join('')}`;
}
function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(n.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Meaning colors start from a green and a red and move away from the brand hue when they would be confused with it.
const SUCCESS_HUE = 150;
const DANGER_HUE = 27;
const MIN_GAP = 35;
function semanticHue(base, brandHue, away) {
  if (brandHue == null || hueGap(base, brandHue) >= MIN_GAP) return { hue: base, moved: false };
  // Step away from the brand hue in the given direction until the gap is wide enough, staying in a readable range.
  let h = base;
  for (let i = 0; i < 12 && hueGap(h, brandHue) < MIN_GAP; i++) h = (h + away * 5 + 360) % 360;
  return { hue: h, moved: true };
}

function cleanFamily(f) {
  return String(f || '').replace(/["']/g, '').trim();
}

export function brandTheme(content) {
  const notes = [];
  const brand = content?.brand || {};
  const dark = !!brand.dark;
  const tokens = {};

  // 1. Brand color: the solid color the site puts on its own actions.
  let brandHue = null;
  if (brand.color && /^#[0-9a-f]{6}$/i.test(brand.color)) {
    const lch = hexToOklch(brand.color);
    tokens['--brand'] = brand.color;
    const onBrand = contrast(brand.color, '#ffffff') >= contrast(brand.color, '#111111') ? '#ffffff' : '#111111';
    tokens['--accent-fg'] = onBrand;
    if (lch.c >= 0.04) brandHue = lch.h;
    notes.push(`Brand color ${brand.color} from the site's own buttons and links becomes --brand; text on it is ${onBrand} (contrast ${contrast(brand.color, onBrand).toFixed(1)}:1).`);
    if (contrast(brand.color, onBrand) < 4.5) notes.push('Text on the brand color is under 4.5:1. Use the brand color for large shapes and keep small text off it.');
  } else {
    notes.push('No solid brand color on the site\'s actions (gradients are not a brand color). The neutral accent stays; ask the owner for their brand color.');
  }

  // 2. Typeface: carry the site's face when it was a choice, not a stock or usual AI default.
  const heading = cleanFamily(brand.fonts?.heading);
  const body = cleanFamily(brand.fonts?.body);
  const pick = heading || body;
  const lower = pick.toLowerCase();
  if (!pick || DEFAULT_FONTS.has(lower)) {
    tokens['--font'] = TASTER_FONT;
    notes.push(`The site falls back to a stock font${pick ? ` (${pick})` : ''}, which is not a brand choice. Using the Taster default, IBM Plex.`);
  } else if (FAVORITE_FONTS.has(lower) || lower === 'inter') {
    tokens['--font'] = TASTER_FONT;
    notes.push(`The site uses ${pick}, one of the faces generated pages default to (TYP-01, TYP-02). Using IBM Plex instead. If ${pick} is part of the brand on purpose, set --font back to it and accept the finding.`);
  } else {
    const stack = [`'${pick}'`];
    if (body && body !== pick && !DEFAULT_FONTS.has(body.toLowerCase())) stack.push(`'${body}'`);
    if (!stack.some((f) => KOREAN_FONT_RE.test(f))) stack.push(HANGUL_FALLBACK);
    stack.push('-apple-system', 'system-ui', 'sans-serif');
    tokens['--font'] = stack.join(', ');
    notes.push(`Keeping the site's typeface ${pick}${body && body !== pick ? ` with ${body} for body text` : ''}. Load it the way the site does.`);
  }
  if (/^ko/i.test(content?.lang || '') && !KOREAN_FONT_RE.test(tokens['--font'])) tokens['--font'] += `, ${HANGUL_FALLBACK}`;

  // 3. Meaning colors, fitted to the brand: readable on the page, never confusable with the brand color.
  const L = dark ? 0.72 : 0.5;
  const success = semanticHue(SUCCESS_HUE, brandHue, +1);
  const danger = semanticHue(DANGER_HUE, brandHue, -1);
  tokens['--success'] = oklchToHex({ l: L, c: 0.14, h: success.hue });
  tokens['--danger'] = oklchToHex({ l: L, c: 0.17, h: danger.hue });
  tokens['--destructive'] = tokens['--danger'];
  tokens['--delta-up'] = tokens['--success'];
  tokens['--delta-down'] = tokens['--danger'];
  notes.push(`Success ${tokens['--success']} and failure ${tokens['--danger']} for a ${dark ? 'dark' : 'light'} page${success.moved || danger.moved ? ', moved away from the brand hue so a status dot never reads as brand decoration' : ''}. Use them flat, only for real outcomes; AC-08 allows dots in exactly these colors.`);
  if (brandHue != null) notes.push(`Hue gap to the brand: success ${Math.round(hueGap(success.hue, brandHue))} degrees, failure ${Math.round(hueGap(danger.hue, brandHue))} degrees.`);

  // 4. Logo: never redrawn.
  if (brand.logo?.kind === 'image') notes.push(`Logo is an image (${brand.logo.src}). Use the file as is; do not redraw it or set it in a font.`);
  else if (brand.logo?.kind === 'text') notes.push(`Logo is set as text ("${brand.logo.text}"). Ask the owner for the logo file before shipping; do not invent a mark.`);
  else notes.push('No logo found. Ask the owner for the logo file.');

  const css = [
    '/* Brand theme generated by Taster from the original site. Load after registry/src/tokens.css. */',
    ':root {',
    ...Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`),
    '}',
    '',
  ].join('\n');
  return { source: { name: brand.name || null, logo: brand.logo || null, color: brand.color || null, fonts: brand.fonts || null, dark }, tokens, css, notes };
}
