// Measures what each weighting axis needs from a rendered page: radii by role, spacing and control heights, text
// contrast, the type scale, colors, shadows, motion and borders. No dependencies. Load it into a page and call
// window.tasterMeasure(). It returns raw numbers only; packages/engine/system.mjs maps them to axis steps, so the mapping is
// testable without a browser. See skills/taster/references/system.md for what each number means.
window.tasterMeasure = function tasterMeasure() {
  const SKIP = 'script,style,noscript,template,svg,canvas,iframe,[hidden],[aria-hidden="true"]';
  const vw = window.innerWidth;
  const pageH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

  function parseRgba(c) {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.slice(0, 3).some((x) => !Number.isFinite(x))) return null;
    return [p[0], p[1], p[2], p.length > 3 && Number.isFinite(p[3]) ? p[3] : 1];
  }
  const over = (top, base) => [0, 1, 2].map((i) => top[i] * top[3] + base[i] * (1 - top[3]));

  function visible(el) {
    if (el.closest(SKIP)) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // The browser's canvas under a page whose html and body are transparent: white, unless the page asks for a dark
  // canvas with color-scheme (a transparent background is never read as black).
  const CANVAS = (() => {
    const meta = document.querySelector('meta[name="color-scheme"]')?.content || '';
    const scheme = `${getComputedStyle(document.documentElement).colorScheme || ''} ${meta}`.toLowerCase();
    const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    return /\bdark\b/.test(scheme) && (!/\blight\b/.test(scheme) || prefersDark) ? [18, 18, 18] : [255, 255, 255];
  })();

  // The color behind an element, composited from the root down. null when a gradient or image sits behind it,
  // because then no single background color exists to measure against.
  function backdrop(el) {
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.push(e);
    let color = CANVAS.slice();
    for (const e of chain.reverse()) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        color = null;
        continue;
      }
      const bg = parseRgba(s.backgroundColor);
      if (bg && bg[3] > 0) color = bg[3] >= 1 || !color ? bg.slice(0, 3) : over(bg, color);
    }
    return color;
  }
  const parentBackdrop = (el) => (el.parentElement ? backdrop(el.parentElement) : CANVAS.slice());

  const all = [...document.body.querySelectorAll('*')].filter(visible);
  const boxOf = (el) => el.getBoundingClientRect();
  const filled = (s) => {
    const bg = parseRgba(s.backgroundColor);
    return (bg && bg[3] > 0.02) || (s.backgroundImage && s.backgroundImage !== 'none');
  };
  const bordered = (s) => ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s[`border${k}Width`]) > 0 && s[`border${k}Style`] !== 'none' && (parseRgba(s[`border${k}Color`]) || [0, 0, 0, 0])[3] > 0.02);
  const shadowed = (s) => s.boxShadow && s.boxShadow !== 'none';

  // Controls: buttons, fields, and links that read as buttons (padded with a fill or a border).
  const FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]),select,textarea';
  function isControl(el, s) {
    if (el.matches('button,[role=button]') || el.matches(FIELD)) return true;
    if (el.tagName !== 'A') return false;
    return parseFloat(s.paddingLeft) >= 8 && (filled(s) || bordered(s));
  }
  // Containers: blocks with a surface of their own (fill differing from behind, border, or shadow) that hold content.
  // Cards are the containers narrower than the page; full-width bands are sections.
  function containerKind(el, s, r) {
    if (el.matches('button,a,input,select,textarea,label,span,img,picture,video,hr,li a')) return null;
    if (r.width < 96 || r.height < 48) return null;
    if (!el.children.length && !el.textContent.trim()) return null;
    const bg = parseRgba(s.backgroundColor);
    const behind = parentBackdrop(el);
    let ownFill = !!(s.backgroundImage && s.backgroundImage !== 'none');
    if (bg && bg[3] > 0.02) {
      if (!behind) ownFill = true;
      else {
        const mixed = over(bg, behind);
        ownFill = ownFill || [0, 1, 2].some((i) => Math.abs(mixed[i] - behind[i]) > 2);
      }
    }
    if (!ownFill && !bordered(s) && !shadowed(s)) return null;
    return r.width >= vw * 0.9 ? 'section' : 'card';
  }

  const radii = { cards: [], controls: [], pills: 0 };
  const density = { controlHeights: [], cardPadding: [], gaps: [], lineHeights: [] };
  const shadows = [];
  const borders = { cards: 0, borderedCards: [], dividers: [] };
  const colors = [];
  const text = [];
  const motion = { transitions: [], animated: 0, interactive: 0 };
  let cards = 0;

  function pushColor(rgba, weight, kind) {
    if (!rgba || rgba[3] < 0.1 || !(weight > 0)) return;
    colors.push({ rgb: rgba.slice(0, 3).map(Math.round), alpha: round(rgba[3]), weight: Math.round(weight), kind });
  }

  for (const el of all) {
    const s = getComputedStyle(el);
    const r = boxOf(el);
    const area = Math.min(r.width, vw) * Math.min(r.height, pageH);
    const minSide = Math.min(r.width, r.height);
    const radius = parseFloat(s.borderTopLeftRadius) || 0;

    if (el.matches('a,button,input,select,textarea,[role=button],[tabindex]')) motion.interactive++;

    // Radius and control height.
    const control = isControl(el, s);
    if (control) {
      density.controlHeights.push(round(r.height, 1));
      if (radius >= minSide / 2 - 0.5) radii.pills++;
      else radii.controls.push(round(radius, 1));
    }
    const kind = control ? null : containerKind(el, s, r);
    if (kind === 'card') {
      cards++;
      if (radius < minSide / 2 - 0.5) radii.cards.push(round(radius, 1));
      const pad = ['Top', 'Right', 'Bottom', 'Left'].map((k) => parseFloat(s[`padding${k}`]) || 0);
      if (pad.some((p) => p > 0)) density.cardPadding.push(round(pad.reduce((a, b) => a + b, 0) / 4, 1));
      borders.cards++;
      if (bordered(s)) {
        const width = Math.max(...['Top', 'Right', 'Bottom', 'Left'].map((k) => (s[`border${k}Style`] !== 'none' ? parseFloat(s[`border${k}Width`]) || 0 : 0)));
        const side = ['Top', 'Right', 'Bottom', 'Left'].find((k) => parseFloat(s[`border${k}Width`]) > 0 && s[`border${k}Style`] !== 'none');
        borders.borderedCards.push({ width, color: parseRgba(s[`border${side}Color`]), behind: parentBackdrop(el) });
      }
    }
    // Dividers: a single top or bottom rule between blocks, or an hr.
    if (!control && kind !== 'card' && r.width >= 96) {
      const top = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
      const bottom = parseFloat(s.borderBottomWidth) > 0 && s.borderBottomStyle !== 'none';
      const sides = parseFloat(s.borderLeftWidth) > 0 && s.borderLeftStyle !== 'none';
      if ((top || bottom || el.tagName === 'HR') && !sides) {
        const side = top ? 'Top' : 'Bottom';
        const color = parseRgba(s[`border${side}Color`]);
        if (color && color[3] > 0.02) borders.dividers.push({ width: parseFloat(s[`border${side}Width`]) || 1, color, behind: backdrop(el) });
      }
    }

    // Rhythm: gaps set on flex and grid containers.
    if (/flex|grid/.test(s.display)) {
      for (const g of [s.rowGap, s.columnGap]) {
        const v = parseFloat(g);
        if (v > 0) density.gaps.push(round(v, 1));
      }
    }

    // Shadows, outer layers only. A layer with no blur and no offset is a ring, which reads as a border.
    if (shadowed(s)) {
      const layers = s.boxShadow.split(/,(?![^(]*\))/).map((layer) => {
        const color = parseRgba(layer);
        const nums = layer.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).filter((t) => /px$|^0$/.test(t)).map(parseFloat);
        return { inset: /inset/.test(layer), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, color };
      }).filter((l) => !l.inset && (l.blur > 0 || l.x || l.y));
      if (layers.length) {
        const reach = Math.max(...layers.map((l) => Math.abs(l.y) + l.blur + Math.max(0, l.spread)));
        shadows.push({ role: kind === 'card' ? 'card' : control ? 'control' : 'other', reach: round(reach, 1) });
        for (const l of layers) pushColor(l.color, area * 0.25, 'shadow');
      }
    }

    // Colors: fills by area, borders by length, gradient stops by area.
    const bg = parseRgba(s.backgroundColor);
    if (bg) pushColor(bg, area * bg[3], 'background');
    if (s.backgroundImage && s.backgroundImage !== 'none') {
      const stops = [...s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parseRgba(m[0])).filter(Boolean);
      for (const stop of stops) pushColor(stop, area / stops.length, 'gradient');
    }
    if (bordered(s)) pushColor(parseRgba(s.borderTopColor) || parseRgba(s.borderBottomColor), (r.width + r.height) * 2 * (parseFloat(s.borderTopWidth) || 1), 'border');

    // Motion: declared transitions and running animations.
    const durations = s.transitionDuration.split(',').map((d) => parseFloat(d) * (/ms/.test(d) ? 1 : 1000));
    const props = s.transitionProperty.split(',').map((p) => p.trim());
    durations.forEach((d, i) => {
      if (d > 0) motion.transitions.push({ ms: Math.round(d), property: props[i % props.length] });
    });
    if (s.animationName && s.animationName !== 'none' && parseFloat(s.animationDuration) > 0) motion.animated++;

    // Text: elements with their own words.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (own.length >= 2) {
      const color = parseRgba(s.color);
      const size = parseFloat(s.fontSize);
      const lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / size;
      const heading = /^H[1-6]$/.test(el.tagName) || !!el.closest('h1,h2,h3,h4,h5,h6');
      if (color && color[3] > 0.1) pushColor(color, own.length * size * size * 0.5, 'text');
      text.push({
        tag: el.tagName.toLowerCase(),
        heading,
        chars: own.length,
        size: round(size, 1),
        weight: Number(s.fontWeight) || 400,
        lineHeight: lh && round(lh, 3),
        family: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        color: color && color.map((v, i) => (i < 3 ? Math.round(v) : round(v))),
        behind: color && color[3] > 0.1 && !(s.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || s.color === 'rgba(0, 0, 0, 0)') ? backdrop(el) : null,
      });
    }
  }
  if (document.getAnimations) motion.animated = Math.max(motion.animated, document.getAnimations().filter((a) => a.constructor.name === 'CSSAnimation').length);

  const pageBg = backdrop(document.body) || CANVAS.slice();
  return {
    page: { width: vw, height: pageH, background: pageBg.map(Math.round) },
    cards,
    radii,
    density,
    shadows,
    borders,
    colors,
    text,
    motion,
  };
};
