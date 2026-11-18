// The page before and after an edit, compared element by element, for the live viewer's per-edit view
// (packages/engine/watch.mjs). domSnapshot runs in the page (page.evaluate) and lists every rendered element with a
// stable path, its rect on the page and a short signature of what it looks like (its own text, the computed styles
// that show, an image source or a vector path). diffSnapshots compares two lists by path and answers the regions that
// changed: an element added, removed, or whose signature differs, kept only at the topmost changed element of a
// subtree and merged with its near neighbours.
//
// This finds what changed on the page after the dev server reloaded, not which elements an edit touched: an edit to a
// shared stylesheet shows as every element it restyled, and two edits that land between two captures share one diff
// (assignRegions splits it between them by the file names, which is a guess and is labelled as one).

export const SNAPSHOT_MAX = 4000;
export const MAX_REGIONS = 10;

/**
 * In the page: { width, height, truncated, nodes: [{ k, p, t, id, c, r: [x, y, w, h], s, x }] } in document order.
 * k is the path (tag#id, or tag:n among siblings of the same tag), p the parent's index, c up to three classes, s the
 * signature and x up to 40 characters of the element's own text for a label. Self-contained: Playwright sends its
 * source to the page.
 */
export function domSnapshot(max = 4000) {
  // Transform, opacity and transitions are left out: a capture in the middle of an entrance animation is not an edit.
  const STYLE = ['color', 'background-color', 'background-image', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-top-color', 'border-top-left-radius', 'border-bottom-right-radius', 'box-shadow', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'text-transform', 'text-decoration-line', 'text-align', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'display', 'gap', 'grid-template-columns', 'flex-direction', 'filter', 'backdrop-filter', 'visibility', 'list-style-type', 'object-fit'];
  const SKIP = new Set(['script', 'style', 'template', 'noscript', 'head', 'meta', 'link', 'title', 'base']);
  const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };
  const sx = window.scrollX;
  const sy = window.scrollY;
  const nodes = [];
  const walk = (el, parent, prefix) => {
    if (nodes.length >= max) return;
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();
    const before = getComputedStyle(el, '::before').content;
    const after = getComputedStyle(el, '::after').content;
    const extra = [el.getAttribute('src') || '', el.getAttribute('d') || '', el.getAttribute('points') || '', el.getAttribute('fill') || '', el.getAttribute('stroke') || '', tag === 'input' || tag === 'textarea' ? el.getAttribute('placeholder') || '' : ''].join('|');
    const sig = hash([own, before === 'none' || before === 'normal' ? '' : before, after === 'none' || after === 'normal' ? '' : after, extra, ...STYLE.map((p) => cs.getPropertyValue(p))].join('\u0001'));
    const r = el.getBoundingClientRect();
    const id = el.id && el.id.length <= 60 ? el.id : '';
    let n = 0;
    for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === el.tagName) n++;
    const k = `${prefix}>${tag}${id ? `#${id}` : `:${n}`}`;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter((c) => c && c.length <= 40).slice(0, 3) : [];
    const index = nodes.length;
    nodes.push({ k, p: parent, t: tag, id, c: cls, r: [Math.round(r.left + sx), Math.round(r.top + sy), Math.round(r.width), Math.round(r.height)], s: sig, x: own.slice(0, 40) });
    for (const child of el.children) walk(child, index, k);
  };
  if (document.body) walk(document.body, -1, 'html');
  const root = document.documentElement;
  return { width: root.scrollWidth, height: root.scrollHeight, truncated: nodes.length >= max, nodes };
}

const area = (r) => r.w * r.h;
const union = (a, b) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
const near = (a, b, gap) => a.x - gap <= b.x + b.w && b.x - gap <= a.x + a.w && a.y - gap <= b.y + b.h && b.y - gap <= a.y + a.h;

/** A short label for an element: tag#id or tag.class, and the start of its own text. */
export function labelOf(node) {
  const name = `${node.t}${node.id ? `#${node.id}` : node.c?.[0] ? `.${node.c[0]}` : ''}`;
  const text = node.x ? ` "${Array.from(node.x).slice(0, 24).join('')}${Array.from(node.x).length > 24 ? '...' : ''}"` : '';
  return `${name}${text}`.slice(0, 60);
}

// The ids and classes of an element and its ancestors: the words assignRegions matches file names against.
function hintOf(nodes, i) {
  const words = new Set();
  for (let n = nodes[i], hops = 0; n && hops < 12; n = nodes[n.p], hops++) {
    if (n.id) words.add(n.id);
    for (const c of n.c || []) words.add(c);
    if (n.p < 0) break;
  }
  return [...words];
}

/**
 * The regions that changed between two snapshots: [{ rect: { x, y, w, h }, kind: added | removed | changed, label,
 * hint, count }], top to bottom, at most `max`. A rect is on the page of the snapshot it was found in (removed: the
 * one before). Regions start below `height` are dropped and the rest are cut to it (the stage picture's height).
 */
export function diffSnapshots(prev, next, { max = MAX_REGIONS, gap = 16, height = Infinity } = {}) {
  const a = prev?.nodes || [];
  const b = next?.nodes || [];
  const inA = new Map(a.map((n, i) => [n.k, i]));
  const inB = new Map(b.map((n, i) => [n.k, i]));
  const markB = new Map();
  const markA = new Map();
  b.forEach((n, i) => {
    const j = inA.get(n.k);
    if (j === undefined) markB.set(i, 'added');
    else if (a[j].s !== n.s) markB.set(i, 'changed');
  });
  a.forEach((n, i) => {
    if (!inB.has(n.k)) markA.set(i, 'removed');
  });
  // Only the topmost changed element of a subtree: its children changed with it (inherited color, a new list).
  const top = (nodes, marks) => {
    const out = [];
    for (const [i, kind] of marks) {
      let covered = false;
      for (let p = nodes[i].p, hops = 0; p >= 0 && hops < 200; p = nodes[p].p, hops++) {
        if (marks.has(p)) {
          covered = true;
          break;
        }
      }
      const [x, y, w, h] = nodes[i].r;
      if (!covered && w > 0 && h > 0 && y < height) out.push({ rect: { x, y, w, h: Math.min(h, height - y) }, kind, label: labelOf(nodes[i]), hint: hintOf(nodes, i), size: w * h });
    }
    return out;
  };
  let items = [...top(b, markB), ...top(a, markA)].sort((p, q) => p.rect.y - q.rect.y || p.rect.x - q.rect.x);
  // Neighbours merge into one region; the label is the largest element's.
  const merge = (p, q) => {
    const big = p.size >= q.size ? p : q;
    return { rect: union(p.rect, q.rect), kind: p.kind === q.kind ? p.kind : 'changed', label: big.label, hint: [...new Set([...p.hint, ...q.hint])], size: Math.max(p.size, q.size), count: (p.count || 1) + (q.count || 1) };
  };
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < items.length && !merged; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (near(items[i].rect, items[j].rect, gap)) {
          items[i] = merge(items[i], items[j]);
          items.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  // Still too many: join the two that add the least area, until `max` are left.
  while (items.length > max) {
    let best = null;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const cost = area(union(items[i].rect, items[j].rect)) - area(items[i].rect) - area(items[j].rect);
        if (!best || cost < best.cost) best = { i, j, cost };
      }
    }
    items[best.i] = merge(items[best.i], items[best.j]);
    items.splice(best.j, 1);
  }
  return items.sort((p, q) => p.rect.y - q.rect.y || p.rect.x - q.rect.x).map(({ rect, kind, label, hint, count }) => ({ rect, kind, label, hint, count: count || 1 }));
}

// Words of a file name or class list that can name a part of a page; the rest (index, src, components...) cannot.
const STOP = new Set(['src', 'app', 'apps', 'lib', 'web', 'site', 'page', 'pages', 'index', 'main', 'components', 'component', 'partials', 'partial', 'sections', 'section', 'styles', 'style', 'html', 'htm', 'css', 'scss', 'tsx', 'jsx', 'ts', 'js', 'mjs', 'vue', 'svelte', 'astro', 'public', 'layout', 'layouts', 'block', 'blocks', 'wrap', 'inner', 'container']);
export const words = (s) =>
  String(s || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter((w) => w.length >= 3 && !STOP.has(w));

/**
 * Which edit each region goes with, when several edits landed between two captures: the edit whose file name shares
 * the most words with the region's ids and classes (hero.html and section#hero), else the latest edit. Answers the
 * regions with `edit` (an index into edits) and `guessed` (true when more than one edit could have made it).
 */
export function assignRegions(regions, edits) {
  const last = Math.max(0, edits.length - 1);
  const fileWords = edits.map((e) => new Set(words(e.file)));
  return regions.map((r) => {
    if (edits.length < 2) return { ...r, edit: 0, guessed: false };
    const hint = new Set(r.hint.flatMap(words));
    let best = last;
    let score = 0;
    fileWords.forEach((fw, i) => {
      let s = 0;
      for (const w of fw) if (hint.has(w)) s++;
      if (s > score || (s === score && s > 0 && i > best)) {
        best = i;
        score = s;
      }
    });
    return { ...r, edit: best, guessed: true };
  });
}
