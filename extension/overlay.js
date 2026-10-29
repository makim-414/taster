/*
 * Taster overlay: runs rules/detect.js on the page it is injected into, outlines every finding and shows a small
 * panel with the rules hit. Used by the browser extension (extension/background.js) and the bookmarklet served by
 * the web app. Lives in a shadow root so the page's styles cannot reach it, and removes itself before a rescan so
 * it is never measured. Plain DOM, no dependencies.
 */
(function () {
  'use strict';
  var HOST_ID = 'taster-overlay-host';
  var here = (document.currentScript && document.currentScript.src) || '';
  var base = here ? here.slice(0, here.lastIndexOf('/') + 1) : '';

  function load(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { fail(new Error('could not load ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  // The bookmarklet injects only this file; it fetches the detector and rule names from where it came from.
  function ready() {
    if (window.tasterDetect && window.__tasterRules) return Promise.resolve();
    if (!base) return Promise.reject(new Error('detect.js is not on the page'));
    return Promise.all([window.tasterDetect ? null : load(base + 'detect.js'), window.__tasterRules ? null : load(base + 'rules.js')]);
  }

  var CSS = [
    ':host{all:initial}',
    '.p{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(360px,calc(100vw - 32px));max-height:min(70vh,560px);display:flex;flex-direction:column;',
    'background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);',
    'font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}',
    '.h{display:flex;align-items:center;gap:8px;padding:10px 10px 10px 14px;border-bottom:1px solid #3f3f46}',
    '.t{font-weight:600;flex:1}',
    '.s{color:#a1a1aa;font-size:13px;padding:8px 14px 0}',
    'button{font:inherit;color:inherit;background:transparent;border:1px solid #3f3f46;border-radius:6px;min-height:32px;padding:0 10px;cursor:pointer}',
    'button:hover{background:#27272a}button:focus-visible{outline:2px solid #a1a1aa;outline-offset:2px}',
    'ul{list-style:none;margin:0;padding:6px;overflow:auto}',
    'li button{width:100%;display:flex;gap:10px;align-items:baseline;text-align:left;border:0;padding:8px;min-height:40px}',
    '.id{color:#a1a1aa;font-variant-numeric:tabular-nums;min-width:52px}',
    '.n{margin-left:auto;color:#a1a1aa;font-variant-numeric:tabular-nums}',
    '.f{padding:8px 14px 12px;color:#a1a1aa;font-size:12px;border-top:1px solid #3f3f46}',
    '.f a{color:#e4e4e7}',
  ].join('');

  function remove() {
    var old = document.getElementById(HOST_ID);
    if (old) old.remove();
  }

  function render(report) {
    remove();
    var rules = window.__tasterRules || {};
    var order = { high: 0, medium: 1, low: 2 };
    var ids = Object.keys(report.counts).sort(function (a, b) {
      var ra = rules[a] || {}, rb = rules[b] || {};
      return (order[ra.severity] || 3) - (order[rb.severity] || 3) || report.counts[b] - report.counts[a];
    });
    var total = ids.reduce(function (n, id) { return n + report.counts[id]; }, 0);
    var host = document.createElement('div');
    host.id = HOST_ID;
    var root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var p = document.createElement('section');
    p.className = 'p';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Taster findings');
    var h = document.createElement('div');
    h.className = 'h';
    var t = document.createElement('div');
    t.className = 't';
    t.textContent = 'Taster';
    var again = document.createElement('button');
    again.textContent = 'Rescan';
    again.onclick = function () { scan(); };
    var close = document.createElement('button');
    close.textContent = 'Close';
    close.onclick = function () { window.tasterDetect({ clear: true }); remove(); };
    h.append(t, again, close);
    var s = document.createElement('div');
    s.className = 's';
    s.textContent = ids.length
      ? ids.length + ' rules hit, ' + total + ' findings at ' + report.viewport.width + ' wide. Outlined on the page.'
      : 'No findings at ' + report.viewport.width + ' wide.';
    var ul = document.createElement('ul');
    ids.forEach(function (id) {
      var r = rules[id] || { name: id };
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.title = 'Scroll to the first one';
      var idEl = document.createElement('span');
      idEl.className = 'id';
      idEl.textContent = id;
      var name = document.createElement('span');
      name.textContent = r.name;
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(report.counts[id]);
      b.append(idEl, name, n);
      b.onclick = function () {
        var f = report.findings.find(function (x) { return x.ruleId === id; });
        var el = f && document.querySelector(f.selector);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
      li.append(b);
      ul.append(li);
    });
    var f = document.createElement('div');
    f.className = 'f';
    f.innerHTML = 'Measured in this tab only. Fixes and patterns: <a href="https://taster-six.vercel.app" target="_blank" rel="noopener">taster-six.vercel.app</a>';
    p.append(h, s, ul, f);
    root.appendChild(p);
    document.documentElement.appendChild(host);
    window.__tasterLastReport = report;
  }

  function scan() {
    remove();
    var report = window.tasterDetect({ highlight: true });
    render(report);
    return report;
  }

  ready().then(scan, function (err) {
    alert('Taster: ' + err.message + '. This site may block injected scripts; try the browser extension.');
  });
})();
