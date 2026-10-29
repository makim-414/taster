// Reads the content of a rendered page so it can be rebuilt without its generated look.
// No dependencies. Load it into a page and call window.tasterExtract().
// It keeps what the owner wrote and owns (words, links, images, brand), not how it was styled.
window.tasterExtract = function tasterExtract() {
  const MAX_TEXT = 600;
  const SKIP = 'script,style,noscript,template,svg,canvas,iframe,[hidden],[aria-hidden="true"]';
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  // innerText applies text-transform; a rebuild wants the words as written, so read textContent then.
  const textOf = (el) => (getComputedStyle(el).textTransform !== 'none' ? el.textContent : el.innerText);
  const cut = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}...` : s);

  function visible(el) {
    if (el.closest(SKIP)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
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

  function parseColor(c) {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  }
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
  function pageBackground() {
    let base = canvasDefault();
    for (const el of [document.documentElement, document.body]) {
      const p = el && parseColor(getComputedStyle(el).backgroundColor);
      if (!p || !(p.a > 0)) continue;
      base = { r: p.r * p.a + base.r * (1 - p.a), g: p.g * p.a + base.g * (1 - p.a), b: p.b * p.a + base.b * (1 - p.a), a: 1 };
    }
    return base;
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
      if (clean(n.textContent) && n.parentElement && !n.parentElement.closest(SKIP)) return family(n.parentElement);
    }
    return null;
  }

  function logoNode(header) {
    const scope = header || document.body;
    const img = scope.querySelector('a[href="/"] img, [class*="logo" i] img, img[alt*="logo" i], header img');
    if (img && visible(img)) return { kind: 'image', el: img };
    const text = scope.querySelector('[class*="logo" i], a[href="/"], strong, b');
    if (text && visible(text) && clean(text.innerText).length <= 40) return { kind: 'text', el: text };
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
      const text = words(textOf(el));
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
        label: words((f.labels && f.labels[0] && f.labels[0].innerText) || f.getAttribute('aria-label') || f.getAttribute('placeholder') || f.name),
      }));
      const submit = el.querySelector('button, input[type=submit]');
      current.forms.push({ fields, submit: submit ? words(submit.innerText || submit.value) : null });
      continue;
    }
    // A text block: an element whose own text nodes carry words and that is not inside an action.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
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
    footer: footer ? { text: words(footer.innerText).slice(0, MAX_TEXT), links: footerLinks } : null,
  };
};
