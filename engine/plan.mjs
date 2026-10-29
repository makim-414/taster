// The step by step plan: one screen (or one part of a screen) at a time, shown to the builder, built only after an
// explicit OK, and checked (zero detector findings, zero drift against the system and the screens already checked)
// before the next one starts. The plan lives in taster.plan.json next to the work.
//
// {
//   "version": 1,
//   "route": "swap" | "rebuild" | "build",
//   "system": "theme.css" | ["tokens.css", "theme.css"] | null,
//   "screens": [
//     { "id": "home", "source": "https://example.com/", "output": "home.html" | null, "purpose": "...",
//       "parts": [ { "id": "hero", "purpose": "...", "status": "planned" } ],
//       "status": "planned" | "proposed" | "approved" | "built" | "checked", "notes": "" }
//   ]
// }
//
// Paths in the plan are relative to the plan file.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkConsistency } from './consistency.mjs';
import { diagnose } from './diagnose.mjs';

export const PLAN_VERSION = 1;
export const PLAN_FILE = 'taster.plan.json';
export const ROUTES = ['swap', 'rebuild', 'build'];
export const STATUSES = ['planned', 'proposed', 'approved', 'built', 'checked'];
export const EVENTS = ['propose', 'revise', 'approve', 'build', 'check'];

const ASSET = /\.(pdf|png|jpe?g|gif|webp|svg|zip|mp4|mov|mp3|json|xml|txt|css|js)$/i;
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

function pageKey(href) {
  try {
    const u = new URL(href);
    u.hash = '';
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.href;
  } catch {
    return null;
  }
}

function sameSite(a, b) {
  const [x, y] = [new URL(a), new URL(b)];
  if (x.protocol === 'file:' || y.protocol === 'file:') return x.protocol === y.protocol && dirname(x.pathname) === dirname(y.pathname);
  return x.origin === y.origin;
}

function idFor(href) {
  const u = new URL(href);
  const path = u.protocol === 'file:' ? u.pathname.split('/').pop().replace(/\.[a-z0-9]+$/i, '') : u.pathname.replace(/\.[a-z0-9]+$/i, '');
  const id = slug(path.replace(/\//g, ' '));
  return !id || id === 'index' ? 'home' : id;
}

// A path as the plan stores it: relative to the plan's folder, unless the two only meet at the filesystem root.
export function planRelative(baseDir, file) {
  const [from, to] = [resolve(baseDir), resolve(file)];
  const rel = relative(from, to).split('\\').join('/');
  const ups = rel.split('/').filter((x) => x === '..').length;
  return ups && ups >= from.split(/[\\/]/).filter(Boolean).length ? to : rel;
}

function sourceFor(href, baseDir) {
  if (!href.startsWith('file:') || !baseDir) return href;
  return planRelative(baseDir, fileURLToPath(href));
}

function partsFrom(content) {
  const seen = new Map();
  return (content.sections || [])
    .filter((s) => s.heading)
    .map((s) => {
      let id = slug(s.heading.text) || 'part';
      const n = (seen.get(id) || 0) + 1;
      seen.set(id, n);
      if (n > 1) id = `${id}-${n}`;
      return { id, purpose: s.heading.text, status: 'planned' };
    });
}

// Builds the screen list from extract_content output: the start page first, then every same-site page its nav links
// to, in nav order. Pass several contents (one per screen already read) to plan them all. Purposes are drafts from
// the page's h1 or the nav label; confirm them with the builder when you propose each screen.
export function planFromExtract(contents, { route = 'rebuild', system = null, byPart = false, baseDir = null } = {}) {
  const list = (Array.isArray(contents) ? contents : [contents]).filter(Boolean);
  if (!list.length) throw new Error('planFromExtract needs at least one extract_content result');
  if (!ROUTES.includes(route)) throw new Error(`route must be one of ${ROUTES.join(', ')}`);
  const start = list[0].url;
  if (!pageKey(start)) throw new Error('The first content has no url');
  const screens = [];
  const keys = new Set();
  const ids = new Map();
  const add = (href, purpose, how, content) => {
    const key = pageKey(href);
    if (!key || keys.has(key)) return;
    keys.add(key);
    let id = idFor(key);
    const n = (ids.get(id) || 0) + 1;
    ids.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    screens.push({
      id,
      source: sourceFor(key, baseDir),
      output: null,
      purpose: purpose || id,
      parts: byPart && content ? partsFrom(content) : [],
      status: 'planned',
      notes: `Purpose drafted from ${how}; confirm it with the builder.`,
    });
  };
  for (const c of list) {
    const h1 = (c.sections || []).find((s) => s.heading && s.heading.level === 1);
    add(c.url, h1 ? h1.heading.text : c.title, h1 ? 'the page h1' : 'the page title', c);
  }
  for (const c of list) {
    for (const link of c.nav || []) {
      if (!link.href || !/^(https?|file):/i.test(link.href) || ASSET.test(new URL(link.href).pathname)) continue;
      if (!sameSite(start, link.href)) continue;
      add(link.href, link.text, `the nav link "${link.text}"`, null);
    }
  }
  return validatePlan({ version: PLAN_VERSION, route, system, screens });
}

// Throws one error listing every problem, else returns the plan.
export function validatePlan(plan) {
  const errs = [];
  if (!plan || typeof plan !== 'object') throw new Error('The plan is not an object');
  if (plan.version !== PLAN_VERSION) errs.push(`version must be ${PLAN_VERSION}`);
  if (!ROUTES.includes(plan.route)) errs.push(`route must be one of ${ROUTES.join(', ')}`);
  const sys = plan.system;
  if (!(sys === null || typeof sys === 'string' || (Array.isArray(sys) && sys.length && sys.every((s) => typeof s === 'string')))) errs.push('system must be a path, a list of paths, or null');
  if (!Array.isArray(plan.screens) || !plan.screens.length) errs.push('screens must be a non-empty list');
  const ids = new Set();
  let open = -1;
  (plan.screens || []).forEach((s, i) => {
    const at = `screens[${i}]${s && s.id ? ` (${s.id})` : ''}`;
    if (!s || typeof s !== 'object') return errs.push(`${at} is not an object`);
    if (typeof s.id !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(s.id)) errs.push(`${at}: id must be a short slug`);
    if (ids.has(s.id)) errs.push(`${at}: id repeats`);
    ids.add(s.id);
    if (!(s.source === null || typeof s.source === 'string')) errs.push(`${at}: source must be a URL, a path or null`);
    if (!(s.output === undefined || s.output === null || typeof s.output === 'string')) errs.push(`${at}: output must be a URL, a path or null`);
    if (typeof s.purpose !== 'string' || !s.purpose.trim()) errs.push(`${at}: purpose is required`);
    if (!STATUSES.includes(s.status)) errs.push(`${at}: status must be one of ${STATUSES.join(', ')}`);
    if (!(s.notes === undefined || typeof s.notes === 'string')) errs.push(`${at}: notes must be text`);
    if (!Array.isArray(s.parts)) errs.push(`${at}: parts must be a list`);
    const pids = new Set();
    let partOpen = -1;
    (s.parts || []).forEach((p, j) => {
      const pat = `${at}.parts[${j}]`;
      if (!p || typeof p.id !== 'string' || !p.id) return errs.push(`${pat}: id is required`);
      if (pids.has(p.id)) errs.push(`${pat}: id repeats`);
      pids.add(p.id);
      if (!STATUSES.includes(p.status)) errs.push(`${pat}: status must be one of ${STATUSES.join(', ')}`);
      if (p.status !== 'checked' && partOpen === -1) partOpen = j;
      else if (partOpen !== -1 && p.status !== 'planned') errs.push(`${pat}: is ${p.status} while an earlier part is not checked`);
      if (p.status !== 'planned' && s.status !== 'approved' && s.status !== 'built' && s.status !== 'checked') errs.push(`${pat}: is ${p.status} before the screen plan was approved`);
    });
    if (s.parts && s.parts.length && (s.status === 'built' || s.status === 'checked') && s.parts.some((p) => p.status !== 'checked')) errs.push(`${at}: is ${s.status} with parts not checked`);
    // Only one screen is ever in progress, and every screen before it is checked.
    if (s.status !== 'checked' && open === -1) open = i;
    else if (open !== -1 && s.status !== 'planned') errs.push(`${at}: is ${s.status} while an earlier screen (${plan.screens[open].id}) is not checked`);
  });
  if (errs.length) throw new Error(`Invalid plan:\n- ${errs.join('\n- ')}`);
  return plan;
}

function active(plan) {
  const screen = plan.screens.find((s) => s.status !== 'checked') || null;
  const part = screen && screen.status === 'approved' ? screen.parts.find((p) => p.status !== 'checked') || null : null;
  return { screen, part };
}

const progress = (plan) => ({ checked: plan.screens.filter((s) => s.status === 'checked').length, total: plan.screens.length });

// Exactly one next action. It never says build before the builder approved, and never moves to a new screen or part
// before the current one is checked.
export function nextStep(plan) {
  validatePlan(plan);
  const { screen, part } = active(plan);
  const base = { progress: progress(plan) };
  if (!screen) return { ...base, action: 'done', screen: null, part: null, say: 'Every screen is built and checked against the system and the other screens. Show the builder the finished set.' };
  const name = `screen "${screen.id}" (${screen.purpose})`;
  const checkedIds = plan.screens.filter((s) => s.status === 'checked').map((s) => s.id);
  const checkSay = (what) =>
    `Check ${what}: diagnose it at 1440 and 390 (zero measured findings), then check_consistency against ${checkedIds.length ? `the checked screens (${checkedIds.join(', ')})` : 'no other screen yet'}${plan.system ? ' and the system' : ''} (zero drift, zero off-system values). Record it with plan_update { type: "check" }; fix and check again until both are zero.`;
  if (screen.status === 'planned') {
    return { ...base, action: 'propose', screen: screen.id, part: null, say: `Propose ${name} to the builder: what it is for, the uses it serves in order, the pattern and components for each, and${screen.parts.length ? ' the parts you will build one at a time' : ' whether to build it whole or part by part'}. Show it, record plan_update { type: "propose" }, and stop until they answer.` };
  }
  if (screen.status === 'proposed') {
    return { ...base, action: 'wait', screen: screen.id, part: null, waitingFor: 'builder', say: `Wait for the builder to approve ${name}. Do not build. When they say yes, record plan_update { type: "approve", note: "<their words>" }; when they ask for changes, record { type: "revise", note } and propose again.` };
  }
  if (screen.status === 'approved' && part) {
    const pname = `part "${part.id}" (${part.purpose}) of screen "${screen.id}"`;
    if (part.status === 'planned') return { ...base, action: 'propose', screen: screen.id, part: part.id, say: `Propose ${pname}: the pattern, the components and the content it keeps. Show it, record plan_update { type: "propose", part: "${part.id}" }, and stop until the builder answers.` };
    if (part.status === 'proposed') return { ...base, action: 'wait', screen: screen.id, part: part.id, waitingFor: 'builder', say: `Wait for the builder to approve ${pname}. Do not build. Record { type: "approve", part: "${part.id}", note: "<their words>" } on yes, { type: "revise" } on changes.` };
    if (part.status === 'approved') return { ...base, action: 'build', screen: screen.id, part: part.id, say: `Build ${pname} from the approved pattern and the system tokens only, then record { type: "build", part: "${part.id}", output: "<file or URL of the screen>" }.` };
    return { ...base, action: 'check', screen: screen.id, part: part.id, against: checkedIds, system: plan.system, say: checkSay(pname) };
  }
  if (screen.status === 'approved') return { ...base, action: 'build', screen: screen.id, part: null, say: `Build ${name} as approved, from the system tokens and the components the proposal named, then record plan_update { type: "build", output: "<file or URL>" }.` };
  return { ...base, action: 'check', screen: screen.id, part: null, against: checkedIds, system: plan.system, say: checkSay(name) };
}

const addNote = (unit, line) => {
  unit.notes = unit.notes ? `${unit.notes}\n${line}` : line;
};
const normParts = (parts) => {
  if (!Array.isArray(parts)) throw new Error('parts must be a list of names or { id, purpose }');
  const ids = new Set();
  return parts.map((p) => {
    const purpose = typeof p === 'string' ? p : p && p.purpose;
    const id = (p && typeof p === 'object' && p.id) || slug(purpose);
    if (!id || !purpose) throw new Error('every part needs a purpose');
    if (ids.has(id)) throw new Error(`part id repeats: ${id}`);
    ids.add(id);
    return { id, purpose, status: 'planned' };
  });
};

// Moves one screen or part one step. Returns a new plan; throws on any step the order does not allow.
export function applyStep(plan, event) {
  validatePlan(plan);
  const e = event || {};
  if (!EVENTS.includes(e.type)) throw new Error(`Unknown event "${e.type}". Events: ${EVENTS.join(', ')}`);
  const next = structuredClone(plan);
  const { screen: current } = active(next);
  if (!current) throw new Error('Every screen is already checked; the plan is done');
  const screen = next.screens.find((s) => s.id === e.screen);
  if (!screen) throw new Error(`No screen "${e.screen}" in the plan`);
  if (screen.status === 'checked') throw new Error(`Screen "${screen.id}" is already checked`);
  if (screen !== current) throw new Error(`Screen "${screen.id}" has to wait: "${current.id}" is ${current.status} and must be checked first (one screen at a time)`);

  let unit = screen;
  if (e.part != null) {
    if (!screen.parts.length) throw new Error(`Screen "${screen.id}" has no parts; step the whole screen`);
    if (screen.status !== 'approved') throw new Error(`Screen "${screen.id}" is ${screen.status}; the builder approves the screen plan before any part starts`);
    const part = screen.parts.find((p) => p.id === e.part);
    if (!part) throw new Error(`Screen "${screen.id}" has no part "${e.part}"`);
    const open = screen.parts.find((p) => p.status !== 'checked');
    if (part.status === 'checked') throw new Error(`Part "${part.id}" is already checked`);
    if (part !== open) throw new Error(`Part "${part.id}" has to wait: "${open.id}" is ${open.status} and must be checked first (one part at a time)`);
    unit = part;
  } else if (screen.parts.length && screen.status === 'approved' && ['build', 'check', 'approve', 'propose', 'revise'].includes(e.type)) {
    throw new Error(`Screen "${screen.id}" is built part by part; send the event for its next part ("${screen.parts.find((p) => p.status !== 'checked').id}")`);
  }

  const label = unit === screen ? `Screen "${screen.id}"` : `Part "${unit.id}"`;
  const need = (status) => {
    if (unit.status !== status) throw new Error(`${label} is ${unit.status}; "${e.type}" needs it ${status}`);
  };
  switch (e.type) {
    case 'propose':
      need('planned');
      if (unit === screen) {
        if (e.purpose) screen.purpose = String(e.purpose);
        if (e.parts) screen.parts = normParts(e.parts);
      }
      unit.status = 'proposed';
      if (e.note) addNote(unit, `proposed: ${e.note}`);
      break;
    case 'revise':
      need('proposed');
      unit.status = 'planned';
      addNote(unit, `builder asked for changes${e.note ? `: ${e.note}` : ''}`);
      break;
    case 'approve':
      need('proposed');
      if (!e.note || !String(e.note).trim()) throw new Error(`${label}: approve needs the builder's own words in note, so the OK is on record`);
      unit.status = 'approved';
      addNote(unit, `approved by the builder: ${e.note}`);
      break;
    case 'build':
      // Built again after a failed check records the new output; the check still has to pass.
      if (unit.status !== 'built') need('approved');
      if (e.output) screen.output = String(e.output);
      unit.status = 'built';
      if (e.note) addNote(unit, `built: ${e.note}`);
      break;
    case 'check': {
      need('built');
      for (const k of ['findings', 'drift']) if (!Number.isInteger(e[k]) || e[k] < 0) throw new Error(`${label}: check needs ${k} as a count (run diagnose and check_consistency, or let plan_update run them)`);
      if (e.findings || e.drift) throw new Error(`${label} is not clean: ${e.findings} detector findings, ${e.drift} consistency findings. Fix them and check again`);
      unit.status = 'checked';
      addNote(unit, `checked: 0 findings, 0 drift${e.note ? `; ${e.note}` : ''}`);
      if (unit !== screen && screen.parts.every((p) => p.status === 'checked')) {
        screen.status = 'built';
        addNote(screen, 'every part checked; check the whole screen next');
      }
      break;
    }
    default:
      throw new Error(`Unknown event ${e.type}`);
  }
  return validatePlan(next);
}

// ---- files ----

export function planPath(path) {
  return existsSync(path) && statSync(path).isDirectory() ? join(path, PLAN_FILE) : path;
}
export function readPlan(path) {
  const file = planPath(path);
  if (!existsSync(file)) throw new Error(`No plan at ${file}`);
  return validatePlan(JSON.parse(readFileSync(file, 'utf8')));
}
export function writePlan(path, plan) {
  validatePlan(plan);
  const file = planPath(path);
  writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
  return file;
}

const located = (target, baseDir) => (/^(https?|file):/i.test(target) || isAbsolute(target) || !baseDir ? target : join(baseDir, target));

// Runs the check for the screen in progress: diagnose its output at both widths, and compare it with the screens
// already checked and with the plan's system. Returns the counts applyStep needs plus both reports.
export async function checkScreen(plan, screenId, { baseDir = null } = {}) {
  validatePlan(plan);
  const screen = plan.screens.find((s) => s.id === screenId);
  if (!screen) throw new Error(`No screen "${screenId}" in the plan`);
  const target = screen.output || (plan.route === 'swap' ? screen.source : null);
  if (!target) throw new Error(`Screen "${screen.id}" has no output yet; record it with { type: "build", output }`);
  const report = await diagnose(located(target, baseDir));
  const others = plan.screens.filter((s) => s.status === 'checked' && s.id !== screen.id && (s.output || (plan.route === 'swap' && s.source)));
  const system = plan.system ? (Array.isArray(plan.system) ? plan.system : [plan.system]).map((p) => located(p, baseDir)) : null;
  let consistency = null;
  if (others.length || system) {
    const screens = [...others, screen].map((s) => ({ id: s.id, source: located(s.output || s.source, baseDir) }));
    consistency = await checkConsistency(screens, { system });
    // Only what concerns this screen counts against it; the checked screens were clean when they were checked.
    const mine = (f) => (f.screen ? f.screen === screen.id : f.values.some((v) => v.screens.some((s) => s.id === screen.id)));
    consistency.drift = consistency.drift.filter(mine);
    consistency.offSystem = consistency.offSystem.filter(mine);
    consistency.findings = consistency.drift.length + consistency.offSystem.length;
    consistency.ok = consistency.findings === 0;
  }
  return {
    screen: screen.id,
    findings: report.rulesHit,
    drift: consistency ? consistency.findings : 0,
    diagnose: { url: report.url, widths: report.widths, rulesHit: report.rulesHit, rules: report.rules.map((r) => ({ ruleId: r.ruleId, name: r.name, counts: r.counts })) },
    consistency,
  };
}
