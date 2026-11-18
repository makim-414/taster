// What /demo measures inside its frames, with the frame's own DOM: the detector's findings as spots, the after page's
// boxes as layers, and its radius and spacing tokens. Nothing here knows the example; any before and after page the
// demo can reach runs through the same code. layersOf also prepares the after page so the demo can hide each layer and
// type each line without moving anything: a line of text is cut into a typed part and a hidden rest that keeps its place.

import { VIEW, type Box, type Layer, type Slider, type Spot, orderSpots } from './timeline.ts';

export type Finding = { ruleId: string; selector: string; rect: Box };
export type Report = { findings: Finding[]; counts: Record<string, number> };

/** Findings grouped by element, one spot per element with every rule it hit, cut to the page. */
export function spotsOf(report: Report, pageH: number): Spot[] {
  const by = new Map<string, Spot>();
  for (const f of report.findings) {
    const x = Math.max(0, f.rect.x);
    const y = Math.max(0, f.rect.y);
    const w = Math.min(VIEW.w, f.rect.x + f.rect.w) - x;
    const h = Math.min(pageH, f.rect.y + f.rect.h) - y;
    if (w <= 0 || h <= 0) continue;
    const spot = by.get(f.selector) ?? { box: { x, y, w, h }, rules: [] };
    if (!spot.rules.includes(f.ruleId)) spot.rules.push(f.ruleId);
    by.set(f.selector, spot);
  }
  return orderSpots([...by.values()], pageH);
}

/** The page's full height in the frame. */
export const pageHeight = (doc: Document): number => Math.max(VIEW.h, doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);

/** The after page, ready to be rebuilt: its layers, and the calls that show a layer or type a line. */
export type Rebuild = {
  layers: Layer[];
  /** Hide every layer (true) or show the page as it is (false). */
  run(on: boolean): void;
  show(i: number, on: boolean, fade: boolean): void;
  type(i: number, chars: number): void;
};

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'BR', 'WBR', 'HEAD', 'TITLE', 'TASTER-L', 'TASTER-R']);
const REPLACED = new Set(['IMG', 'SVG', 'VIDEO', 'CANVAS', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'IFRAME', 'PICTURE', 'OBJECT', 'EMBED', 'HR']);
const STYLE = `
html[data-tl-run] body, html[data-tl-run] [data-tl]:not([data-tl-on]) { visibility: hidden !important; }
html[data-tl-run] [data-tl][data-tl-on] { visibility: visible !important; }
taster-r { visibility: hidden !important; }
`;
// Past this many characters a text is one layer, measured as a whole, so a long page stays quick to prepare.
const CHAR_BUDGET = 20000;

type Item =
  | { kind: 'block'; el: Element; box: Box; area: number }
  | { kind: 'text'; host: Element; node: Text; start: number; end: number; box: Box; area: number; holder?: Element; typed?: Text; rest?: Element };

const docBox = (r: DOMRect, win: Window): Box => ({ x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height });
const union = (a: Box | null, r: DOMRect, win: Window): Box => {
  const b = docBox(r, win);
  if (!a) return b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** The lines a text node wraps to, as character ranges with their boxes. */
function linesOf(node: Text, win: Window, whole: boolean): { start: number; end: number; box: Box }[] {
  const doc = node.ownerDocument;
  const range = doc.createRange();
  const text = node.data;
  if (whole) {
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? [{ start: 0, end: text.length, box: docBox(r, win) }] : [];
  }
  const out: { start: number; end: number; box: Box }[] = [];
  let cur: { start: number; end: number; box: Box | null; top: number; h: number } | null = null;
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const r = range.getClientRects()[0];
    if (!r || (r.width === 0 && /\s/.test(text[i]))) {
      if (cur) cur.end = i + 1;
      continue;
    }
    if (cur && r.top < cur.top + cur.h * 0.5) {
      cur.end = i + 1;
      cur.box = union(cur.box, r, win);
      continue;
    }
    if (cur && cur.box) out.push({ start: cur.start, end: i, box: cur.box });
    cur = { start: cur ? i : 0, end: i + 1, box: union(null, r, win), top: r.top, h: r.height };
  }
  if (cur && cur.box) out.push({ start: cur.start, end: text.length, box: cur.box });
  return out;
}

/**
 * The after page's layers in document order: every visible element that makes a box, and every line of visible text.
 * Over `cap`, the smallest boxes go first (they show with the layer that holds them), then the shortest lines.
 */
export function layersOf(doc: Document, cap = 190): Rebuild {
  const win = doc.defaultView as Window;
  win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const style = doc.createElement('style');
  style.textContent = STYLE;
  doc.head.appendChild(style);

  const items: Item[] = [];
  let chars = 0;
  const walk = (el: Element) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) {
        const node = child as Text;
        if (!node.data.trim()) continue;
        const host = node.parentElement;
        if (!host) continue;
        const display = win.getComputedStyle(host).display;
        // In a flex or grid box a text is one anonymous item; cutting it in lines would make several.
        const whole = /flex|grid/.test(display) || chars > CHAR_BUDGET;
        chars += node.data.length;
        for (const line of linesOf(node, win, whole)) items.push({ kind: 'text', host, node, start: line.start, end: line.end, box: line.box, area: line.box.w * line.box.h });
        continue;
      }
      if (child.nodeType !== 1) continue;
      const e = child as Element;
      if (SKIP.has(e.tagName.toUpperCase())) continue;
      const cs = win.getComputedStyle(e);
      if (cs.display === 'none' || cs.opacity === '0') continue;
      const tag = e.tagName.toUpperCase();
      const r = e.getBoundingClientRect();
      const boxy = cs.display !== 'inline' && cs.display !== 'contents';
      if ((boxy || REPLACED.has(tag)) && cs.visibility !== 'hidden' && r.width >= 2 && r.height >= 2) {
        const box = docBox(r, win);
        items.push({ kind: 'block', el: e, box, area: box.w * box.h });
      }
      // An svg, a picture or a form control is one layer with everything inside it.
      if (!REPLACED.has(tag)) walk(e);
    }
  };
  if (doc.body) walk(doc.body);

  // Over the cap: drop the smallest boxes, then the shortest lines. Document order stays.
  let keep = items;
  if (keep.length > cap) {
    const rank = (k: Item['kind']) => keep.map((it, i) => ({ it, i })).filter((x) => x.it.kind === k).sort((a, b) => a.it.area - b.it.area);
    const drop = new Set<number>();
    for (const kind of ['block', 'text'] as const) for (const x of rank(kind)) if (keep.length - drop.size > cap) drop.add(x.i);
    keep = keep.filter((_, i) => !drop.has(i));
  }
  const kept = new Set(keep);

  // Cut each text node into its lines: a line kept as a layer types in; one left out shows whole with its holder.
  const byNode = new Map<Text, Extract<Item, { kind: 'text' }>[]>();
  for (const it of items) if (it.kind === 'text') byNode.set(it.node, [...(byNode.get(it.node) ?? []), it]);
  for (const [node, lines] of byNode) {
    const text = node.data;
    const parent = node.parentNode;
    if (!parent) continue;
    const frag = doc.createDocumentFragment();
    let at = 0;
    lines.forEach((line, k) => {
      const end = k === lines.length - 1 ? text.length : line.end;
      if (k === 0 && line.start > 0) frag.append(text.slice(0, line.start));
      const start = k === 0 ? line.start : at;
      const holder = doc.createElement('taster-l');
      const typed = doc.createTextNode(kept.has(line) ? '' : text.slice(start, end));
      const rest = doc.createElement('taster-r');
      rest.textContent = kept.has(line) ? text.slice(start, end) : '';
      holder.append(typed, rest);
      frag.append(holder);
      Object.assign(line, { start, end, holder, typed, rest });
      at = end;
    });
    parent.replaceChild(frag, node);
  }

  // The layer that holds each layer: the nearest kept box among its ancestors.
  const index = new Map<Element, number>();
  keep.forEach((it, i) => {
    if (it.kind === 'block') index.set(it.el, i);
  });
  const parentOf = (start: Element | null): number => {
    for (let e = start; e; e = e.parentElement) {
      const i = index.get(e);
      if (i !== undefined) return i;
    }
    return -1;
  };
  const layers: Layer[] = keep.map((it) => ({
    box: { x: Math.round(it.box.x), y: Math.round(it.box.y), w: Math.round(it.box.w), h: Math.round(it.box.h) },
    chars: it.kind === 'text' ? Math.max(1, it.end - it.start) : 0,
    parent: it.kind === 'block' ? parentOf(it.el.parentElement) : parentOf(it.host),
  }));
  keep.forEach((it) => {
    if (it.kind === 'block') it.el.setAttribute('data-tl', '');
  });

  const shown: boolean[] = keep.map(() => false);
  const typedCount: number[] = keep.map(() => -1);
  return {
    layers,
    run(on) {
      doc.documentElement.toggleAttribute('data-tl-run', on);
    },
    show(i, on, fade) {
      const it = keep[i];
      if (!it || it.kind !== 'block' || shown[i] === on) return;
      shown[i] = on;
      it.el.toggleAttribute('data-tl-on', on);
      if (on && fade && typeof it.el.animate === 'function') it.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    },
    type(i, n) {
      const it = keep[i];
      if (!it || it.kind !== 'text' || !it.typed || !it.rest || typedCount[i] === n) return;
      typedCount[i] = n;
      const text = it.node.data.slice(it.start, it.end);
      it.typed.data = text.slice(0, n);
      it.rest.textContent = text.slice(n);
    },
  };
}

/** Custom properties the page declares, from every stylesheet it can read. */
function declared(doc: Document): Set<string> {
  const names = new Set<string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const style = (rule as CSSStyleRule).style;
      if (style) for (let i = 0; i < style.length; i++) if (style[i].startsWith('--')) names.add(style[i]);
      const inner = (rule as CSSGroupingRule).cssRules;
      if (inner) visit(inner);
      const imported = (rule as CSSImportRule).styleSheet;
      if (imported) {
        try {
          visit(imported.cssRules);
        } catch {
          // a sheet from another origin
        }
      }
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // a sheet from another origin
    }
  }
  return names;
}

export type TokenBase = Record<Slider, [string, number, string][]>;
const KIND: Record<Slider, RegExp> = {
  radius: /^--(r|radius|rounded)(-|$)|radius/i,
  density: /^--(sp|space|spacing|gap|gutter)(-|$)|spacing/i,
};

/** The after page's own radius and spacing tokens that hold a plain length, as number and unit, to scale from. */
export function tokenBase(doc: Document): TokenBase {
  const cs = doc.defaultView!.getComputedStyle(doc.documentElement);
  const out: TokenBase = { radius: [], density: [] };
  for (const name of declared(doc)) {
    const m = /^\s*([\d.]+)(px|rem|em)\s*$/.exec(cs.getPropertyValue(name));
    if (!m) continue;
    for (const which of ['radius', 'density'] as const) if (KIND[which].test(name)) out[which].push([name, Number(m[1]), m[2]]);
  }
  return out;
}
