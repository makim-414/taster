/*!
 * detect.js: dependency-free slop detector for a rendered page.
 *
 * It reads computed styles and the DOM of the page it runs in and reports which
 * slop rules (ids from rules.json) match which element. It never changes the page,
 * except for the optional outline highlight (see below).
 *
 * Usage with Playwright:
 *   await page.addScriptTag({ path: 'rules/detect.js' });
 *   const report = await page.evaluate(() => window.tasterDetect({ highlight: true }));
 *
 * Usage in DevTools: paste this file into the console, then run
 *   tasterDetect({ highlight: true })
 *
 * Options:
 *   highlight   boolean   outline every finding. The color comes from the CSS variable
 *                         --taster-outline (fallback #e5484d). Set it on :root to change it.
 *   clear       boolean   remove the outlines added by an earlier call and return.
 *   maxPerRule  number    cap on reported findings per rule (default 40, totals stay in `counts`).
 *   rules       string[]  only run these rule ids.
 *
 * Result:
 *   { url, viewport:{width,height,dpr}, findings:[{ruleId, selector, text, rect, evidence}],
 *     counts:{ruleId:n}, notes:[], errors:[] }
 * rect is in document coordinates (x, y, w, h in CSS pixels).
 *
 * Rules that need meaning (AC-18, AC-19, CMP-08) are manual and not run. CPY-01 and KO-07
 * report phrase candidates only. Thresholds mirror rules.json detect.css.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var STATE_KEY = '__tasterHighlights';
  // Long dashes are built from char codes so this file stays free of the characters themselves.
  var EM = String.fromCharCode(8212);
  var EN = String.fromCharCode(8211);
  var DIGIT_RANGE_RE = new RegExp('\\d\\s?' + EN + '\\s?\\d', 'g');

  // ---------------------------------------------------------------- small helpers
  function px(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function rn(x, d) {
    var m = Math.pow(10, d === undefined ? 2 : d);
    return Math.round(x * m) / m;
  }
  function hueDiff(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  function inRange(v, lo, hi) {
    return v >= lo && v <= hi;
  }

  // ---------------------------------------------------------------- color
  var cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  var c2d = cvs.getContext('2d', { willReadFrequently: true });
  var colorCache = {};

  function parseColor(s) {
    if (!s) return null;
    if (Object.prototype.hasOwnProperty.call(colorCache, s)) return colorCache[s];
    var out = null;
    var m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,\/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      var a = m[4] === undefined ? 1 : m[4].indexOf('%') > -1 ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      out = { r: +m[1], g: +m[2], b: +m[3], a: a };
    } else if (s === 'transparent') {
      out = { r: 0, g: 0, b: 0, a: 0 };
    } else {
      try {
        c2d.fillStyle = '#010203';
        c2d.fillStyle = s;
        if (c2d.fillStyle !== '#010203') {
          c2d.clearRect(0, 0, 1, 1);
          c2d.fillRect(0, 0, 1, 1);
          var d = c2d.getImageData(0, 0, 1, 1).data;
          out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
        }
      } catch (e) {
        out = null;
      }
    }
    colorCache[s] = out;
    return out;
  }
  function hsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var l = (mx + mn) / 2, h = 0, s = 0;
    if (d > 0) {
      s = d / (1 - Math.abs(2 * l - 1) || 1);
      if (s > 1) s = 1;
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, l: l, chroma: d };
  }
  function luminance(c) {
    function ch(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  // A clearly colored (not gray) color.
  function strong(c, minS) {
    if (!c || c.a < 0.2) return false;
    var h = hsl(c);
    return h.s >= (minS || 0.3) && h.chroma >= 0.15 && h.l > 0.12 && h.l < 0.92;
  }
  // A pale or translucent tint of a color, used as a surface.
  function isTint(c) {
    if (!c || c.a < 0.04) return false;
    var h = hsl(c);
    if (c.a <= 0.3) return h.s >= 0.3 && h.chroma >= 0.2;
    return c.a >= 0.5 && h.l >= 0.85 && h.s >= 0.25 && h.chroma >= 0.035;
  }
  var COLOR_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-fA-F]{3,8}\b/;
  function colorsIn(str) {
    var re = new RegExp(COLOR_RE.source, 'g');
    var out = [], m;
    while ((m = re.exec(str || ''))) {
      var c = parseColor(m[0]);
      if (c) out.push(c);
    }
    return out;
  }
  function splitTop(v) {
    var parts = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var ch = v[i];
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(cur);
        cur = '';
      } else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }
  function parseShadows(v) {
    if (!v || v === 'none') return [];
    return splitTop(v).map(function (p) {
      var cm = p.match(COLOR_RE);
      var color = cm ? parseColor(cm[0]) : null;
      var rest = cm ? p.replace(cm[0], ' ') : p;
      var nums = (rest.match(/-?[\d.]+(?=px)/g) || []).map(Number);
      return { color: color, x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, inset: /\binset\b/.test(rest) };
    });
  }

  // ---------------------------------------------------------------- fonts
  var GENERIC = {
    serif: 1, 'sans-serif': 1, monospace: 1, cursive: 1, fantasy: 1, 'system-ui': 1, 'ui-serif': 1,
    'ui-sans-serif': 1, 'ui-monospace': 1, 'ui-rounded': 1, '-apple-system': 1, blinkmacsystemfont: 1,
    emoji: 1, math: 1, fangsong: 1
  };
  var MONO_RE = /mono|courier|consolas|menlo|monaco|andale|lucida console|fira code|^hack$|iosevka|inconsolata|cascadia|jetbrains|source code|code pro|commit mono|berkeley/i;
  var KOREAN_FONT_RE = /pretendard|noto (sans|serif) (cjk )?(kr|korean)|source han (sans|serif) (k|kr)|nanum|malgun|apple sd gothic|spoqa|ibm plex sans kr|gmarket|suit|wanted sans|gowun|black han sans|do hyeon|kopub|applegothic|applemyungjo|batang|dotum|gulim|gungsuh|noto sans cjk|\uB9D1\uC740 \uACE0\uB515|\uB098\uB214|\uACE0\uB515|\uBA85\uC870|\uB3CB\uC6C0|\uAD74\uB9BC|\uBCF8\uACE0\uB515/i;
  var DEFAULT_FONTS = {
    serif: 1, 'sans-serif': 1, times: 1, 'times new roman': 1, arial: 1, helvetica: 1, 'helvetica neue': 1,
    'system-ui': 1, '-apple-system': 1, blinkmacsystemfont: 1, 'ui-sans-serif': 1, 'ui-serif': 1,
    'segoe ui': 1, 'sf pro text': 1, 'sf pro display': 1
  };
  var FAVORITE_FONTS = {
    'space grotesk': 1, 'instrument serif': 1, geist: 1, 'geist mono': 1, 'dm sans': 1,
    'plus jakarta sans': 1, outfit: 1, manrope: 1, sora: 1, 'bricolage grotesque': 1
  };

  function stackNames(ff) {
    var out = [], cur = '', q = null;
    for (var i = 0; i < (ff || '').length; i++) {
      var ch = ff[i];
      if (q) {
        if (ch === q) q = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ',') {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function loadedFaces() {
    var list = [];
    try {
      document.fonts.forEach(function (f) {
        list.push({
          family: String(f.family).replace(/^["']|["']$/g, '').toLowerCase(),
          status: f.status,
          style: f.style
        });
      });
    } catch (e) {}
    return list;
  }
  var FACES = loadedFaces();
  function hasLoadedFace(lower) {
    return FACES.some(function (f) { return f.family === lower && f.status === 'loaded'; });
  }
  var measureCtx = document.createElement('canvas').getContext('2d');
  function measure(font, text) {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }
  var installedCache = {};
  function installed(name) {
    if (Object.prototype.hasOwnProperty.call(installedCache, name)) return installedCache[name];
    var t = 'mmmmmmmmmmlliWWWW';
    var res = ['monospace', 'serif', 'sans-serif'].some(function (b) {
      return measure('72px "' + name + '", ' + b, t) !== measure('72px ' + b, t);
    });
    installedCache[name] = res;
    return res;
  }
  // A font without Hangul glyphs renders Hangul with the same system fallback as the generic sans-serif and
  // monospace families do, so an unchanged width means no Hangul glyphs. (A Hangul font whose metrics equal the system
  // fallback is missed here, which is why known Korean family names are matched first.)
  var hangulCache = {};
  function hangulMeasured(name) {
    if (Object.prototype.hasOwnProperty.call(hangulCache, name)) return hangulCache[name];
    var t = '\uD55C\uAE00\uD55C\uAE00\uD55C\uAE00';
    var w = measure('72px "' + name + '"', t);
    var res = w !== measure('72px sans-serif', t) && w !== measure('72px monospace', t);
    hangulCache[name] = res;
    return res;
  }
  function fontAvailable(name) {
    var l = name.toLowerCase();
    if (GENERIC[l]) return true;
    return hasLoadedFace(l) || installed(name);
  }
  var firstCache = {};
  function firstFont(ff) {
    if (Object.prototype.hasOwnProperty.call(firstCache, ff)) return firstCache[ff];
    var names = stackNames(ff), res = 'serif', declared = null;
    for (var i = 0; i < names.length; i++) {
      if (fontAvailable(names[i])) {
        res = names[i].toLowerCase();
        break;
      }
      // First family the author named on purpose that this browser cannot supply (web font blocked, not loaded, not installed).
      if (!declared) declared = names[i].toLowerCase();
    }
    // Only the generic fallback is left: judge the font the author asked for, not the fallback it degraded to.
    // A page that names Fraunces or Inter made a font choice (AC-15 is about not choosing); Inter is still Inter (TYP-01).
    if (declared && GENERIC[res]) res = declared;
    firstCache[ff] = res;
    return res;
  }
  function isMonoFont(name) {
    return name === 'monospace' || name === 'ui-monospace' || MONO_RE.test(name);
  }

  // ---------------------------------------------------------------- text
  var HANGUL_G = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/g;
  var HANGUL_1 = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
  function hangulStats(t) {
    var h = (t.match(HANGUL_G) || []).length;
    var l = (t.match(/\p{L}/gu) || []).length;
    return { h: h, l: l, ratio: l ? h / l : 0 };
  }
  function norm(t) {
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  // ---------------------------------------------------------------- selectors
  function esc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&');
  }
  function sel(el) {
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    var parts = [], cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      if (cur.id && document.querySelectorAll('#' + esc(cur.id)).length === 1) {
        parts.unshift('#' + esc(cur.id));
        return parts.join(' > ');
      }
      var seg = cur.tagName.toLowerCase();
      var cls = (cur.getAttribute('class') || '').split(/\s+/).filter(function (c) {
        return c && /^[A-Za-z_][\w-]*$/.test(c);
      });
      if (cls.length) seg += '.' + esc(cls[0]);
      if (cur.parentElement) {
        var sibs = Array.prototype.filter.call(cur.parentElement.children, function (s) { return s.tagName === cur.tagName; });
        if (sibs.length > 1) seg += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      }
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  }

  // ---------------------------------------------------------------- highlight
  function clearHighlights() {
    var st = window[STATE_KEY];
    if (st) {
      st.forEach(function (e) {
        e.el.style.outline = e.outline;
        e.el.style.outlineOffset = e.offset;
      });
    }
    window[STATE_KEY] = [];
  }
  function highlight(els) {
    var seen = new Set();
    els.forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      window[STATE_KEY].push({ el: el, outline: el.style.outline, offset: el.style.outlineOffset });
      el.style.outline = '2px solid var(--taster-outline, #e5484d)';
      el.style.outlineOffset = '-2px';
    });
  }

  // ---------------------------------------------------------------- main
  function run(options) {
    options = options || {};
    clearHighlights();
    var vw = window.innerWidth, vh = window.innerHeight;
    var viewport = { width: vw, height: vh, dpr: window.devicePixelRatio || 1 };
    if (options.clear) {
      return { url: location.href, viewport: viewport, page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, cleared: true, findings: [], counts: {}, notes: [], errors: [] };
    }
    FACES = loadedFaces();

    var cap = options.maxPerRule || 40;
    var findings = [], notes = [], errors = [], counts = {}, hits = {}, seen = {}, toHL = [];

    function add(ruleId, el, evidence) {
      if (!el) return;
      seen[ruleId] = seen[ruleId] || new Set();
      if (seen[ruleId].has(el)) return;
      seen[ruleId].add(el);
      counts[ruleId] = (counts[ruleId] || 0) + 1;
      (hits[ruleId] = hits[ruleId] || []).push(el);
      if (counts[ruleId] > cap) return;
      var r = el.getBoundingClientRect();
      findings.push({
        ruleId: ruleId,
        selector: sel(el),
        text: norm(el.innerText !== undefined ? el.innerText : el.textContent).slice(0, 60),
        rect: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
        evidence: evidence || {}
      });
      toHL.push(el);
    }

    // ------------------------------------------------ collect elements and text
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, HEAD: 1, META: 1, LINK: 1, TITLE: 1, BASE: 1 };
    var I = [], M = new Map();
    function makeItem(el) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return null;
      if (parseFloat(cs.opacity) === 0) return null;
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      // The visually-hidden pattern (1px box, clipped) is for screen readers: nothing on screen to judge.
      if (r.width <= 2 && r.height <= 2) return null;
      return { el: el, cs: cs, tag: el.tagName.toLowerCase(), r: { l: r.left, t: r.top, w: r.width, h: r.height, b: r.bottom, rt: r.right } };
    }
    [document.documentElement, document.body].forEach(function (el) {
      var it = makeItem(el);
      if (it) {
        I.push(it);
        M.set(el, it);
      }
    });
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (SKIP[el.tagName]) continue;
      if (el.namespaceURI === 'http://www.w3.org/2000/svg' && (el.tagName.toLowerCase() !== 'svg' || el.ownerSVGElement)) continue;
      var it = makeItem(el);
      if (it) {
        I.push(it);
        M.set(el, it);
      }
    }
    var OWN = new Map(), TN = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var v = n.nodeValue;
      if (!v || !v.trim()) continue;
      var p = n.parentElement;
      if (!p || !M.has(p)) continue;
      TN.push({ node: n, el: p, text: v });
      OWN.set(p, ((OWN.get(p) || '') + ' ' + v).replace(/\s+/g, ' ').trim());
    }
    function ownText(el) {
      return OWN.get(el) || '';
    }

    // ------------------------------------------------ shared geometry helpers
    function cornerPx(it, k) {
      var tok = String(it.cs[k]).split(' ')[0];
      return tok.indexOf('%') > -1 ? (parseFloat(tok) * Math.min(it.r.w, it.r.h)) / 100 : px(tok);
    }
    var CORNERS = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
    function radiusPx(it) {
      return Math.min.apply(null, CORNERS.map(function (k) { return cornerPx(it, k); }));
    }
    function maxRadiusPx(it) {
      return Math.max.apply(null, CORNERS.map(function (k) { return cornerPx(it, k); }));
    }
    function isPill(it) {
      return radiusPx(it) >= Math.min(it.r.w, it.r.h) / 2 - 0.5 && radiusPx(it) > 0;
    }
    function sideW(cs, side) {
      var w = px(cs['border' + side + 'Width']);
      var st = cs['border' + side + 'Style'];
      if (st === 'none' || st === 'hidden') return 0;
      var c = parseColor(cs['border' + side + 'Color']);
      if (c && c.a === 0) return 0;
      return w;
    }
    function minBorder(cs) {
      return Math.min(sideW(cs, 'Top'), sideW(cs, 'Right'), sideW(cs, 'Bottom'), sideW(cs, 'Left'));
    }
    function bgOf(it) {
      return parseColor(it.cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
    }
    function letterEm(cs) {
      if (cs.letterSpacing === 'normal') return 0;
      var fs = px(cs.fontSize) || 16;
      return px(cs.letterSpacing) / fs;
    }
    function words(el) {
      var t = norm(el.textContent);
      if (!t) return 0;
      return t.length <= 32 ? t.split(' ').length : 99;
    }
    function btnLike(el) {
      var t = el.tagName;
      if (t === 'BUTTON') return true;
      if (t === 'INPUT' && /^(submit|button)$/i.test(el.type)) return true;
      if (el.getAttribute('role') === 'button') return true;
      return t === 'A' && /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(el.getAttribute('class') || '');
    }
    function inNav(el) {
      return !!el.closest('nav,[role="navigation"]');
    }
    function effBg() {
      var els = [document.body, document.documentElement];
      for (var k = 0; k < els.length; k++) {
        var c = parseColor(getComputedStyle(els[k]).backgroundColor);
        if (c && c.a >= 0.9) return c;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }
    function resolved(it) {
      return firstFont(it.cs.fontFamily);
    }
    function q(selector) {
      return Array.prototype.filter.call(document.querySelectorAll(selector), function (e) { return M.has(e); }).map(function (e) { return M.get(e); });
    }
    function tintPill(it) {
      if (it.r.h > 64 || it.r.h < 12 || it.r.w > 360) return null;
      if (!isPill(it)) return null;
      var w = words(it.el);
      if (w < 1 || w > 3) return null;
      // A badge is a label. A control drawn as a capsule (btn/button/cta class, role=button) is a button.
      if (it.tag === 'button' || btnLike(it.el)) return null;
      var bg = bgOf(it);
      if (!isTint(bg)) return null;
      var tc = parseColor(it.cs.color);
      if (!tc) return null;
      var hb = hsl(bg), ht = hsl(tc);
      if (ht.chroma < 0.08 || ht.s < 0.2) return null;
      if (hueDiff(hb.h, ht.h) > 40) return null;
      return { hue: hb.h, bg: it.cs.backgroundColor, color: it.cs.color };
    }

    // ------------------------------------------------ rules
    var R = {};

    R['AC-01'] = function () {
      I.forEach(function (it) {
        var t = ownText(it.el);
        if (t.length < 2 || inNav(it.el)) return;
        var latin = (t.match(/[A-Za-z]/g) || []).length;
        if (latin < 2) return;
        var up = it.cs.textTransform === 'uppercase' || (latin >= 3 && !/[a-z]/.test(t) && t === t.toUpperCase());
        if (!up) return;
        var ls = letterEm(it.cs);
        if (ls >= 0.05) add('AC-01', it.el, { textTransform: it.cs.textTransform, letterSpacingEm: rn(ls) });
      });
    };

    R['AC-02'] = function () {
      var byEl = new Map();
      TN.forEach(function (t) {
        if (t.el.closest('code,pre')) return;
        var s = t.text.replace(DIGIT_RANGE_RE, '');
        var em = s.split(EM).length - 1;
        var en = s.split(EN).length - 1;
        if (!em && !en) return;
        var rec = byEl.get(t.el) || { em: 0, en: 0 };
        rec.em += em;
        rec.en += en;
        byEl.set(t.el, rec);
      });
      byEl.forEach(function (rec, el) {
        var weighted = /^(H[1-6]|LABEL|BUTTON|A|SUMMARY|TH|DT|FIGCAPTION|CAPTION)$/.test(el.tagName) || ownText(el).length <= 40;
        add('AC-02', el, { emDash: rec.em, enDash: rec.en, weight: weighted ? 'high' : 'low' });
      });
    };

    R['AC-03'] = function () {
      var skipSel = 'textarea,input,[contenteditable],[data-user-content],.comment,.comments';
      TN.forEach(function (t) {
        if (t.el.closest(skipSel)) return;
        var s = t.text.replace(/[\u00A9\u00AE\u2122]/g, '');
        var m = s.match(/\p{Extended_Pictographic}|[\u2700-\u27BF]/u);
        if (m) add('AC-03', t.el, { codepoint: 'U+' + m[0].codePointAt(0).toString(16).toUpperCase() });
      });
    };

    R['AC-04'] = function () {
      I.forEach(function (it) {
        var p = tintPill(it);
        if (p) add('AC-04', it.el, { background: p.bg, color: p.color, hue: Math.round(p.hue), radiusPx: rn(radiusPx(it), 1), height: Math.round(it.r.h) });
      });
    };

    R['AC-05'] = function () {
      I.forEach(function (it) {
        if (/^(button|input|select|textarea)$/.test(it.tag) || btnLike(it.el)) return;
        if (it.r.h > 64 || it.r.h < 12 || it.r.w > 360 || !isPill(it)) return;
        var w = words(it.el);
        if (w < 1 || w > 3) return;
        var bg = bgOf(it);
        if (bg.a > 0.02 || it.cs.backgroundImage !== 'none') return;
        if (minBorder(it.cs) < 1) return;
        var bc = parseColor(it.cs.borderTopColor);
        if (!strong(bc, 0.3)) return;
        add('AC-05', it.el, { borderColor: it.cs.borderTopColor, borderPx: minBorder(it.cs) });
      });
    };

    R['AC-06'] = function () {
      I.forEach(function (it) {
        if (/^(html|body|section|main|header|footer|nav|article|li|td|th|tr|table)$/.test(it.tag)) return;
        var par = it.el.parentElement;
        if (!par || it.r.w < 200 || it.r.h < 24 || it.r.h > 160) return;
        var pw = par.getBoundingClientRect().width;
        if (it.r.w < pw * 0.8) return;
        if (!isTint(bgOf(it))) return;
        if (norm(it.el.textContent).length < 5) return;
        if (!it.el.querySelector('svg,img,i,[class*="icon"]')) return;
        add('AC-06', it.el, { background: it.cs.backgroundColor, widthRatio: rn(it.r.w / pw) });
      });
    };

    R['AC-07'] = function () {
      I.forEach(function (it) {
        var p = tintPill(it);
        if (!p || !inRange(p.hue, 20, 50)) return;
        var glow = parseShadows(it.cs.boxShadow).filter(function (s) {
          return !s.inset && s.blur >= 8 && s.color && s.color.a > 0.05 && hsl(s.color).chroma > 0.2;
        })[0];
        if (glow) add('AC-07', it.el, { hue: Math.round(p.hue), shadowBlurPx: glow.blur });
      });
    };

    function textFollows(el) {
      var nx = el.nextSibling;
      while (nx) {
        if (nx.nodeType === 3) {
          if (nx.nodeValue.trim()) return true;
        } else if (nx.nodeType === 1) {
          return !!norm(nx.textContent);
        }
        nx = nx.nextSibling;
      }
      return false;
    }
    R['AC-08'] = function () {
      I.forEach(function (it) {
        if (!inRange(it.r.w, 4, 12) || !inRange(it.r.h, 4, 12) || Math.abs(it.r.w - it.r.h) > 1) return;
        if (!isPill(it) || norm(it.el.textContent) || it.el.children.length) return;
        var bg = bgOf(it);
        if (bg.a < 0.5 || !strong(bg, 0.3)) return;
        if (!textFollows(it.el)) return;
        var animated = it.cs.animationName !== 'none' && px(it.cs.animationDuration) > 0;
        var glow = parseShadows(it.cs.boxShadow).some(function (s) { return !s.inset && s.blur > 0 && s.color && strong(s.color, 0.3); });
        add('AC-08', it.el, { background: it.cs.backgroundColor, animated: animated, glow: glow, weight: animated || glow ? 'high' : 'normal' });
      });
    };

    R['AC-09'] = function () {
      I.forEach(function (it) {
        var t = ownText(it.el);
        if (!t || t.length > 80 || !/[\p{L}\p{N}]/u.test(t)) return;
        if (it.el.closest('code,pre,kbd,samp,var,tt')) return;
        var f = resolved(it);
        if (isMonoFont(f)) add('AC-09', it.el, { font: f, fontSizePx: px(it.cs.fontSize), chars: t.length });
      });
    };

    R['AC-10'] = function () {
      I.forEach(function (it) {
        if (it.tag === 'html' || it.tag === 'body') return;
        var cs = it.cs;
        var w = { Left: sideW(cs, 'Left'), Top: sideW(cs, 'Top'), Right: sideW(cs, 'Right'), Bottom: sideW(cs, 'Bottom') };
        ['Left', 'Top'].forEach(function (side) {
          var v = w[side];
          if (v < 2) return;
          var others = Object.keys(w).filter(function (k) { return k !== side; }).map(function (k) { return w[k]; });
          if (v <= Math.max.apply(null, others)) return;
          var c = parseColor(cs['border' + side + 'Color']);
          if (!strong(c, 0.3)) return;
          if (!(bgOf(it).a > 0.02 || maxRadiusPx(it) > 0)) return;
          add('AC-10', it.el, { side: side.toLowerCase(), widthPx: v, color: cs['border' + side + 'Color'], weight: it.tag === 'blockquote' ? 'low' : 'normal' });
        });
      });
    };

    R['AC-11'] = function () {
      I.forEach(function (it) {
        if (!inRange(it.r.w, 16, 48) || !inRange(it.r.h, 16, 48) || Math.abs(it.r.w - it.r.h) > 2) return;
        if (/^(button|a|input|img|select|textarea)$/.test(it.tag) || it.el.closest('button,a')) return;
        if (!isPill(it)) return;
        var bg = bgOf(it);
        if (bg.a < 0.5 || hsl(bg).l >= 0.97) return;
        var kids = it.el.children, t = norm(it.el.textContent);
        var svgOnly = kids.length === 1 && kids[0].tagName.toLowerCase() === 'svg' && !t;
        var symbol = kids.length === 0 && t.length === 1 && !/[\p{L}\p{N}]/u.test(t);
        if (svgOnly || symbol) add('AC-11', it.el, { background: it.cs.backgroundColor, content: svgOnly ? 'svg' : 'symbol' });
      });
    };

    R['AC-12'] = function () {
      if (/contact|inquiry|support|enquiry/i.test(location.pathname + ' ' + document.title)) return;
      Array.prototype.forEach.call(document.querySelectorAll('form'), function (f) {
        if (!M.has(f)) return;
        var inputs = Array.prototype.filter.call(
          f.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=search]),select'),
          function (e) { return M.has(e); }
        );
        var ta = Array.prototype.filter.call(f.querySelectorAll('textarea'), function (e) { return M.has(e); });
        if (inputs.length >= 3 && ta.length >= 1) add('AC-12', f, { inputs: inputs.length, textareas: ta.length });
      });
    };

    R['AC-13'] = function () {
      Array.prototype.forEach.call(document.querySelectorAll('svg'), function (svg) {
        var it = M.get(svg);
        if (!it || it.r.w < 150 || it.r.h < 80 || svg.ownerSVGElement) return;
        var buckets = {};
        Array.prototype.forEach.call(svg.querySelectorAll('rect,path,circle,ellipse,polygon,polyline,line'), function (s) {
          var cs = getComputedStyle(s);
          [cs.fill, cs.stroke].forEach(function (col) {
            var c = parseColor(col);
            if (!c || c.a < 0.3) return;
            var h = hsl(c);
            if (h.s >= 0.4 && h.chroma >= 0.2 && h.l > 0.15 && h.l < 0.85) buckets[Math.floor(h.h / 30)] = true;
          });
        });
        var nb = Object.keys(buckets).length;
        if (nb >= 4) add('AC-13', svg, { hueBuckets: nb });
      });
    };

    R['AC-14'] = function () {
      var list = [];
      I.forEach(function (it) {
        if (it.tag === 'html' || it.tag === 'body' || it.r.w < 120 || it.r.h < 60 || !it.el.children.length) return;
        var bg = bgOf(it);
        if (bg.a < 0.95) return;
        var h = hsl(bg);
        if (h.l < 0.95 || h.chroma > 0.03) return;
        var mb = minBorder(it.cs);
        if (mb < 1 || mb > 1.5) return;
        var bc = parseColor(it.cs.borderTopColor);
        if (!bc || hsl(bc).chroma > 0.06) return;
        if (parseShadows(it.cs.boxShadow).length) return;
        var r = radiusPx(it);
        if (r < 6 || r > 12) return;
        list.push(it);
      });
      if (list.length >= 4) list.forEach(function (it) { add('AC-14', it.el, { count: list.length, radiusPx: rn(radiusPx(it), 1) }); });
    };

    R['AC-15'] = function () {
      var tgt = q('h1,h2,h3');
      var b = M.get(document.body);
      if (b && norm(document.body.innerText).length > 30) tgt.push(b);
      tgt.forEach(function (it) {
        var f = resolved(it);
        if (DEFAULT_FONTS[f]) add('AC-15', it.el, { resolvedFont: f, stack: it.cs.fontFamily.slice(0, 80) });
      });
    };

    // A link drawn as a button without a btn/button/cta class: a block-level link with horizontal padding, a short label
    // and a fill or a border. Used by AC-16 only, so the other button rules keep their strict class based test.
    function linkButton(it) {
      if (it.tag !== 'a' || !/^(inline-block|inline-flex|flex|block|grid|inline-grid)$/.test(it.cs.display)) return false;
      if (px(it.cs.paddingLeft) < 12 && px(it.cs.paddingRight) < 12) return false;
      var t = norm(it.el.textContent);
      if (!t || t.length > 40 || t.split(' ').length > 5) return false;
      return minBorder(it.cs) >= 1 || bgOf(it).a > 0.04 || it.cs.backgroundImage !== 'none';
    }
    R['AC-16'] = function () {
      var cands = [];
      I.forEach(function (it) {
        if (it.r.t >= vh || it.r.b <= 0 || !(btnLike(it.el) || linkButton(it)) || inNav(it.el)) return;
        if (!norm(it.el.textContent || it.el.value)) return;
        cands.push(it);
      });
      var first = cands[0];
      if (!first) return;
      var bg = bgOf(first);
      if (bg.a <= 0.02 && first.cs.backgroundImage === 'none' && minBorder(first.cs) >= 1) {
        var filledExists = cands.some(function (c) { return bgOf(c).a > 0.5; });
        add('AC-16', first.el, { border: first.cs.borderTopColor, filledButtonInFirstScreen: filledExists });
      }
    };

    R['AC-17'] = function () {
      var imagery = false;
      I.forEach(function (it) {
        if (it.r.t >= vh || it.r.b <= 0) return;
        if (/^(img|video|canvas|picture|iframe|object)$/.test(it.tag) && it.r.w >= 120 && it.r.h >= 80) imagery = true;
        if (it.tag === 'svg' && it.r.w >= 200 && it.r.h >= 150) imagery = true;
        if (/url\(/.test(it.cs.backgroundImage) && it.r.w >= 150 && it.r.h >= 100) imagery = true;
      });
      if (imagery) return;
      var cands = [];
      I.forEach(function (it) {
        if (it.tag !== 'div' || it.r.t >= vh || it.r.b <= 0 || it.r.w < 240 || it.r.h < 140) return;
        var boxes = 0, maxDepth = 0;
        Array.prototype.forEach.call(it.el.querySelectorAll('div,span,i,b'), function (d) {
          var di = M.get(d);
          if (!di || norm(d.textContent)) return;
          var bg = bgOf(di);
          if (bg.a > 0.02 || minBorder(di.cs) >= 1) {
            boxes++;
            var depth = 0, c = d;
            while (c && c !== it.el) { depth++; c = c.parentElement; }
            if (depth > maxDepth) maxDepth = depth;
          }
        });
        if (boxes >= 6 && maxDepth >= 3) cands.push({ it: it, boxes: boxes, depth: maxDepth });
      });
      cands.filter(function (c) {
        return !cands.some(function (o) { return o !== c && c.it.el.contains(o.it.el); });
      }).forEach(function (c) { add('AC-17', c.it.el, { decorativeBoxes: c.boxes, maxDepth: c.depth }); });
    };

    // -------- colors
    R['COL-01'] = function () {
      I.forEach(function (it) {
        var bi = it.cs.backgroundImage;
        if (!bi || bi.indexOf('gradient') < 0) return;
        var stops = colorsIn(bi).filter(function (c) {
          var h = hsl(c);
          return c.a > 0.1 && inRange(h.h, 230, 290) && h.s >= 0.4 && h.chroma >= 0.2;
        });
        if (stops.length >= 2) {
          var area = (it.r.w * it.r.h) / (vw * vh);
          add('COL-01', it.el, { purpleStops: stops.length, viewportAreaRatio: rn(area) });
        }
      });
    };

    R['COL-02'] = function () {
      var bg = effBg();
      var h = hsl(bg);
      if (h.l < 0.9 || !inRange(h.h, 30, 60) || !inRange(h.chroma, 0.025, 0.15)) return;
      var accent = null;
      I.forEach(function (it) {
        if (accent) return;
        var c = null;
        if (btnLike(it.el)) c = bgOf(it);
        else if (it.tag === 'a') c = parseColor(it.cs.color);
        if (!c || c.a < 0.9) return;
        var ah = hsl(c);
        if (inRange(ah.h, 10, 30) && ah.s >= 0.5 && ah.l > 0.25 && ah.l < 0.65) accent = it;
      });
      if (accent) add('COL-02', document.body, { background: 'rgb(' + [bg.r, bg.g, bg.b].join(', ') + ')', accent: sel(accent.el) });
    };

    R['COL-03'] = function () {
      var bg = effBg();
      if (luminance(bg) > 0.02) return;
      I.forEach(function (it) {
        var glow = parseShadows(it.cs.boxShadow).concat(parseShadows(it.cs.textShadow)).filter(function (s) {
          return !s.inset && s.blur >= 16 && s.color && s.color.a > 0.1 && hsl(s.color).s >= 0.7 && hsl(s.color).chroma >= 0.4;
        })[0];
        if (glow) add('COL-03', it.el, { backgroundLuminance: rn(luminance(bg), 4), glowBlurPx: glow.blur });
      });
    };

    R['COL-04'] = function () {
      I.forEach(function (it) {
        var clip = it.cs.backgroundClip;
        if (clip !== 'text' && it.cs.webkitBackgroundClip !== 'text') return;
        if (it.cs.backgroundImage.indexOf('gradient') < 0 || !ownText(it.el)) return;
        var fill = parseColor(it.cs.webkitTextFillColor);
        var col = parseColor(it.cs.color);
        if ((fill && fill.a === 0) || (col && col.a === 0)) add('COL-04', it.el, { backgroundClip: 'text' });
      });
    };

    R['COL-05'] = function () {
      var structure = ['COL-01', 'COL-03', 'COL-07'].filter(function (id) { return counts[id]; });
      if (!structure.length) return;
      var acc = null;
      I.forEach(function (it) {
        if (acc || !btnLike(it.el)) return;
        var bg = bgOf(it);
        if (bg.a < 0.9) return;
        var h = hsl(bg);
        if (inRange(h.h, 140, 170) && h.s >= 0.4 && h.chroma >= 0.2) acc = it;
      });
      if (acc) add('COL-05', acc.el, { hue: Math.round(hsl(bgOf(acc)).h), withStructures: structure });
    };

    R['COL-06'] = function () {
      var list = [], bk = {};
      I.forEach(function (it) {
        if (it.tag === 'html' || it.tag === 'body') return;
        if (it.r.w < 16 || it.r.h < 16 || it.r.w > 700 || it.r.h > 500) return;
        var bg = bgOf(it);
        var ok = isTint(bg);
        if (!ok) return;
        var b = Math.floor(hsl(bg).h / 30);
        bk[b] = true;
        list.push({ it: it, b: b });
      });
      var nb = Object.keys(bk).length;
      if (nb >= 4) list.forEach(function (o) { add('COL-06', o.it.el, { hueBucketsOnPage: nb }); });
    };

    R['COL-07'] = function () {
      I.forEach(function (it) {
        var s = parseShadows(it.cs.boxShadow).filter(function (x) {
          return !x.inset && x.blur >= 24 && x.color && x.color.a >= 0.15 && hsl(x.color).s >= 0.4 && hsl(x.color).chroma >= 0.2;
        })[0];
        if (s) add('COL-07', it.el, { blurPx: s.blur, color: 'rgba(' + [s.color.r, s.color.g, s.color.b, rn(s.color.a)].join(',') + ')' });
      });
    };

    // -------- typography
    function heads() { return q('h1,h2,h3'); }
    R['TYP-01'] = function () {
      var tg = heads();
      var b = M.get(document.body);
      if (b) tg.push(b);
      if (!tg.length) return;
      var names = tg.map(resolved);
      var ok = names.every(function (nm) { return /^inter( variable| var| tight)?$|^intervariable$/.test(nm); });
      if (ok) add('TYP-01', b ? b.el : tg[0].el, { fonts: names.filter(function (v, k, a) { return a.indexOf(v) === k; }) });
    };
    R['TYP-02'] = function () {
      var tg = heads();
      var b = M.get(document.body);
      if (b) tg.push(b);
      tg.forEach(function (it) {
        var f = resolved(it);
        if (FAVORITE_FONTS[f]) add('TYP-02', it.el, { font: f });
      });
    };
    R['TYP-03'] = function () {
      q('h1,h2').forEach(function (h) {
        var total = norm(h.el.textContent).length;
        if (!total) return;
        var hf = resolved(h);
        Array.prototype.forEach.call(h.el.querySelectorAll('*'), function (c) {
          var ci = M.get(c);
          if (!ci) return;
          var len = norm(c.textContent).length;
          if (!len || len / total >= 0.4) return;
          var diff = [];
          if (/italic|oblique/.test(ci.cs.fontStyle) && !/italic|oblique/.test(h.cs.fontStyle)) diff.push('font-style');
          if (resolved(ci) !== hf) diff.push('font-family');
          if (ci.cs.color !== h.cs.color) diff.push('color');
          if (diff.length) add('TYP-03', c, { differs: diff, share: rn(len / total) });
        });
      });
    };
    R['TYP-04'] = function () {
      q('h1').forEach(function (h) {
        var fs = px(h.cs.fontSize);
        var wn = norm(h.el.textContent).split(' ').filter(Boolean).length;
        if (fs >= 64 && wn >= 8) add('TYP-04', h.el, { fontSizePx: fs, words: wn, viewportWidth: vw });
      });
    };
    R['TYP-05'] = function () {
      I.forEach(function (it) {
        if (!ownText(it.el)) return;
        var fs = px(it.cs.fontSize);
        if (fs < 32) return;
        var ls = letterEm(it.cs);
        if (ls <= -0.04) add('TYP-05', it.el, { fontSizePx: fs, letterSpacingEm: rn(ls) });
      });
    };

    // -------- layout
    function iconIn(el) {
      var list = el.querySelectorAll('svg,img,i,[class*="icon"]');
      for (var k = 0; k < list.length; k++) {
        var it = M.get(list[k]);
        if (it && it.r.w <= 72 && it.r.h <= 72) return list[k];
      }
      return null;
    }
    function cardStruct(el) {
      var ic = iconIn(el);
      var hd = el.querySelector('h1,h2,h3,h4,h5,h6,[class*="title"],strong,b');
      var pp = el.querySelector('p,[class*="desc"]');
      if (!ic || !hd || !pp) return false;
      var F = Node.DOCUMENT_POSITION_FOLLOWING;
      return !!(ic.compareDocumentPosition(hd) & F) && !!(hd.compareDocumentPosition(pp) & F);
    }
    R['LAY-01'] = function () {
      q('h1').forEach(function (h) {
        if (h.r.t >= vh || h.cs.textAlign !== 'center') return;
        var cont = h.el.parentElement;
        for (var up = 0; up < 3 && cont && cont !== document.body; up++, cont = cont.parentElement) {
          var F = Node.DOCUMENT_POSITION_FOLLOWING, P = Node.DOCUMENT_POSITION_PRECEDING;
          var btns = Array.prototype.filter.call(cont.querySelectorAll('button,a,[role="button"],input[type=submit]'), function (b) {
            return btnLike(b) && M.has(b) && !!(h.el.compareDocumentPosition(b) & F);
          });
          var pill = null;
          I.forEach(function (it) {
            if (pill || !cont.contains(it.el) || it.el === h.el || h.el.contains(it.el)) return;
            if (!(h.el.compareDocumentPosition(it.el) & P)) return;
            if (it.r.h <= 56 && it.r.h >= 14 && isPill(it) && norm(it.el.textContent) && norm(it.el.textContent).length <= 60) pill = it;
          });
          if (btns.length >= 2 && pill) {
            add('LAY-01', h.el, { buttonsAfter: btns.length, pill: sel(pill.el) });
            return;
          }
        }
      });
    };

    R['LAY-02'] = function () {
      I.forEach(function (par) {
        if (par.el.children.length < 3) return;
        var kids = Array.prototype.filter.call(par.el.children, function (c) { return M.has(c) && cardStruct(c); }).map(function (c) { return M.get(c); });
        if (kids.length < 3) return;
        var w0 = kids[0].r.w, h0 = kids[0].r.h;
        var same = kids.filter(function (k) { return Math.abs(k.r.w - w0) <= 3 && Math.abs(k.r.h - h0) <= 12; });
        if (same.length >= 3) add('LAY-02', par.el, { cards: same.length, cardSize: Math.round(w0) + 'x' + Math.round(h0) });
      });
    };

    R['LAY-03'] = function () {
      var list = I.filter(function (it) {
        return it.el.children.length === 0 && /^0[1-9]\.?$/.test(norm(it.el.textContent)) && px(it.cs.fontSize) <= 24;
      });
      if (list.length >= 2) list.forEach(function (it) { add('LAY-03', it.el, { label: norm(it.el.textContent), count: list.length }); });
    };

    function topSections() {
      var root = document.querySelector('main') || document.body;
      var secs = [];
      for (var d = 0; d < 3; d++) {
        secs = Array.prototype.filter.call(root.children, function (c) {
          var it = M.get(c);
          return it && it.r.h >= 60 && !/^(HEADER|NAV)$/.test(c.tagName);
        });
        if (secs.length === 1 && secs[0].children.length >= 2) root = secs[0];
        else break;
      }
      return { root: root, secs: secs };
    }
    var TS = null;
    function sectionsInfo() {
      if (!TS) TS = topSections();
      return TS;
    }
    var CURRENCY = /[$\u20AC\u00A3\u20A9\u00A5]\s?\d|\d[\d,.]*\s?(\uC6D0|USD|EUR)|\/\s?(mo|month|\uC6D4)\b/i;
    function currencyCount(el) {
      var c = 0;
      Array.prototype.forEach.call(el.querySelectorAll('*'), function (d) {
        var own = Array.prototype.filter.call(d.childNodes, function (x) { return x.nodeType === 3; }).map(function (x) { return x.nodeValue; }).join('');
        if (CURRENCY.test(own)) c++;
      });
      return c;
    }
    R['LAY-04'] = function () {
      var info = sectionsInfo();
      if (info.secs.length < 4) return;
      var lay2 = hits['LAY-02'] || [];
      var seq = info.secs.map(function (s, idx) {
        if (s.tagName === 'FOOTER' || s.getAttribute('role') === 'contentinfo') return 'footer';
        if (idx === 0 && s.querySelector('h1')) return 'hero';
        if (lay2.some(function (e) { return s.contains(e); })) return 'features';
        if (currencyCount(s) >= 3) return 'pricing';
        if (s.querySelector('blockquote') || /testimonial|review|loved by|what .* say/i.test(norm(s.textContent).slice(0, 120))) return 'testimonial';
        var logos = Array.prototype.filter.call(s.querySelectorAll('img,svg'), function (e) { var i2 = M.get(e); return i2 && i2.r.h <= 64; }).length;
        if (logos >= 4 && norm(s.textContent).length < 160) return 'logos';
        return null;
      });
      var canon = ['hero', 'logos', 'features', 'pricing', 'testimonial', 'footer'];
      var seqT = seq.filter(Boolean);
      var L = [];
      for (var a = 0; a <= seqT.length; a++) { L.push(new Array(canon.length + 1).fill(0)); }
      for (var x = 1; x <= seqT.length; x++) {
        for (var y = 1; y <= canon.length; y++) {
          L[x][y] = seqT[x - 1] === canon[y - 1] ? L[x - 1][y - 1] + 1 : Math.max(L[x - 1][y], L[x][y - 1]);
        }
      }
      var lcs = L[seqT.length][canon.length];
      if (lcs >= 4) add('LAY-04', info.root, { sequence: seqT, inCanonicalOrder: lcs });
    };

    R['LAY-05'] = function () {
      I.forEach(function (it) {
        if (!/grid/.test(it.cs.display)) return;
        var kids = Array.prototype.filter.call(it.el.children, function (c) { return M.has(c); }).map(function (c) { return M.get(c); });
        if (kids.length < 4) return;
        var sizes = {};
        kids.forEach(function (k) { sizes[Math.round(k.r.w / 8) + 'x' + Math.round(k.r.h / 8)] = 1; });
        var carded = kids.filter(function (k) { return maxRadiusPx(k) >= 12 && (bgOf(k).a > 0.02 || minBorder(k.cs) >= 1); }).length;
        if (Object.keys(sizes).length >= 3 && carded >= 4) add('LAY-05', it.el, { children: kids.length, distinctSizes: Object.keys(sizes).length });
      });
    };

    R['LAY-06'] = function () {
      var info = sectionsInfo();
      if (info.secs.length < 4) return;
      var samples = [];
      info.secs.forEach(function (s) {
        var cs = getComputedStyle(s);
        [px(cs.paddingTop), px(cs.paddingBottom)].forEach(function (v) { if (v > 0) samples.push(Math.round(v)); });
      });
      I.forEach(function (it) {
        if (!/flex|grid/.test(it.cs.display) || it.el.children.length < 3) return;
        [it.cs.rowGap, it.cs.columnGap].forEach(function (g) { if (g !== 'normal' && px(g) > 0) samples.push(Math.round(px(g))); });
      });
      if (samples.length < 6) return;
      var distinct = samples.filter(function (v, k, a) { return a.indexOf(v) === k; });
      var mean = samples.reduce(function (s, v) { return s + v; }, 0) / samples.length;
      var sd = Math.sqrt(samples.reduce(function (s, v) { return s + (v - mean) * (v - mean); }, 0) / samples.length);
      var cv = mean ? sd / mean : 0;
      if (distinct.length <= 2 && cv < 0.1) add('LAY-06', info.root, { distinctValues: distinct, samples: samples.length, cv: rn(cv) });
    };

    // -------- components
    function hasBoxLook(it) {
      if (it.tag === 'html' || it.tag === 'body') return false;
      var shadow = parseShadows(it.cs.boxShadow).some(function (s) { return !s.inset; });
      return minBorder(it.cs) >= 1 || shadow;
    }
    R['CMP-01'] = function () {
      var h = q('h1')[0];
      if (!h) return;
      var cands = [];
      var pv = h.el.previousElementSibling;
      if (pv) cands.push(pv);
      var pp = h.el.parentElement && h.el.parentElement.previousElementSibling;
      if (pp) cands.push(pp);
      cands.forEach(function (c) {
        var pool = [c].concat(Array.prototype.slice.call(c.children));
        pool.forEach(function (e) {
          var it = M.get(e);
          if (!it || it.r.h > 56 || it.r.h < 14 || !isPill(it)) return;
          var t = norm(e.textContent);
          if (t && t.length <= 60) add('CMP-01', e, { aboveHeading: true, radiusPx: rn(radiusPx(it), 1) });
        });
      });
    };

    R['CMP-02'] = function () {
      var boxes = new Set();
      I.forEach(function (it) {
        if (it.r.w < 80 || it.r.h < 48 || /^(input|button|select|textarea|img|svg|a|tr|td|th|table|tbody|thead)$/.test(it.tag)) return;
        if (maxRadiusPx(it) < 4 || !hasBoxLook(it)) return;
        boxes.add(it.el);
      });
      boxes.forEach(function (b) {
        var a = b.parentElement;
        while (a && !boxes.has(a)) a = a.parentElement;
        if (a) add('CMP-02', b, { outer: sel(a) });
      });
    };

    R['CMP-03'] = function () {
      I.forEach(function (it) {
        if (!inRange(it.r.w, 32, 64) || !inRange(it.r.h, 32, 64) || Math.abs(it.r.w - it.r.h) > 2) return;
        var r = radiusPx(it);
        if (!inRange(r, 6, 16) || r >= it.r.w * 0.45) return;
        if (!isTint(bgOf(it))) return;
        var kids = it.el.children;
        if (kids.length !== 1 || kids[0].tagName.toLowerCase() !== 'svg' || norm(it.el.textContent)) return;
        var nx = it.el.nextElementSibling;
        if (!nx || !M.has(nx)) return;
        var nxi = M.get(nx);
        if (/^H[1-6]$/.test(nx.tagName) || (px(nxi.cs.fontWeight) >= 600 && norm(nx.textContent))) add('CMP-03', it.el, { sizePx: Math.round(it.r.w), radiusPx: rn(r, 1) });
      });
    };

    R['CMP-04'] = function () {
      var boxes = I.filter(function (it) {
        if (it.tag === 'html' || it.tag === 'body' || it.r.w < 80 || it.r.h < 40 || it.r.w >= vw * 0.95) return false;
        if (!/^(block|flex|grid|list-item|flow-root)$/.test(it.cs.display)) return false;
        return bgOf(it).a >= 0.9 || minBorder(it.cs) >= 1 || parseShadows(it.cs.boxShadow).length > 0;
      }).filter(function (it) { return maxRadiusPx(it) >= 4; });
      if (boxes.length < 5) return;
      var rc = {};
      boxes.forEach(function (b) { var k = Math.round(maxRadiusPx(b)); rc[k] = (rc[k] || 0) + 1; });
      var dom = Object.keys(rc).sort(function (a, b) { return rc[b] - rc[a]; })[0];
      if (+dom < 12 || rc[dom] / boxes.length < 0.8) return;
      var domBoxes = boxes.filter(function (b) { return Math.round(maxRadiusPx(b)) === +dom; });
      var sc = {};
      domBoxes.forEach(function (b) { sc[b.cs.boxShadow] = (sc[b.cs.boxShadow] || 0) + 1; });
      var ds = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; })[0];
      if (ds === 'none' || sc[ds] / domBoxes.length < 0.8) return;
      domBoxes.forEach(function (b) {
        if (b.cs.boxShadow === ds) add('CMP-04', b.el, { radiusPx: +dom, share: rn(rc[dom] / boxes.length), sharedShadow: ds.slice(0, 60) });
      });
    };

    R['CMP-05'] = function () {
      var list = I.filter(function (it) {
        var bf = it.cs.backdropFilter || it.cs.webkitBackdropFilter || '';
        if (bf.indexOf('blur') < 0) return false;
        if (it.tag === 'nav' || it.tag === 'dialog' || it.el.closest('nav,dialog,[role="dialog"]')) return false;
        return it.cs.position !== 'fixed' && it.cs.position !== 'sticky';
      });
      if (list.length >= 3) list.forEach(function (it) { add('CMP-05', it.el, { count: list.length, backdropFilter: (it.cs.backdropFilter || '').slice(0, 30) }); });
    };

    var BIGNUM = /^\$?\d[\d.,]*\s?(?:\+|%|[KMBkmb]\+?|[x\u00D7]\+?)$/;
    R['CMP-06'] = function () {
      I.forEach(function (par) {
        var kids = Array.prototype.filter.call(par.el.children, function (c) { return M.has(c); });
        if (kids.length < 3 || kids.length > 4) return;
        var nums = [];
        var ok = kids.every(function (k) {
          var found = null;
          Array.prototype.forEach.call(k.querySelectorAll('*'), function (d) {
            var di = M.get(d);
            if (found || !di || d.children.length) return;
            if (BIGNUM.test(norm(d.textContent)) && px(di.cs.fontSize) >= 28) found = norm(d.textContent);
          });
          if (!found) return false;
          nums.push(found);
          var rest = norm(k.textContent).replace(found, '').trim();
          return rest.length > 0 && rest.split(' ').length <= 6;
        });
        if (ok) add('CMP-06', par.el, { numbers: nums });
      });
    };

    function dotKind(it) {
      if (!inRange(it.r.w, 8, 16) || !inRange(it.r.h, 8, 16) || Math.abs(it.r.w - it.r.h) > 1 || !isPill(it)) return null;
      var bg = bgOf(it);
      if (bg.a < 0.8) return null;
      var h = hsl(bg);
      if (h.s < 0.4) return null;
      if (h.h <= 20 || h.h >= 340) return 'red';
      if (inRange(h.h, 35, 60)) return 'yellow';
      if (inRange(h.h, 100, 150)) return 'green';
      return null;
    }
    R['CMP-07'] = function () {
      var byParent = new Map();
      I.forEach(function (it) {
        var k = dotKind(it);
        if (!k || !it.el.parentElement) return;
        var rec = byParent.get(it.el.parentElement) || {};
        rec[k] = true;
        byParent.set(it.el.parentElement, rec);
      });
      byParent.forEach(function (rec, par) {
        if (!(rec.red && rec.yellow && rec.green)) return;
        var cont = par.parentElement || par;
        var mono = false;
        Array.prototype.forEach.call(cont.querySelectorAll('*'), function (d) {
          var di = M.get(d);
          if (mono || !di) return;
          if (ownText(d).length >= 3 && isMonoFont(resolved(di))) mono = true;
        });
        if (mono) add('CMP-07', cont, { windowDots: 3, monospaceBlock: true });
      });
    };

    var BADGE_RE = /popular|recommended|best value|\uC778\uAE30|\uCD94\uCC9C/i;
    R['CMP-09'] = function () {
      I.forEach(function (par) {
        var kids = Array.prototype.filter.call(par.el.children, function (c) { return M.has(c); });
        if (kids.length !== 3) return;
        if (!kids.every(function (k) { return currencyCount(k) >= 1; })) return;
        var infos = kids.map(function (k) {
          var it = M.get(k);
          var sc = 1;
          var tm = it.cs.transform.match(/matrix\(([^,]+),/);
          if (tm) sc = parseFloat(tm[1]);
          var badge = Array.prototype.some.call(k.querySelectorAll('*'), function (d) {
            var di = M.get(d);
            return di && di.r.h <= 40 && BADGE_RE.test(norm(d.textContent)) && norm(d.textContent).length <= 30;
          });
          return { border: it.cs.borderTopColor + '/' + sideW(it.cs, 'Top'), scale: rn(sc), badge: badge };
        });
        var o1 = infos[0], mid = infos[1], o2 = infos[2];
        var outerSame = o1.border === o2.border && o1.scale === o2.scale && o1.badge === o2.badge;
        var midDiffers = mid.border !== o1.border || mid.scale !== o1.scale || (mid.badge && !o1.badge);
        if (outerSame && midDiffers) add('CMP-09', kids[1], { middle: mid, outer: o1 });
      });
    };

    R['CMP-10'] = function () {
      var docH = document.documentElement.scrollHeight;
      q('input[type="email"]').forEach(function (it) {
        var form = it.el.closest('form') || it.el.parentElement;
        if (!form || !form.querySelector('button,input[type=submit]')) return;
        var foot = document.querySelector('footer');
        var near = it.r.t + window.scrollY > docH * 0.75 || (foot && (foot.contains(it.el) || foot.getBoundingClientRect().top - it.r.b < 400));
        if (near) add('CMP-10', form, { positionRatio: rn((it.r.t + window.scrollY) / docH) });
      });
    };

    function scanSheets(fn) {
      var blocked = 0;
      function walk(rules) {
        Array.prototype.forEach.call(rules, function (r) {
          fn(r);
          if (r.cssRules) walk(r.cssRules);
        });
      }
      Array.prototype.forEach.call(document.styleSheets, function (sh) {
        try { walk(sh.cssRules); } catch (e) { blocked++; }
      });
      return blocked;
    }
    R['CMP-11'] = function () {
      var bg = effBg();
      if (luminance(bg) > 0.1) return;
      var scheme = false;
      var blocked = scanSheets(function (r) {
        if (r.media && /prefers-color-scheme/.test(r.media.mediaText || r.conditionText || '')) scheme = true;
        if (r.style && /light/.test(r.style.colorScheme || '')) scheme = true;
      });
      var meta = document.querySelector('meta[name="color-scheme"]');
      if (meta && /light/.test(meta.content)) scheme = true;
      if (/light/.test(getComputedStyle(document.documentElement).colorScheme || '')) scheme = true;
      var toggle = document.querySelector('[aria-label*="theme" i],[aria-label*="dark mode" i],[aria-label*="light mode" i],[class*="theme-toggle"],[data-theme-toggle],[aria-label*="\uD14C\uB9C8"],[aria-label*="\uB2E4\uD06C"]');
      if (scheme || toggle) return;
      if (blocked) {
        notes.push('CMP-11 skipped: ' + blocked + ' stylesheet(s) are cross-origin and unreadable');
        return;
      }
      add('CMP-11', document.body, { backgroundLuminance: rn(luminance(bg), 4), prefersColorSchemeRules: 0 });
    };

    // -------- background, icons, motion
    R['BG-01'] = function () {
      function blurOf(cs) {
        var m = (cs.filter || '').match(/blur\(([\d.]+)px\)/);
        return m ? parseFloat(m[1]) : 0;
      }
      // An aurora glows in a color. A radial gradient whose stops are only black, white or gray (a vignette over a photo,
      // a soft shade) is not one, so it needs at least one visible stop with real chroma.
      function coloredRadial(bi) {
        if (!/radial-gradient/.test(bi)) return false;
        return colorsIn(bi).some(function (c) {
          if (c.a < 0.1) return false;
          var h = hsl(c);
          return h.s >= 0.35 && h.chroma >= 0.12 && h.l < 0.97;
        });
      }
      I.forEach(function (it) {
        var b = blurOf(it.cs);
        var radial = coloredRadial(it.cs.backgroundImage);
        var cover = (it.r.w * it.r.h) / (vw * vh);
        // A blur is a blob only when the box is blob sized; small blurred things are glows on icons or text.
        if (b >= 40 && it.r.w >= 200 && it.r.h >= 200) add('BG-01', it.el, { blurPx: b });
        else if (radial && cover >= 0.3) add('BG-01', it.el, { radialGradient: true, viewportAreaRatio: rn(cover) });
        else if (it.tag !== 'html' && it.tag !== 'body') {
          ['::before', '::after'].forEach(function (ps) {
            var pcs = getComputedStyle(it.el, ps);
            if (!pcs || pcs.content === 'none' || pcs.content === 'normal') return;
            var pb = blurOf(pcs);
            var pr = coloredRadial(pcs.backgroundImage);
            var w = px(pcs.width), h = px(pcs.height);
            if (pb >= 40 && (!w || !h || (w >= 200 && h >= 200))) add('BG-01', it.el, { pseudo: ps, blurPx: pb });
            else if (pr && w && h && (w * h) / (vw * vh) >= 0.3) add('BG-01', it.el, { pseudo: ps, radialGradient: true });
          });
        }
      });
    };

    R['ICO-01'] = function () {
      var list = q('svg[class*="lucide"],[data-lucide]');
      if (list.length < 3) return;
      var names = {};
      list.forEach(function (it) {
        var m = (it.el.getAttribute('class') || '').match(/lucide-([\w]+(?:-[\w]+)*)/);
        names[m ? m[1] : it.el.getAttribute('data-lucide') || 'lucide'] = 1;
      });
      list.forEach(function (it) { add('ICO-01', it.el, { lucideIcons: list.length, distinctNames: Object.keys(names).length }); });
    };

    R['MOT-01'] = function () {
      var kfNames = {};
      scanSheets(function (r) {
        if (r.type === 7 && r.cssText && /opacity/.test(r.cssText) && /translate/.test(r.cssText)) kfNames[r.name] = true;
      });
      var revealRe = /(^|[\s_-])(aos|reveal|fade-?(in|up|down)|animate-on-scroll|scroll-reveal|wow|animate-in|slide-up)([\s_-]|$)/i;
      function reveals(el) {
        var cs = getComputedStyle(el);
        if (el.hasAttribute('data-aos') || revealRe.test(el.getAttribute('class') || '')) return 'class';
        if (kfNames[cs.animationName]) return 'keyframes';
        var r = el.getBoundingClientRect();
        if (r.top > vh && parseFloat(cs.opacity) < 0.05 && cs.transform !== 'none' && /opacity|all/.test(cs.transitionProperty)) return 'pre-reveal';
        return null;
      }
      var info = sectionsInfo();
      if (info.secs.length >= 3) {
        var marked = [];
        info.secs.forEach(function (s) {
          var how = reveals(s);
          if (!how) {
            Array.prototype.some.call(s.querySelectorAll('*'), function (d) { how = reveals(d); return !!how; });
          }
          if (how) marked.push({ el: s, how: how });
        });
        if (marked.length >= 3 && marked.length / info.secs.length >= 0.5) {
          marked.forEach(function (m) { add('MOT-01', m.el, { revealSections: marked.length + '/' + info.secs.length, via: m.how }); });
        }
      }
      I.forEach(function (it) {
        var dur = px(it.cs.transitionDuration) + px(it.cs.animationDuration);
        if (!dur) return;
        var tf = it.cs.transitionTimingFunction + ' ' + it.cs.animationTimingFunction;
        var re = /cubic-bezier\(([^)]*)\)/g, m, over = false;
        while ((m = re.exec(tf))) {
          var pr = m[1].split(',').map(parseFloat);
          if (pr[1] > 1.05 || pr[1] < -0.05 || pr[3] > 1.05 || pr[3] < -0.05) over = true;
        }
        if (over) add('MOT-01', it.el, { overshootEasing: true });
      });
    };

    // -------- copy candidates (manual rules, candidates only)
    var AI_COPY = /\b(elevate your|unlock the (power|potential)|supercharge|seamless(ly)?|revolutioni[sz]e|game[- ]changer|next[- ]gen(eration)?|to the next level|reimagine[d]?|build faster,? ship smarter|(build|ship|move|work) (faster|smarter),)/i;
    var KO_COPY = /\uACBD\uD5D8\uD558\uC138\uC694|\uC0C8\uB85C\uC6B4 \uCC28\uC6D0|\uC758 \uBBF8\uB798\uB97C|\uB9CC\uB098\uBCF4\uC138\uC694|\uCC28\uC6D0\uC774 \uB2E4\uB978|\uD55C \uB2E8\uACC4 \uB354 \uC5C5\uADF8\uB808\uC774\uB4DC/;
    R['CPY-01'] = function () {
      I.forEach(function (it) {
        var t = ownText(it.el);
        if (t && AI_COPY.test(t)) add('CPY-01', it.el, { candidate: true, match: (t.match(AI_COPY) || [])[0] });
      });
    };
    R['KO-07'] = function () {
      I.forEach(function (it) {
        var t = ownText(it.el);
        if (t && KO_COPY.test(t)) add('KO-07', it.el, { candidate: true, match: (t.match(KO_COPY) || [])[0] });
      });
    };

    // -------- Korean
    function koEls(minLen) {
      var out = [];
      I.forEach(function (it) {
        var t = ownText(it.el);
        if (!t || t.length < (minLen || 1)) return;
        var st = hangulStats(t);
        if (st.h > 0) out.push({ it: it, text: t, st: st });
      });
      return out;
    }
    function lineHeightPx(cs) {
      var fs = px(cs.fontSize);
      return cs.lineHeight === 'normal' ? fs * 1.2 : px(cs.lineHeight);
    }
    // Rendered lines of an element's own text, counted from the line boxes of its text nodes. The element's box height
    // is not a line count: a one-word menu item with padding, a fixed height or a flex row is tall without wrapping.
    function lineCount(el) {
      var rng = document.createRange(), tops = [];
      Array.prototype.forEach.call(el.childNodes, function (nd) {
        if (nd.nodeType !== 3 || !nd.nodeValue.trim()) return;
        rng.selectNodeContents(nd);
        Array.prototype.forEach.call(rng.getClientRects(), function (rc) {
          if (rc.width > 0 && !tops.some(function (t) { return Math.abs(t - rc.top) < 2; })) tops.push(rc.top);
        });
      });
      return tops.length;
    }
    var breakBudget = 40000;
    function midWordBreaks(el, fs) {
      var found = 0, sample = null;
      var rng = document.createRange();
      Array.prototype.forEach.call(el.childNodes, function (nd) {
        if (nd.nodeType !== 3) return;
        var s = nd.nodeValue, prevTop = null, prevCh = '';
        for (var k = 0; k < s.length && breakBudget > 0; k++) {
          var ch = s[k];
          if (/\s/.test(ch)) { prevTop = null; prevCh = ''; continue; }
          breakBudget--;
          rng.setStart(nd, k);
          rng.setEnd(nd, k + 1);
          var rects = rng.getClientRects();
          if (!rects.length) continue;
          var top = rects[0].top;
          if (prevTop !== null && HANGUL_1.test(ch) && HANGUL_1.test(prevCh) && top - prevTop > fs * 0.6) {
            found++;
            if (!sample) sample = prevCh + '|' + ch;
          }
          prevTop = top;
          prevCh = ch;
        }
      });
      return { found: found, sample: sample };
    }
    R['KO-01'] = function () {
      koEls(4).forEach(function (o) {
        var it = o.it;
        if (it.cs.wordBreak === 'keep-all' || o.st.ratio < 0.5) return;
        if (lineCount(it.el) < 2) return;
        var res = midWordBreaks(it.el, px(it.cs.fontSize));
        if (res.found) add('KO-01', it.el, { wordBreak: it.cs.wordBreak, midWordBreaks: res.found, sample: res.sample });
      });
    };

    R['KO-02'] = function () {
      koEls(1).forEach(function (o) {
        var names = stackNames(o.it.cs.fontFamily).filter(function (nm) { return !GENERIC[nm.toLowerCase()]; });
        if (!names.length) return;
        // system-ui and its aliases resolve to the operating system UI font, which carries Hangul glyphs.
        var sysUi = stackNames(o.it.cs.fontFamily).some(function (nm) {
          return /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif|ui-rounded)$/i.test(nm);
        });
        if (sysUi) return;
        var capable = names.some(function (nm) {
          return KOREAN_FONT_RE.test(nm) || (fontAvailable(nm) && hangulMeasured(nm));
        });
        if (!capable) add('KO-02', o.it.el, { stack: o.it.cs.fontFamily.slice(0, 80) });
      });
    };

    R['KO-03'] = function () {
      koEls(8).forEach(function (o) {
        var it = o.it;
        if (o.st.ratio < 0.5 || /^h[1-6]$/.test(it.tag)) return;
        var fs = px(it.cs.fontSize);
        if (fs > 28) return;
        var lh = lineHeightPx(it.cs);
        var lines = lineCount(it.el);
        if (lines < 2) return;
        var ratio = lh / fs;
        if (ratio < 1.5) add('KO-03', it.el, { lineHeightRatio: rn(ratio), lines: lines });
      });
    };

    R['KO-04'] = function () {
      koEls(1).forEach(function (o) {
        if (o.it.cs.textTransform === 'uppercase') add('KO-04', o.it.el, { textTransform: 'uppercase' });
      });
    };

    R['KO-05'] = function () {
      koEls(1).forEach(function (o) {
        var ls = letterEm(o.it.cs);
        if (ls > 0.05 || ls < -0.03) add('KO-05', o.it.el, { letterSpacingEm: rn(ls) });
      });
    };

    R['KO-06'] = function () {
      koEls(1).forEach(function (o) {
        if (!/italic|oblique/.test(o.it.cs.fontStyle)) return;
        var names = stackNames(o.it.cs.fontFamily).map(function (nm) { return nm.toLowerCase(); });
        var hasItalic = FACES.some(function (f) { return names.indexOf(f.family) > -1 && /italic|oblique/.test(f.style) && f.status === 'loaded'; });
        if (!hasItalic) add('KO-06', o.it.el, { fontStyle: o.it.cs.fontStyle });
      });
    };

    R['KO-08'] = function () {
      var st = hangulStats(norm(document.body.innerText));
      var lang = document.documentElement.lang || '';
      if (st.ratio >= 0.5 && !/^ko/i.test(lang)) add('KO-08', document.documentElement, { lang: lang || '(missing)', hangulRatio: rn(st.ratio) });
    };

    R['KO-09'] = function () {
      var st = hangulStats(norm(document.body.innerText));
      if (st.ratio < 0.5) return;
      var CTA = /^(get started|learn more|sign up|sign in|log in|login|try|start|contact|book|buy|read more|see|view|download|subscribe|request|join|explore|watch|shop|submit|send)/i;
      I.forEach(function (it) {
        if (!btnLike(it.el)) return;
        var t = norm(it.el.textContent || it.el.value);
        if (t && !HANGUL_1.test(t) && /[A-Za-z]{3}/.test(t) && CTA.test(t)) add('KO-09', it.el, { label: t });
      });
    };

    R['KO-10'] = function () {
      koEls(20).forEach(function (o) {
        var it = o.it;
        if (o.st.ratio < 0.5 || it.cs.textAlign !== 'justify') return;
        var lines = lineCount(it.el);
        if (lines >= 3) add('KO-10', it.el, { textAlign: 'justify', lines: lines });
      });
    };

    R['KO-11'] = function () {
      koEls(1).forEach(function (o) {
        var fs = px(o.it.cs.fontSize);
        // Captions and body copy, not one-word labels: needs mostly Hangul and a sentence worth of characters.
        if (o.st.ratio < 0.5 || o.text.replace(/\s/g, '').length < 10) return;
        if (fs < 13 && !/^(sup|sub)$/.test(o.it.tag)) add('KO-11', o.it.el, { fontSizePx: fs, inFooter: !!o.it.el.closest('footer') });
      });
    };

    // ------------------------------------------------ execute in a fixed order
    var ORDER = [
      'AC-01', 'AC-02', 'AC-03', 'AC-04', 'AC-05', 'AC-06', 'AC-07', 'AC-08', 'AC-09', 'AC-10', 'AC-11', 'AC-12',
      'AC-13', 'AC-14', 'AC-15', 'AC-16', 'AC-17', 'COL-01', 'COL-02', 'COL-03', 'COL-04', 'COL-06', 'COL-07',
      'COL-05', 'TYP-01', 'TYP-02', 'TYP-03', 'TYP-04', 'TYP-05', 'LAY-01', 'LAY-02', 'LAY-03', 'LAY-04', 'LAY-05',
      'LAY-06', 'CMP-01', 'CMP-02', 'CMP-03', 'CMP-04', 'CMP-05', 'CMP-06', 'CMP-07', 'CMP-09', 'CMP-10', 'CMP-11',
      'BG-01', 'ICO-01', 'MOT-01', 'CPY-01', 'KO-01', 'KO-02', 'KO-03', 'KO-04', 'KO-05', 'KO-06', 'KO-07',
      'KO-08', 'KO-09', 'KO-10', 'KO-11'
    ];
    ORDER.forEach(function (id) {
      if (options.rules && options.rules.indexOf(id) < 0) return;
      try {
        R[id]();
      } catch (e) {
        errors.push({ ruleId: id, message: String((e && e.message) || e) });
      }
    });
    notes.push('Manual rules not run: AC-18, AC-19, CMP-08. CPY-01 and KO-07 report candidates only.');

    if (options.highlight) highlight(toHL);

    return { url: location.href, viewport: viewport, page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, version: VERSION, findings: findings, counts: counts, notes: notes, errors: errors };
  }

  run.version = VERSION;
  run.clear = clearHighlights;
  window.tasterDetect = run;
  return run;
})();
