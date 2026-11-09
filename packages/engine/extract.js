// Reads the content of a rendered page so it can be rebuilt without its generated look.
// No dependencies. Load it into a page and call window.tasterExtract().
// It keeps what the owner wrote and owns (words, links, images, brand), not how it was styled.
window.tasterExtract = function tasterExtract() {
  const MAX_TEXT = 600;
  const SKIP = 'script,style,noscript,template,svg,canvas,iframe,[hidden],[aria-hidden="true"]';
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const cut = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}...` : s);

  // Computed colors come back as rgb(), or in their own syntax for oklch, lab, color() and the like. Those go through
  // a 1px canvas, which reads any CSS color as an sRGB pixel (the same path as data/rules/detect.js).
  const swatch = document.createElement('canvas');
  swatch.width = swatch.height = 1;
  const paint = swatch.getContext('2d', { willReadFrequently: true });
  const colors = new Map();
  function parseColor(c) {
    const s = String(c || '').trim();
    if (colors.has(s)) return colors.get(s);
    let out = null;
    const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) out = { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]) };
    else if (s === 'transparent') out = { r: 0, g: 0, b: 0, a: 0 };
    else if (s && paint) {
      try {
        paint.fillStyle = '#010203';
        paint.fillStyle = s;
        if (paint.fillStyle !== '#010203') {
          paint.clearRect(0, 0, 1, 1);
          paint.fillRect(0, 0, 1, 1);
          const d = paint.getImageData(0, 0, 1, 1).data;
          out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
        }
      } catch {
        out = null;
      }
    }
    colors.set(s, out);
    return out;
  }
  const over = (p, base) => ({ r: p.r * p.a + base.r * (1 - p.a), g: p.g * p.a + base.g * (1 - p.a), b: p.b * p.a + base.b * (1 - p.a), a: 1 });

  // ---- what a visitor can see ----
  // Only words drawn where a visitor can see them are read. Text a page hides (1px type, screen reader only labels,
  // faded or off-page boxes, clear or background colored ink) is not the owner's visible content, and it is where a
  // page would hide instructions meant for an agent.
  const REVEAL = /(^|[\s_-])(aos|reveal|fade-?(in|up|down)|animate-on-scroll|scroll-reveal|wow|animate-in|slide-up)([\s_-]|$)/i;
  const sideways = [document.documentElement, document.body].some((el) => el && /hidden|clip/.test(getComputedStyle(el).overflowX));
  // Wholly left of or above the page (the -9999px trick), or past its right edge when the page hides sideways overflow.
  // A box inside a scrolled panel (a sidebar scrolled to the current page) is placed back by that panel's scroll first.
  function onPage(r, holder) {
    const { x, y } = box(holder).scrolled;
    if (r.right + scrollX + x <= 0 || r.bottom + scrollY + y <= 0) return false;
    return !(sideways && r.left + scrollX + x >= document.documentElement.clientWidth);
  }
  // How much of a box a clip-path inset() leaves, in px across and down; Infinity for any other clip-path.
  function insetLeft(clipPath, r) {
    const m = clipPath.match(/^inset\(([^)]*)\)/);
    if (!m) return Infinity;
    const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
    const [t, rt, b, l] = [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]];
    const len = (x, size) => (x.endsWith('%') ? (parseFloat(x) / 100) * size : parseFloat(x) || 0);
    return Math.min(r.width - len(l, r.width) - len(rt, r.width), r.height - len(t, r.height) - len(b, r.height));
  }
  // A box that clips its content to nothing: under 2px with overflow or a clip (the screen reader only pattern), or a
  // clip that leaves no area.
  function clipsAway(s, r) {
    if (s.display === 'contents') return false;
    if (insetLeft(s.clipPath, r) < 2) return true;
    const positioned = /absolute|fixed/.test(s.position);
    const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.clipPath !== 'none' || (positioned && s.clip !== 'auto');
    if (clips && (r.width < 2 || r.height < 2)) return true;
    const m = positioned && s.clip.match(/^rect\(([^)]+)\)$/);
    if (!m) return false;
    const [top, right, bottom, left] = m[1].split(/[\s,]+/).map(parseFloat);
    return right - left < 2 || bottom - top < 2;
  }
  // A scroll reveal waits at opacity 0 below the first screen until the visitor scrolls to it: that is content, not a
  // hidden box. Same reading as MOT-01 in data/rules/detect.js.
  function waitsToReveal(el, s, r) {
    if (r.top <= innerHeight) return false;
    return el.hasAttribute('data-aos') || REVEAL.test(el.getAttribute('class') || '') || s.transform !== 'none' || s.animationName !== 'none';
  }
  const boxes = new Map();
  // Per element: rendered (checkVisibility, so display, content-visibility and its own visibility), the opacity it
  // is drawn at with its ancestors, whether a box around it clips it away, and how far the panels around its content
  // are scrolled.
  function box(el) {
    if (!el || el === document.documentElement) return { rendered: true, opacity: 1, clipped: false, scrolled: { x: 0, y: 0 } };
    let b = boxes.get(el);
    if (b) return b;
    const up = box(el.parentElement);
    const s = getComputedStyle(el);
    let rendered;
    if (s.display === 'contents') rendered = up.rendered && s.visibility === 'visible';
    else if (typeof el.checkVisibility === 'function') rendered = el.checkVisibility({ visibilityProperty: true });
    else rendered = s.visibility === 'visible' && el.getClientRects().length > 0;
    const r = el.getBoundingClientRect();
    const own = Number(s.opacity);
    const opacity = up.opacity * (own < 0.1 && waitsToReveal(el, s, r) ? 1 : own);
    const clipped = up.clipped || (el !== document.body && clipsAway(s, r));
    const panel = el !== document.body && el !== document.scrollingElement;
    const scrolled = { x: up.scrolled.x + (panel ? el.scrollLeft : 0), y: up.scrolled.y + (panel ? el.scrollTop : 0) };
    b = { rendered, opacity, clipped, scrolled };
    boxes.set(el, b);
    return b;
  }
  function shown(el) {
    const b = box(el);
    return b.rendered && b.opacity >= 0.1 && !b.clipped;
  }

  // The solid color behind an element: its own background over its parent's, down to the page. Null under an image, a
  // gradient, a filter or a blend, where styles alone cannot tell.
  const pageImage = [document.documentElement, document.body].some((el) => el && getComputedStyle(el).backgroundImage !== 'none');
  const grounds = new Map();
  function groundOf(el) {
    if (!el || el === document.documentElement || el === document.body) return pageImage ? null : pageBackground();
    if (grounds.has(el)) return grounds.get(el);
    const s = getComputedStyle(el);
    let g = null;
    if (s.backgroundImage === 'none' && s.filter === 'none' && s.mixBlendMode === 'normal') {
      const p = parseColor(s.backgroundColor);
      if (p && p.a >= 0.99) g = p;
      else {
        const up = groundOf(el.parentElement);
        g = up && p && p.a > 0 ? over(p, up) : up;
      }
    }
    grounds.set(el, g);
    return g;
  }
  function pseudoPaints(el, which) {
    const s = getComputedStyle(el, which);
    return s.content !== 'none' && s.content !== 'normal' && (s.backgroundImage !== 'none' || (parseColor(s.backgroundColor)?.a || 0) > 0);
  }
  // Anything painted (media, a background) that overlaps a text box without being one of its ancestors: the text may
  // sit on it. Collected once, the first time it is needed.
  let painted = null;
  function paintedUnder(r, el) {
    if (!painted) {
      painted = [];
      for (const e of document.body.querySelectorAll('*')) {
        const s = getComputedStyle(e);
        if (/^(img|video|canvas|svg|picture|iframe|object|embed)$/i.test(e.tagName) || s.backgroundImage !== 'none' || (parseColor(s.backgroundColor)?.a || 0) >= 0.1) {
          painted.push({ e, r: e.getBoundingClientRect() });
        }
      }
    }
    return painted.some((p) => !p.e.contains(el) && p.r.left < r.right && p.r.right > r.left && p.r.top < r.bottom && p.r.bottom > r.top);
  }
  // Ink a visitor can see: stroked or shadowed letters, or a fill that is neither clear nor the color it sits on.
  function inked(el, s, r) {
    if (el instanceof SVGElement || s.textShadow !== 'none') return true;
    if (parseFloat(s.webkitTextStrokeWidth) > 0 && (parseColor(s.webkitTextStrokeColor)?.a || 0) >= 0.1) return true;
    const ink = parseColor(s.webkitTextFillColor || s.color);
    if (!ink) return true;
    const clear = ink.a < 0.1;
    if (!clear) {
      const ground = groundOf(el);
      if (!ground) return true;
      const seen = over(ink, ground);
      if (Math.max(Math.abs(seen.r - ground.r), Math.abs(seen.g - ground.g), Math.abs(seen.b - ground.b)) > 8) return true;
    }
    // Clear ink still shows a background clipped to the letters (gradient text). Ink the color of the ground may sit on
    // a pseudo element layer or on something painted nearby.
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const as = a === el ? s : getComputedStyle(a);
      if (/\btext\b/.test(`${as.backgroundClip} ${as.webkitBackgroundClip}`)) return true;
      if (!clear && a !== document.body && (pseudoPaints(a, '::before') || pseudoPaints(a, '::after'))) return true;
    }
    return !clear && paintedUnder(r, el);
  }
  const drawnCache = new Map();
  // One text node: in a shown box, at least 4px type, a text box of at least 2px on the page, and visible ink.
  function drawn(n) {
    if (drawnCache.has(n)) return drawnCache.get(n);
    let ok = false;
    const el = n.parentElement;
    if (el && shown(el)) {
      const s = getComputedStyle(el);
      if (parseFloat(s.fontSize) >= 4) {
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        ok = r.width >= 2 && r.height >= 2 && onPage(r, el) && inked(el, s, r);
      }
    }
    drawnCache.set(n, ok);
    return ok;
  }
  // The nearest box that starts a new line around a text node, so words from two blocks are not run together.
  function blockOf(el, root) {
    for (let e = el; e && e !== root; e = e.parentElement) if (!/^(inline|contents|ruby)/.test(getComputedStyle(e).display)) return e;
    return root;
  }
  // The words a visitor sees inside an element, as written: a rebuild wants the owner's words, so text-transform is not
  // applied, and text nobody can see is left out.
  function textOf(el) {
    const parts = [];
    let block = null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === 1) {
        if (n.tagName === 'BR') parts.push(' ');
        continue;
      }
      if (!n.data.trim()) {
        parts.push(' ');
        continue;
      }
      if (!drawn(n)) continue;
      const b = blockOf(n.parentElement, el);
      if (block && b !== block) parts.push(' ');
      block = b;
      parts.push(n.data);
    }
    return parts.join('');
  }

  function visible(el) {
    if (el.closest(SKIP) || !shown(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && onPage(r, el.parentElement);
  }

  function abs(href) {
    try {
      return new URL(href, location.href).href;
    } catch {
      return href || '';
    }
  }

  // A link reads as a button when it is padded and has a background or a border.
  function isAction(el) {
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return true;
    if (el.tagName !== 'A') return false;
    const s = getComputedStyle(el);
    const padded = parseFloat(s.paddingLeft) >= 8 && parseFloat(s.paddingTop) >= 4;
    const filled = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
    const bordered = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    return padded && (filled || bordered || s.backgroundImage !== 'none');
  }

  function action(el) {
    const s = getComputedStyle(el);
    const transparent = s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent';
    return {
      text: clean(textOf(el) || el.getAttribute('aria-label')),
      href: el.tagName === 'A' ? abs(el.getAttribute('href')) : null,
      filled: !transparent || s.backgroundImage !== 'none',
    };
  }

  function image(el) {
    const r = el.getBoundingClientRect();
    return { src: abs(el.currentSrc || el.getAttribute('src')), alt: clean(el.getAttribute('alt')), width: Math.round(r.width), height: Math.round(r.height) };
  }

  // Emoji and pictographs are decoration, not content; the rebuild drops them.
  const PICTO = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
  const words = (s) => clean(String(s).replace(PICTO, ''));

  function hex({ r, g, b }) {
    return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  }
  function saturation({ r, g, b }) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    if (max === min) return 0;
    return (max - min) / (1 - Math.abs(2 * l - 1));
  }

  // The most used saturated solid color on links and buttons. Gradients are not a brand color.
  function brandColor(actions) {
    const tally = new Map();
    for (const el of actions) {
      const s = getComputedStyle(el);
      for (const c of [s.backgroundColor, s.color, s.borderTopColor]) {
        const p = parseColor(c);
        if (!p || p.a < 0.9 || saturation(p) < 0.35) continue;
        const key = hex(p);
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  // The color the page is drawn on: body, then html, over the browser's canvas. A fully transparent background is not
  // black; it shows the canvas, which is white unless the page asks for a dark one with color-scheme.
  function canvasDefault() {
    const meta = document.querySelector('meta[name="color-scheme"]')?.content || '';
    const scheme = `${getComputedStyle(document.documentElement).colorScheme || ''} ${meta}`.toLowerCase();
    const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = /\bdark\b/.test(scheme) && (!/\blight\b/.test(scheme) || prefersDark);
    return dark ? { r: 18, g: 18, b: 18, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  }
  let pageColor = null;
  function pageBackground() {
    if (pageColor) return pageColor;
    let base = canvasDefault();
    for (const el of [document.documentElement, document.body]) {
      const p = el && parseColor(getComputedStyle(el).backgroundColor);
      if (p && p.a > 0) base = over(p, base);
    }
    pageColor = base;
    return pageColor;
  }

  function family(el) {
    if (!el) return null;
    return getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  }

  // The face the first words inside an element are drawn in (a logo link often wraps an icon and a span).
  function textFamily(el) {
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (clean(n.textContent) && n.parentElement && !n.parentElement.closest(SKIP) && drawn(n)) return family(n.parentElement);
    }
    return null;
  }

  function logoNode(header) {
    const scope = header || document.body;
    const img = scope.querySelector('a[href="/"] img, [class*="logo" i] img, img[alt*="logo" i], header img');
    if (img && visible(img)) return { kind: 'image', el: img };
    // The 40 character limit is on the words returned, so text hidden inside the wordmark cannot carry more.
    const text = scope.querySelector('[class*="logo" i], a[href="/"], strong, b');
    const said = text && visible(text) ? words(textOf(text)) : '';
    if (said && said.length <= 40) return { kind: 'text', el: text };
    return null;
  }
  function logo(node) {
    if (!node) return null;
    return node.kind === 'image' ? { kind: 'image', ...image(node.el) } : { kind: 'text', text: words(textOf(node.el)) };
  }
  // The logo's own face: the wordmark text, or the words next to an image logo inside the same link.
  function logoFamily(node) {
    if (!node) return null;
    return textFamily(node.kind === 'text' ? node.el : node.el.closest('a'));
  }

  // The body face: the first paragraph in main, else the first one outside the header, the footer and the logo (a
  // tagline next to the logo is set like the logo, not like the text). A selector list matches in document order, so
  // 'main p, p' would take a header paragraph first.
  function bodyText(skip) {
    const outside = (p) => visible(p) && !p.closest('header, footer, [role="banner"], [role="contentinfo"]') && !(skip && skip.contains(p));
    return [...document.querySelectorAll('main p')].find(visible) || [...document.querySelectorAll('p')].find(outside) || document.body;
  }

  // The heading face: the most used across visible h1 to h3 (ties go to the one met first), not only the first h1.
  function headingFamily(skip) {
    const tally = new Map();
    for (const h of document.querySelectorAll('h1, h2, h3')) {
      if (!visible(h) || (skip && skip.contains(h))) continue;
      const f = family(h);
      if (f) tally.set(f, (tally.get(f) || 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  const header = document.querySelector('header, [role="banner"]');
  const footer = [...document.querySelectorAll('footer, [role="contentinfo"]')].pop() || null;
  const navs = [...document.querySelectorAll('nav, [role="navigation"]')].filter((n) => !footer || !footer.contains(n));

  const nav = [];
  const navSeen = new Set();
  for (const n of navs) {
    for (const el of n.querySelectorAll('a, button, span, li')) {
      if (el.children.length && el.tagName !== 'A' && el.tagName !== 'BUTTON') continue;
      if (!visible(el)) continue;
      // A link drawn as an image (its words only in a screen reader label) is named by its aria-label, as actions are.
      const text = words(textOf(el) || (el.tagName === 'A' && el.getAttribute('aria-label')) || '');
      if (!text || text.length > 40 || navSeen.has(text)) continue;
      navSeen.add(text);
      nav.push({ text, href: el.tagName === 'A' ? abs(el.getAttribute('href')) : null });
    }
  }
  const inChrome = (el) => navs.some((n) => n.contains(el)) || (footer && footer.contains(el));

  // Walk the body in reading order. A new section starts at each h1 or h2; h3 to h6 become items inside it.
  const sections = [];
  let current = null;
  const start = (heading) => {
    current = { heading, text: [], subheadings: [], lists: [], actions: [], links: [], images: [], quotes: [], forms: [] };
    sections.push(current);
  };
  start(null);

  const seenText = new Set();
  const takenActions = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const actionEls = [];
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (el === document.body || inChrome(el) || !visible(el)) continue;
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const text = words(textOf(el));
      if (!text) continue;
      const level = Number(tag[1]);
      if (level <= 2) start({ level, text });
      else current.subheadings.push({ level, text });
      seenText.add(text);
      continue;
    }
    if (isAction(el)) {
      if (takenActions.has(el)) continue;
      takenActions.add(el);
      actionEls.push(el);
      const a = action(el);
      a.text = words(a.text);
      if (a.text) current.actions.push(a);
      continue;
    }
    // A plain text link in the content (not drawn as a button) is still something the visitor can do.
    if (tag === 'A' && !el.closest('li')) {
      const text = words(textOf(el));
      if (text && text.length <= 80) current.links.push({ text, href: abs(el.getAttribute('href')) });
      continue;
    }
    if (tag === 'IMG') {
      const img = image(el);
      if (img.width >= 24 && img.height >= 24) current.images.push(img);
      continue;
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = [...el.children].filter((li) => li.tagName === 'LI' && visible(li)).map((li) => words(textOf(li))).filter(Boolean);
      if (items.length) {
        current.lists.push(items);
        items.forEach((t) => seenText.add(t));
      }
      continue;
    }
    if (tag === 'BLOCKQUOTE') {
      const text = words(textOf(el));
      if (text) current.quotes.push(cut(text));
      seenText.add(text);
      continue;
    }
    if (tag === 'FORM') {
      const fields = [...el.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea, select')].map((f) => ({
        type: f.tagName === 'INPUT' ? f.type : f.tagName.toLowerCase(),
        label: words((f.labels && f.labels[0] && textOf(f.labels[0])) || f.getAttribute('aria-label') || f.getAttribute('placeholder') || f.name),
      }));
      const submit = el.querySelector('button, input[type=submit]');
      current.forms.push({ fields, submit: submit ? words(textOf(submit) || submit.value) : null });
      continue;
    }
    // A text block: an element whose own text nodes carry words and that is not inside an action.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.data.trim() && drawn(n)).map((n) => n.data).join(' ');
    if (!clean(own) || el.closest('a,button,li,blockquote,form,h1,h2,h3,h4,h5,h6')) continue;
    const text = words(textOf(el));
    if (!text || seenText.has(text)) continue;
    seenText.add(text);
    current.text.push(cut(text));
  }

  const kept = sections.filter((s) => s.heading || s.text.length || s.actions.length || s.links.length || s.images.length || s.lists.length || s.forms.length);
  const logoAt = logoNode(header);
  const footerLinks = footer
    ? [...footer.querySelectorAll('a')].filter(visible).map((a) => ({ text: words(textOf(a)), href: abs(a.getAttribute('href')) })).filter((l) => l.text)
    : [];

  return {
    url: location.href,
    title: clean(document.title),
    description: clean(document.querySelector('meta[name="description"]')?.content),
    lang: document.documentElement.lang || null,
    brand: {
      name: logo(logoAt)?.text || null,
      logo: logo(logoAt),
      color: brandColor(actionEls),
      fonts: {
        heading: headingFamily(logoAt && logoAt.el),
        body: family(bodyText(logoAt && logoAt.el)),
        logo: logoFamily(logoAt),
      },
      dark: (() => {
        const p = pageBackground();
        return (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255 < 0.35;
      })(),
    },
    nav,
    sections: kept,
    footer: footer ? { text: words(textOf(footer)).slice(0, MAX_TEXT), links: footerLinks } : null,
  };
};
