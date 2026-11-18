// The live viewer for `taster watch` (packages/engine/watch.mjs). No dependencies and no build: it reads the hub's
// event stream (/events, SSE) and draws it. The page a diagnose measured is the stage: the clean picture the engine
// took from the same load, with a mark on every finding at its real rect. Each agent (and each call it runs at the same
// time, a lane) gets a cursor in its own color that flies to the findings, the swaps, the components and the token
// changes as the events arrive. Detection is one pass, so the visiting order is chosen here: the 30 most severe
// findings, top to bottom. After an agent edits a file, the hub loads the page again and sends what changed
// (stage.patch): that agent's cursor flies to each changed region, draws its box and size, and only that region of the
// new picture fades in; the whole new picture settles once every region is shown, and findings that are gone resolve
// where they were. When the page does not load after an edit (stage.error), a line over the stage says so, with the
// edit, until the next good load. Page text from events is only ever set with textContent.
'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = {
    status: $('status'),
    agents: $('agents'),
    main: $('main'),
    title: $('stage-title'),
    widths: $('widths'),
    counts: $('counts'),
    stage: $('stage'),
    error: $('stage-error'),
    inner: $('inner'),
    shots: [$('shot-a'), $('shot-b')],
    pins: $('pins'),
    patches: $('patches'),
    empty: $('empty'),
    tokens: $('tokens'),
    tokensEmpty: $('tokens-empty'),
    log: $('log'),
    cursors: $('cursors'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = new URLSearchParams(location.hash.slice(1)).get('k') || '';
  const SEV = { high: 0, medium: 1, low: 2 };
  const VISITS = 30;
  const MAX_LOG = 100;
  const MAX_TOKENS = 14;
  const MOVE_MS = 520;
  const DWELL_MS = 420;
  // After a cursor's call ends and its queue is empty, its last label stays this long, then only the name is left.
  const QUIET_MS = 2500;
  const FADE_MS = 600;
  // A resolved mark plays its turn (green, then fading out) and is removed after this long.
  const RESOLVED_MS = 2800;
  // How many resolved elements the hub cursor visits after a refresh; the rest resolve where they are.
  const RESOLVED_VISITS = 6;
  // A cursor stays on each changed region of an edit this long; an edit whose regions are not all shown by then (a
  // cursor busy elsewhere) settles anyway.
  const PATCH_DWELL = 650;
  const PATCH_WAIT = 20000;

  // ---- small DOM helpers: every string goes in as text ----
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const code = (text) => h('code', null, text);
  const short = (s, n = 80) => {
    const str = String(s ?? '');
    return str.length > n ? `${str.slice(0, n - 3)}...` : str;
  };
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const tail = (url) => {
    const s = String(url || '');
    const m = /^file:\/\/.*\/([^/]+)$/.exec(s);
    return m ? m[1] : s.replace(/^https?:\/\//, '');
  };

  // ---- state ----
  const agents = new Map();
  const cursors = new Map();
  const calls = new Map();
  const stages = [];
  const names = {};
  const lastComponent = new Map();
  let colors = 0;
  let current = null;
  let replaying = true;
  let follow = null;
  let patching = Promise.resolve();

  function agentOf(a) {
    let agent = agents.get(a.id);
    if (agent) {
      if (a.client && !agent.client) {
        agent.client = a.client;
        agent.el.replaceChildren(...agentLabel(agent));
      }
      return agent;
    }
    agent = { id: a.id, kind: a.kind || 'cli', client: a.client || null, label: a.label || a.kind || 'agent', color: a.id === 'hub' ? 'hub' : String((colors++ % 6) + 1) };
    agent.el = h('li', { class: 'agent', 'data-color': agent.color }, ...agentLabel(agent));
    ui.agents.append(agent.el);
    agents.set(agent.id, agent);
    return agent;
  }
  // An agent's own edits come through its hook, a channel of their own: "claude-code edits", next to the same
  // client's Taster calls.
  const via = (agent) => (agent.kind === 'hook' ? `${agent.client || 'agent'} edits` : agent.client || agent.kind);
  function agentLabel(agent) {
    return [h('b', null, agent.label), ` ${via(agent)}`];
  }

  // ---- cursors: one per agent and lane, moved by a queue of steps, drawn every frame ----
  function cursorOf(e) {
    const agent = agentOf(e.agent);
    const lane = e.agent.lane || 0;
    const id = `${agent.id}:${lane}`;
    let c = cursors.get(id);
    if (c) return c;
    const say = h('span', { class: 'cursor-say' });
    const name = `${agent.label}${lane ? ` #${lane + 1}` : ''} (${via(agent)})`;
    const el = h(
      'div',
      { class: 'cursor', 'data-color': agent.color, 'data-idle': true },
      svgArrow(),
      h('div', { class: 'cursor-tag' }, h('span', { class: 'cursor-name' }, name), say),
    );
    ui.cursors.append(el);
    const index = cursors.size;
    c = { id, el, say, agent, queue: [], busy: false, anim: null, pos: null, target: { home: index }, drawn: '' };
    cursors.set(id, c);
    return c;
  }
  function svgArrow() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M2 1.5 L2 16 L6 12.2 L9 18.5 L11.8 17.2 L8.9 11 L14.5 11 Z');
    svg.append(path);
    return svg;
  }

  const mainBox = () => ui.main.getBoundingClientRect();
  // Where an anchor is, in pixels of the main area (the cursor layer). A point on the stage is clamped to the part of
  // the stage that is scrolled into view, so a cursor never sits over the header or the side panel.
  function resolve(anchor) {
    const m = mainBox();
    if (anchor.stage && current?.shotSize) {
      const r = ui.inner.getBoundingClientRect();
      const v = ui.stage.getBoundingClientRect();
      const s = r.width / current.shotSize.width;
      const x = r.left + anchor.stage.x * s;
      const y = r.top + anchor.stage.y * s;
      return [Math.min(v.right - 24, Math.max(v.left + 4, x)) - m.left, Math.min(v.bottom - 24, Math.max(v.top + 4, y)) - m.top];
    }
    if (anchor.el && anchor.el.isConnected) {
      const r = anchor.el.getBoundingClientRect();
      return [r.left - m.left + (anchor.dx ?? 12), r.top - m.top + (anchor.dy ?? r.height / 2)];
    }
    const v = ui.stage.getBoundingClientRect();
    const n = anchor.home || 0;
    return [v.left - m.left + 24 + (n % 4) * 150, v.top - m.top + 24 + Math.floor(n / 4) * 60];
  }

  const ease = (p) => {
    const x = Math.min(1, Math.max(0, p));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  function frame(now) {
    const width = ui.main.clientWidth;
    for (const c of cursors.values()) {
      const [tx, ty] = resolve(c.target);
      let x = tx;
      let y = ty;
      if (c.anim) {
        const p = ease((now - c.anim.start) / c.anim.dur);
        x = c.anim.from[0] + (tx - c.anim.from[0]) * p;
        y = c.anim.from[1] + (ty - c.anim.from[1]) * p;
        if (p >= 1) c.anim = null;
      }
      c.pos = [x, y];
      const t = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (t !== c.drawn) {
        c.drawn = t;
        c.el.style.transform = t;
        c.el.toggleAttribute('data-flip', x > width - 220);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function setSay(c, say) {
    if (say === undefined) return;
    c.say.replaceChildren(...(Array.isArray(say) ? say : [say]).filter((x) => x !== null && x !== undefined));
  }
  // A cursor whose call is over and whose queue is empty goes idle; a moment later its last label fades and only the
  // arrow and the agent's name stay. A new step wakes it again.
  function rest(c) {
    c.el.setAttribute('data-idle', '');
    clearTimeout(c.quiet);
    if (replaying) {
      c.say.replaceChildren();
      return;
    }
    c.quiet = setTimeout(() => {
      c.el.setAttribute('data-quiet', '');
      c.quiet = setTimeout(() => {
        c.say.replaceChildren();
        c.el.removeAttribute('data-quiet');
      }, reducedMotion.matches ? 0 : FADE_MS);
    }, QUIET_MS);
  }
  function wake(c) {
    clearTimeout(c.quiet);
    c.el.removeAttribute('data-quiet');
    c.el.removeAttribute('data-idle');
  }
  // Keep a stage point in view while the followed cursor flies to it.
  function reveal(anchor) {
    if (!anchor.stage || !current?.shotSize) return;
    const s = ui.inner.clientWidth / current.shotSize.width;
    const y = anchor.stage.y * s;
    const top = ui.stage.scrollTop;
    const height = ui.stage.clientHeight;
    if (y < top + 40 || y > top + height - 80) ui.stage.scrollTo({ top: Math.max(0, y - height / 3), behavior: reducedMotion.matches || replaying ? 'auto' : 'smooth' });
  }

  /** Queue a move: { anchor, say, arrive, dwell }. While the stream replays, it lands at once. */
  function step(c, s) {
    wake(c);
    if (replaying) {
      c.target = s.anchor || c.target;
      c.anim = null;
      s.arrive?.();
      setSay(c, s.say);
      return;
    }
    c.queue.push(s);
    next(c);
  }
  function next(c) {
    if (c.busy) return;
    const s = c.queue.shift();
    if (!s) {
      if (c.done) rest(c);
      return;
    }
    c.busy = true;
    const hurry = c.queue.length > 12;
    const move = reducedMotion.matches ? 0 : hurry ? MOVE_MS / 2 : MOVE_MS;
    const dwell = s.dwell ?? (hurry ? DWELL_MS / 2 : DWELL_MS);
    if (s.anchor) {
      c.anim = c.pos && move ? { from: c.pos, start: performance.now(), dur: move } : null;
      c.target = s.anchor;
      if (follow === c) reveal(s.anchor);
    }
    setTimeout(() => {
      s.arrive?.();
      setSay(c, s.say);
      setTimeout(() => {
        c.busy = false;
        next(c);
      }, dwell);
    }, s.anchor ? move : 0);
  }

  // ---- the stage: the page picture, its marks, and the widths of the same diagnose ----
  const shotUrl = (id) => `/shot/${encodeURIComponent(id)}?k=${encodeURIComponent(key)}`;
  let front = 0;
  function showPicture(stage) {
    if (!stage.shot) {
      ui.shots.forEach((img) => img.removeAttribute('data-on'));
      return;
    }
    const back = ui.shots[1 - front];
    const shown = ui.shots[front];
    back.onload = () => {
      back.setAttribute('data-on', '');
      shown.removeAttribute('data-on');
      front = 1 - front;
    };
    back.src = shotUrl(stage.shot);
  }

  function show(stage) {
    current = stage;
    ui.empty.hidden = true;
    ui.inner.hidden = !stage.shot;
    ui.title.textContent = short(tail(stage.finalUrl || stage.url), 120);
    ui.title.title = stage.url;
    if (stage.shotSize) ui.inner.style.aspectRatio = `${stage.shotSize.width} / ${stage.shotSize.height}`;
    showPicture(stage);
    drawMarks(stage);
    drawWidths();
    drawCounts();
    drawError(stage);
  }

  // The line over the stage while its page does not load after an edit.
  function drawError(stage) {
    const err = stage?.error;
    ui.error.hidden = !err;
    if (!err) {
      ui.error.replaceChildren();
      return;
    }
    ui.error.replaceChildren(h('b', null, err.status ? `HTTP ${err.status}` : 'Did not load'), ' after the edit to ', code(short(err.file || 'a file', 60)), `: ${short(err.message || 'the page did not load', 160)}`);
  }
  function clearError(stage) {
    if (!stage.error) return;
    stage.error = null;
    if (stage === current) drawError(stage);
  }

  function drawWidths() {
    const same = stages.filter((s) => current && s.call === current.call && s.call);
    ui.widths.replaceChildren(
      ...(same.length > 1
        ? same.map((s) => {
            const b = h('button', { type: 'button', 'aria-pressed': String(s === current) }, `${s.width}`);
            b.addEventListener('click', () => show(s));
            return b;
          })
        : []),
    );
  }

  function drawCounts() {
    const s = current;
    if (!s) return;
    if (s.diagnosed === false) {
      ui.counts.textContent = `not diagnosed${s.reason ? `: ${s.reason}` : ''}`;
      return;
    }
    const spots = s.spots ? s.spots.size : 0;
    const rules = s.findings ? new Set(s.findings.map((f) => f.ruleId)).size : 0;
    const after = s.patches
      ? `${plural(s.patches, 'edit')} shown, ${s.patchResolved || 0} resolved`
      : s.refreshed
        ? s.resolvedCount
          ? `${s.resolvedCount} resolved after the change`
          : 'the page changed'
        : '';
    ui.counts.textContent = s.findings
      ? `${plural(rules, 'rule')}, ${plural(s.findings.length, 'finding')} at ${s.width}${s.spots && spots < s.findings.length ? ` on ${plural(spots, 'element')}` : ''}${after ? `, ${after}` : ''}`
      : `measuring at ${s.width}`;
  }

  // One mark per element, with every rule it hit; the most severe rule sets its style.
  function spotsOf(stage) {
    const spots = new Map();
    const height = stage.shotSize?.height || Infinity;
    for (const f of stage.findings || []) {
      const r = f.rect;
      if (!r || r.w <= 0 || r.h <= 0 || r.y >= height) continue;
      const k = f.selector || `${r.x},${r.y},${r.w},${r.h}`;
      const spot = spots.get(k) || { key: k, rect: r, rules: new Set(), sev: 'low' };
      spot.rules.add(f.ruleId);
      if (SEV[f.severity] < SEV[spot.sev]) spot.sev = f.severity;
      spots.set(k, spot);
    }
    return spots;
  }
  function placeMark(stage, spot) {
    const W = stage.shotSize.width;
    const H = stage.shotSize.height;
    const r = spot.rect;
    const el = spot.el || h('span', { class: 'mark' });
    el.setAttribute('data-sev', spot.sev);
    el.style.left = `${(Math.max(0, r.x) / W) * 100}%`;
    el.style.top = `${(Math.max(0, r.y) / H) * 100}%`;
    el.style.width = `${(Math.min(r.w, W - Math.max(0, r.x)) / W) * 100}%`;
    el.style.height = `${(Math.min(r.h, H - Math.max(0, r.y)) / H) * 100}%`;
    spot.el = el;
    return el;
  }
  function drawMarks(stage) {
    ui.pins.replaceChildren();
    if (!stage.findings || !stage.shotSize) return;
    stage.spots = spotsOf(stage);
    for (const spot of stage.spots.values()) {
      ui.pins.append(placeMark(stage, spot));
      if (stage.visited?.has(spot.key) || replaying) spot.el.setAttribute('data-on', '');
    }
  }
  const pointOf = (spot) => ({ stage: { x: spot.rect.x + Math.min(spot.rect.w / 2, 60), y: spot.rect.y + Math.min(spot.rect.h / 2, 30) } });
  const ruleSay = (rules) => [...rules].slice(0, 3).map((id) => h('span', null, code(id), names[id] ? ` ${names[id]}` : ''));
  const markOf = (ruleIds) => {
    if (!current?.spots) return null;
    for (const spot of current.spots.values()) if (!spot.resolved && [...spot.rules].some((r) => ruleIds.includes(r))) return spot;
    return null;
  };

  // The visiting order: the 30 most severe elements, then top to bottom so the path reads down the page.
  function visit(stage, c) {
    const spots = [...stage.spots.values()];
    const order = spots
      .map((s, i) => ({ s, i }))
      .sort((a, b) => SEV[a.s.sev] - SEV[b.s.sev] || a.s.rect.y - b.s.rect.y || a.i - b.i)
      .slice(0, VISITS)
      .map((x) => x.s)
      .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    stage.visited ||= new Set();
    follow = c;
    for (const spot of order) {
      step(c, {
        anchor: pointOf(spot),
        say: ruleSay(spot.rules),
        arrive: () => {
          stage.visited.add(spot.key);
          if (current === stage) spot.el?.setAttribute('data-on', '');
        },
      });
    }
    // The rest are marked once the cursor is done with the first ones.
    step(c, {
      say: order.length < spots.length ? `${spots.length - order.length} more marked` : null,
      arrive: () => {
        for (const spot of spots) {
          stage.visited.add(spot.key);
          if (current === stage) spot.el?.setAttribute('data-on', '');
        }
      },
      dwell: 200,
    });
  }

  // ---- the side panels ----
  function logCall(e, agent) {
    const args = e.data?.args || {};
    const what = args.target || (args.ruleIds && args.ruleIds.join(' ')) || args.id || (args.ids && [].concat(args.ids).join(' ')) || args.screens || (args.axes && JSON.stringify(args.axes)) || args.plan || '';
    const state = h('span', { class: 'call-state' }, 'running');
    const detail = h('span', { class: 'call-detail' });
    const el = h('li', { class: 'call', 'data-color': agent.color, 'data-state': 'running' }, h('span', { class: 'call-what' }, h('b', null, e.tool || 'call'), ' ', short(tail(Array.isArray(what) ? what.join(' ') : what), 90)), state, detail);
    ui.log.prepend(el);
    while (ui.log.children.length > MAX_LOG) ui.log.lastElementChild.remove();
    if (e.call) calls.set(e.call, { el, state, detail });
  }
  function endCall(e) {
    const entry = calls.get(e.call);
    const d = e.data || {};
    if (entry) {
      entry.el.setAttribute('data-state', d.ok ? 'done' : 'failed');
      entry.state.textContent = d.cancelled ? 'cancelled' : d.ok ? `${(d.ms / 1000).toFixed(1)}s` : 'failed';
      if (d.error) entry.detail.textContent = short(d.error, 160);
      calls.delete(e.call);
    }
  }
  // An edit an agent reported outside any Taster call (its own Edit or Write tool): one line in the log.
  function logEdit(e, agent) {
    const d = e.data || {};
    const el = h('li', { class: 'call', 'data-color': agent.color, 'data-state': 'done' }, h('span', { class: 'call-what' }, h('b', null, d.tool || 'edit'), ' ', short(d.file || '', 90)), h('span', { class: 'call-state' }, 'edit'), h('span', { class: 'call-detail' }));
    ui.log.prepend(el);
    while (ui.log.children.length > MAX_LOG) ui.log.lastElementChild.remove();
  }
  function tokenRows(diff) {
    ui.tokensEmpty.hidden = diff.length > 0;
    if (!diff.length) ui.tokensEmpty.textContent = 'The last change moved no token.';
    ui.tokens.replaceChildren();
    return diff.slice(0, MAX_TOKENS).map((d) => {
      const out = h('output', null, short(d.from ?? '', 40));
      const row = h('li', { class: 'token' }, code(d.name), out);
      ui.tokens.append(row);
      return { row, out, to: short(d.to ?? '', 40), name: d.name };
    });
  }

  // ---- events ----
  function onEvent(e) {
    // A patch is drawn by the cursors of the agents whose edits it shows, one patch after another.
    if (e.type === 'stage.patch' || e.type === 'stage.error') {
      const d = e.data || {};
      const draw = e.type === 'stage.patch' ? patched : (x) => broke(e, x);
      patching = patching.then(() => draw(d)).catch((err) => console.warn('taster watch: could not draw', e.type, err));
      return;
    }
    const agent = agentOf(e.agent);
    const c = cursorOf(e);
    const d = e.data || {};
    switch (e.type) {
      case 'call.start':
        c.done = false;
        logCall(e, agent);
        step(c, { say: [code(e.tool || 'call'), ' ', short(tail(d.args?.target || ''), 40)], dwell: 150 });
        break;
      case 'call.end':
        endCall(e);
        c.done = true;
        if (!c.queue.length && !c.busy) rest(c);
        break;
      case 'stage': {
        const stage = { seq: e.seq, call: e.call, agent: agent.id, url: d.url, finalUrl: d.finalUrl, width: d.width, shot: d.shot || null, shotSize: d.shotSize || null, diagnosed: d.diagnosed !== false, reason: d.reason || null, findings: null };
        stages.push(stage);
        if (stages.length > 60) stages.shift();
        const firstOfCall = !current || current.call !== e.call;
        if (firstOfCall) show(stage);
        else drawWidths();
        step(c, { anchor: { home: 0, ...(current === stage ? { stage: { x: 40, y: 40 } } : {}) }, say: stage.diagnosed ? `${firstOfCall ? 'opened' : 'also measured'} at ${stage.width}` : `not diagnosed${stage.reason ? `: ${stage.reason}` : ''}` });
        break;
      }
      case 'findings': {
        Object.assign(names, d.names || {});
        const stage = [...stages].reverse().find((s) => s.call === e.call && s.width === d.width);
        if (!stage) break;
        stage.findings = Array.isArray(d.findings) ? d.findings : [];
        if (stage === current) {
          drawMarks(stage);
          drawCounts();
          if (!replaying) visit(stage, c);
        }
        break;
      }
      case 'rules':
        for (const r of d.rules || []) names[r.ruleId] = r.name;
        if (current?.call === e.call) drawCounts();
        break;
      case 'swaps':
        for (const item of (d.items || []).slice(0, 8)) {
          const spot = markOf([item.ruleId]);
          step(c, { anchor: spot ? pointOf(spot) : undefined, say: [code(item.ruleId), ` swap for ${(item.components || []).slice(0, 3).join(', ') || (item.patterns || []).slice(0, 2).join(', ') || 'a pattern'}`] });
        }
        break;
      case 'component': {
        const spot = markOf(d.fixes || []);
        if (spot) lastComponent.set(agent.id, spot);
        step(c, { anchor: spot ? pointOf(spot) : undefined, say: ['component ', code(d.id || '')] });
        break;
      }
      case 'component.add': {
        const spot = lastComponent.get(agent.id);
        const n = (d.written || []).length;
        step(c, { anchor: spot && !spot.resolved ? pointOf(spot) : undefined, say: [`added ${(d.ids || []).join(', ')}: ${n} file${n === 1 ? '' : 's'} in `, code(d.dir || '.')] });
        break;
      }
      case 'system': {
        const rows = tokenRows(Object.entries(d.steps || {}).map(([name, s]) => ({ name, from: s, to: s })));
        rows.forEach((r) => r.row.setAttribute('data-on', ''));
        step(c, { anchor: rows[0] ? { el: rows[0].row } : undefined, say: `design system, ${plural(d.tokens || 0, 'token')}` });
        break;
      }
      case 'system.tuned': {
        const changed = Object.entries(d.changes || {}).map(([a, v]) => `${a} to ${v}`).join(', ');
        const rows = tokenRows(d.diff || []);
        step(c, { anchor: rows[0] ? { el: rows[0].row } : undefined, say: `tune ${changed}` });
        for (const r of rows.slice(0, 8)) {
          step(c, {
            anchor: { el: r.row, dx: r.row.clientWidth - 24 },
            say: [code(r.name), ` ${r.to}`],
            arrive: () => {
              r.row.setAttribute('data-on', '');
              r.out.textContent = r.to;
            },
            dwell: 260,
          });
        }
        step(c, {
          arrive: () => rows.forEach((r) => {
            r.row.setAttribute('data-on', '');
            r.out.textContent = r.to;
          }),
          say: (d.summary || []).slice(0, 1).join(''),
          dwell: 100,
        });
        break;
      }
      case 'consistency':
        step(c, { anchor: { el: ui.counts, dx: 0 }, say: d.ok ? `consistent across ${plural(d.screens || 0, 'screen')}` : `${d.drift} drift, ${d.offSystem} off the system` });
        break;
      case 'plan':
        step(c, { anchor: { el: ui.counts, dx: 0 }, say: `plan: ${d.action || ''} ${d.screen || ''}`.trim() });
        break;
      case 'stage.refresh':
        refreshed(c, d);
        break;
      case 'edit':
        // Inside a Taster call (add) the call is in the log already; an agent's own edit gets a line of its own.
        if (!e.call) logEdit(e, agent);
        step(c, { say: h('span', null, 'edited ', code(short(d.file || '', 60))), dwell: 200 });
        if (!e.call) c.done = true;
        break;
      default:
        break;
    }
  }

  // A newer load of the stage's page: its marks before and after, and the elements whose rules are all gone.
  function compare(stage, findings, shotSize) {
    const before = stage.spots || spotsOf(stage);
    const after = spotsOf({ findings, shotSize: shotSize || stage.shotSize });
    const resolved = [];
    for (const spot of before.values()) {
      if (spot.resolved) continue;
      const now = after.get(spot.key);
      const gone = [...spot.rules].filter((r) => !now?.rules.has(r));
      if (gone.length === spot.rules.size) resolved.push({ spot, gone });
    }
    for (const { spot } of resolved) spot.resolved = true;
    return { before, after, resolved };
  }
  // Elements still found keep their mark, moved to where they are on the new picture; new ones get a mark.
  function remark(stage, before, after) {
    for (const spot of after.values()) {
      const old = before.get(spot.key);
      if (old?.el?.isConnected && !old.resolved) spot.el = old.el;
      if (!spot.el) ui.pins.append(placeMark(stage, spot));
      else placeMark(stage, spot);
      spot.el.setAttribute('data-on', '');
      spot.el.removeAttribute('data-gone');
    }
    stage.spots = after;
    stage.visited = new Set(after.keys());
  }
  // A resolved mark plays its turn (green, then fading out) and is removed.
  function settle(spot) {
    if (!spot.el) return;
    spot.el.removeAttribute('data-gone');
    spot.el.setAttribute('data-resolved', '');
    const el = spot.el;
    setTimeout(() => el.remove(), reducedMotion.matches ? 0 : RESOLVED_MS);
  }

  // A newer picture of the same page after a change: crossfade, and the elements whose rules are gone turn resolved.
  function refreshed(c, d) {
    const stage = stages.find((s) => s.seq === d.of);
    if (!stage) return;
    clearError(stage);
    const shotSize = d.shotSize || stage.shotSize;
    const { before, after, resolved } = compare(stage, d.findings || [], shotSize);
    stage.shot = d.shot;
    stage.shotSize = shotSize;
    stage.findings = d.findings || [];
    stage.refreshed = true;
    stage.resolvedCount = resolved.length;
    if (stage !== current) {
      stage.spots = null;
      return;
    }
    if (stage.shotSize) ui.inner.style.aspectRatio = `${stage.shotSize.width} / ${stage.shotSize.height}`;
    showPicture(stage);
    remark(stage, before, after);
    // Resolved marks are hidden at once, so they never read as findings on the new picture. Each one then plays its
    // turn: the first few when the hub cursor gets there, the rest at once.
    for (const { spot } of resolved) spot.el?.setAttribute('data-gone', '');
    for (const { spot } of resolved.slice(RESOLVED_VISITS)) settle(spot);
    for (const { spot, gone } of resolved.slice(0, RESOLVED_VISITS)) {
      step(c, { anchor: pointOf(spot), say: ['resolved ', ...ruleSay(gone)], arrive: () => settle(spot), dwell: 320 });
    }
    // The hub has no call to end: once it has shown the change, its label fades like any finished call's.
    step(c, {
      anchor: { el: ui.counts, dx: 0 },
      say: resolved.length ? `${resolved.length} resolved after the change` : 'the page changed',
      arrive: () => {
        c.done = true;
      },
    });
    drawCounts();
  }

  // ---- per edit: the regions that changed, each shown by the cursor of the agent whose edit it goes with ----
  const overlaps = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // The new picture clipped to one region, over the old one, in a box with the region's size. Null when the region is
  // not on the picture shown now.
  function patchBox(stage, r, src, newWidth, color) {
    const W = stage.shotSize.width;
    const H = stage.shotSize.height;
    const x = Math.max(0, r.rect.x);
    const y = Math.max(0, r.rect.y);
    if (x >= W || y >= H) return null;
    const w = Math.max(1, Math.min(r.rect.w, W - x));
    const ht = Math.max(1, Math.min(r.rect.h, H - y));
    const img = h('img', { class: 'patch-img', alt: '' });
    img.src = src;
    // In the box's own units: the picture is newWidth / w boxes wide, and starts x and y back from the box's corner.
    img.style.width = `${(newWidth / w) * 100}%`;
    img.style.left = `${(-x / w) * 100}%`;
    img.style.top = `${(-y / ht) * 100}%`;
    const el = h('div', { class: 'patch', 'data-color': color, 'data-kind': r.kind, 'data-top': y < 28 }, h('div', { class: 'patch-clip' }, img), h('span', { class: 'patch-size' }, `${Math.round(w)} x ${Math.round(ht)}`));
    el.style.left = `${(x / W) * 100}%`;
    el.style.top = `${(y / H) * 100}%`;
    el.style.width = `${(w / W) * 100}%`;
    el.style.height = `${(ht / H) * 100}%`;
    return el;
  }

  // The page did not load after an edit: the line over the stage, a failed line in the log, and the editing cursor says so.
  function broke(e, d) {
    const stage = stages.find((s) => s.seq === d.of);
    if (!stage) return;
    stage.error = { status: Number.isInteger(d.status) ? d.status : null, message: String(d.message || ''), file: String(d.file || '') };
    if (stage === current) drawError(stage);
    const hub = agentOf(e.agent);
    const state = h('span', { class: 'call-state' }, stage.error.status ? `HTTP ${stage.error.status}` : 'failed');
    const el = h('li', { class: 'call', 'data-color': hub.color, 'data-state': 'failed' }, h('span', { class: 'call-what' }, h('b', null, 'reload'), ' after ', short(stage.error.file || 'an edit', 80)), state, h('span', { class: 'call-detail' }, short(stage.error.message, 160)));
    ui.log.prepend(el);
    while (ui.log.children.length > MAX_LOG) ui.log.lastElementChild.remove();
    if (replaying || !d.agent || typeof d.agent.id !== 'string') return;
    const c = cursorOf({ agent: d.agent });
    step(c, { anchor: stage === current ? { el: ui.error } : undefined, say: [h('span', null, code(short(stage.error.file || 'a file', 48))), h('span', null, 'the page did not load')], dwell: 300 });
    c.done = true;
  }

  function patched(d) {
    const stage = stages.find((s) => s.seq === d.of);
    if (!stage) return Promise.resolve();
    // A load that worked: the page is back.
    clearError(stage);
    const edits = (Array.isArray(d.edits) && d.edits.length ? d.edits : [{ file: d.file, tool: d.tool, agent: d.agent }]).filter((x) => x && x.agent && typeof x.agent.id === 'string');
    const cursorFor = (i) => (edits[i] ? cursorOf({ agent: edits[i].agent }) : null);
    const fileSay = (x) => h('span', null, code(short(x.file || 'a file', 48)));

    // The page looks the same after the edit: each editing cursor says so.
    if (!d.shot) {
      edits.forEach((x, i) => {
        const c = cursorFor(i);
        if (!c) return;
        step(c, { say: [fileSay(x), h('span', null, d.superseded ? 'no visible change before the next edit' : 'no visible change')], dwell: 300 });
        c.done = true;
      });
      return Promise.resolve();
    }
    const shotSize = d.shotSize || stage.shotSize;
    const findings = Array.isArray(d.findings) ? d.findings : stage.findings || [];
    const regions = (Array.isArray(d.changed) ? d.changed : []).filter((r) => r && r.rect && r.rect.w > 0 && r.rect.h > 0);
    const apply = (before, after, resolved) => {
      stage.shot = d.shot;
      stage.shotSize = shotSize;
      stage.findings = findings;
      stage.patches = (stage.patches || 0) + 1;
      stage.patchResolved = (stage.patchResolved || 0) + resolved.length;
      if (stage !== current) {
        stage.spots = null;
        return;
      }
      if (shotSize) ui.inner.style.aspectRatio = `${shotSize.width} / ${shotSize.height}`;
      showPicture(stage);
      remark(stage, before, after);
      drawCounts();
    };

    // While the stream replays, on a stage not shown, or with no picture size: straight to the new picture.
    if (replaying || stage !== current || !stage.shotSize || !shotSize) {
      const { before, after, resolved } = compare(stage, findings, shotSize);
      for (const { spot } of resolved) spot.el?.remove();
      apply(before, after, resolved);
      return Promise.resolve();
    }

    return new Promise((done) => {
      const pre = new Image();
      pre.onload = pre.onerror = () => run();
      pre.src = shotUrl(d.shot);
      function run() {
        const { before, after, resolved } = compare(stage, findings, shotSize);
        const waiting = new Set(resolved.map((x) => x.spot));
        const boxes = [];
        let ended = false;
        const end = () => {
          if (ended) return;
          ended = true;
          clearTimeout(guard);
          for (const spot of waiting) settle(spot);
          apply(before, after, resolved);
          // The boxes stay a moment over the settled picture, then fade.
          setTimeout(() => {
            for (const b of boxes) b.setAttribute('data-out', '');
            setTimeout(() => boxes.forEach((b) => b.remove()), reducedMotion.matches ? 0 : FADE_MS);
          }, reducedMotion.matches ? 0 : FADE_MS + 300);
          done();
        };
        const guard = setTimeout(end, PATCH_WAIT);

        // The regions of each edit, in the order the hub found them (top to bottom).
        const groups = new Map();
        for (const r of regions) {
          const i = Number.isInteger(r.edit) && edits[r.edit] ? r.edit : edits.length - 1;
          if (!groups.has(i)) groups.set(i, []);
          groups.get(i).push(r);
        }
        // A new picture with no region to show (nothing to compare with yet): each editing cursor says the page changed.
        if (!groups.size) {
          let left = edits.length;
          if (!left) return end();
          edits.forEach((x, i) => {
            const c = cursorFor(i);
            step(c, {
              anchor: { stage: { x: 40, y: 40 } },
              say: [fileSay(x), h('span', null, 'the page changed')],
              arrive: () => {
                c.done = true;
                if (--left === 0) end();
              },
            });
          });
          return undefined;
        }
        let left = groups.size;
        for (const [i, list] of groups) {
          const c = cursorFor(i);
          follow = c;
          list.forEach((r) => {
            const box = patchBox(stage, r, shotUrl(d.shot), shotSize.width, c.agent.color);
            if (!box) return;
            ui.patches.append(box);
            boxes.push(box);
            const w = Math.round(Math.min(r.rect.w, stage.shotSize.width - Math.max(0, r.rect.x)));
            const ht = Math.round(Math.min(r.rect.h, stage.shotSize.height - Math.max(0, r.rect.y)));
            step(c, {
              anchor: { stage: { x: r.rect.x + Math.min(r.rect.w / 2, 80), y: r.rect.y + Math.min(r.rect.h / 2, 40) } },
              say: [fileSay(edits[i]), h('span', null, `${r.kind || 'changed'} `, code(short(r.label || '', 40)), ` ${w} x ${ht}`), r.guessed ? h('span', null, 'matched to this edit by file name') : null],
              arrive: () => {
                box.setAttribute('data-on', '');
                for (const spot of waiting) {
                  if (!overlaps(spot.rect, r.rect)) continue;
                  waiting.delete(spot);
                  settle(spot);
                }
              },
              dwell: PATCH_DWELL,
            });
          });
          step(c, {
            arrive: () => {
              c.done = true;
              if (--left === 0) end();
            },
            dwell: 0,
          });
        }
        return undefined;
      }
    });
  }

  // ---- the stream ----
  if (!key) {
    ui.status.textContent = 'No key in this address';
    ui.empty.replaceChildren(h('p', { class: 'empty-lead' }, 'Open the address taster watch printed.'), h('p', null, 'It ends in #k= followed by the key that lets this page read the stream.'));
    return;
  }
  const source = new EventSource(`/events?k=${encodeURIComponent(key)}`);
  source.onopen = () => {
    replaying = true;
    ui.status.textContent = 'Live';
  };
  source.onerror = () => {
    ui.status.textContent = source.readyState === EventSource.CLOSED ? 'Disconnected' : 'Reconnecting';
  };
  source.addEventListener('replayed', () => {
    replaying = false;
  });
  source.onmessage = (m) => {
    let e;
    try {
      e = JSON.parse(m.data);
    } catch {
      return;
    }
    if (!e || typeof e !== 'object' || !e.agent || typeof e.type !== 'string') return;
    try {
      onEvent(e);
    } catch (err) {
      // One odd event must not stop the page; the console says which.
      console.warn('taster watch: could not draw', e.type, err);
    }
  };
})();
