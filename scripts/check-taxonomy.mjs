// Enforces data/taxonomy/taxonomy.json: schema, family partition, exclusive decision key, boundaries, coverage of rules,
// patterns and registry, axes, constraints and the balance function. Prints TAXONOMY OK on success.
//
// Three layers:
//   1. checkTaxonomy(tax, ctx) returns coded errors for one taxonomy object. The repository taxonomy must return none.
//   2. Every file in data/taxonomy/fixtures/broken/ patches a copy of the taxonomy into a known broken state, and
//      checkTaxonomy must report the code that file expects (negative controls: the checker can still fail).
//   3. data/taxonomy/fixtures/parts.json classifies generic UI parts through the decision key, and a seeded sweep calls
//      balance() and checks every result is valid, snapped, deterministic and minimal.
// Also run from scripts/validate.mjs, so CI fails on any of it.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readJson, loadPatterns } from './lib.mjs';
import { validateSchema } from './schema-lite.mjs';
import { createClassifier } from '../data/taxonomy/classify.mjs';
import { createAxes } from '../data/taxonomy/axes.mjs';

const EPS = 1e-9;

export function loadContext() {
  const tokens = fs.readFileSync(path.join(ROOT, 'packages/registry/src/tokens.css'), 'utf8');
  // The first top-level block whose selector list names :root (it is `:root, .theme-dark` since the theme scopes).
  const rootBlock = tokens.match(/^:root(?:\s*,[^{]*)?\{([\s\S]*?)\n\}/m);
  return {
    schema: readJson('data/taxonomy/taxonomy.schema.json'),
    patterns: loadPatterns().map((p) => p.data).filter(Boolean),
    registry: readJson('packages/registry/registry.json').components,
    rules: readJson('data/rules/rules.json').rules,
    tokenVars: new Set([...(rootBlock ? rootBlock[1] : '').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
    parts: readJson('data/taxonomy/fixtures/parts.json').parts,
  };
}

// Categories with no registry component and fewer than two patterns: where the component agents add next.
export function computeGaps(tax, ctx) {
  return tax.categories
    .map((c) => ({
      category: c.id,
      patterns: ctx.patterns.filter((p) => p.category === c.id).length,
      components: ctx.registry.filter((r) => r.category === c.id).length,
    }))
    .filter((g) => g.components === 0 && g.patterns < 2);
}

const norm = (s) => s.trim().toLowerCase();

export function checkTaxonomy(tax, ctx) {
  const errors = [];
  const err = (code, msg) => errors.push({ code, msg });

  // 1. Schema. Later checks assume the shape, so stop here if it is wrong.
  for (const e of validateSchema(ctx.schema, tax)) err('SCHEMA', e);
  if (errors.length) return errors;

  // 2. Ids are unique within their kind.
  const kinds = { family: tax.families, category: tax.categories, use: tax.uses, surface: tax.surfaces, feature: tax.features, axis: tax.axes, constraint: tax.constraints };
  for (const [kind, list] of Object.entries(kinds)) {
    const seen = new Set();
    for (const x of list) { if (seen.has(x.id)) err('DUP_ID', `duplicate ${kind} id ${x.id}`); seen.add(x.id); }
    for (const field of ['name', 'name_ko']) {
      const names = list.map((x) => x[field]).filter(Boolean).map(norm);
      if (new Set(names).size !== names.length) err('DUP_ID', `two ${kind} nodes share a ${field}`);
    }
  }
  const catIds = new Set(tax.categories.map((c) => c.id));
  const famIds = new Set(tax.families.map((f) => f.id));
  const useIds = new Set(tax.uses.map((u) => u.id));
  const surfIds = new Set(tax.surfaces.map((s) => s.id));
  const featIds = new Set(tax.features.map((f) => f.id));
  const axisIds = new Set(tax.axes.map((a) => a.id));
  const ruleIds = new Set(ctx.rules.map((r) => r.id));

  // 3. Families partition the categories exactly.
  for (const f of tax.families) for (const c of f.categories) if (!catIds.has(c)) err('UNKNOWN', `family ${f.id} lists unknown category ${c}`);
  for (const c of tax.categories) {
    const owners = tax.families.filter((f) => f.categories.includes(c.id)).map((f) => f.id);
    if (owners.length === 0) err('ORPHAN', `category ${c.id} is in no family`);
    if (owners.length > 1) err('OVERLAP', `category ${c.id} is in ${owners.length} families: ${owners.join(', ')}`);
    if (!famIds.has(c.family)) err('UNKNOWN', `category ${c.id} has unknown family ${c.family}`);
    else if (owners.length === 1 && owners[0] !== c.family) err('PARTITION', `category ${c.id} says family ${c.family} but is listed under ${owners[0]}`);
  }

  // 4. Boundaries: no example or include is claimed by two nodes of one kind, and every exclusion points to a real
  //    other node of the same kind.
  for (const [kind, list] of [['family', tax.families], ['category', tax.categories], ['use', tax.uses], ['surface', tax.surfaces]]) {
    for (const field of ['examples', 'includes']) {
      const owner = new Map();
      for (const n of list) for (const t of n[field]) {
        const k = norm(t);
        if (owner.has(k) && owner.get(k) !== n.id) err('OVERLAP', `${kind} ${field} "${t}" is claimed by ${owner.get(k)} and ${n.id}`);
        owner.set(k, n.id);
      }
    }
    const ids = new Set(list.map((n) => n.id));
    for (const n of list) for (const e of n.excludes) {
      if (e.goes_to === n.id) err('DANGLING', `${kind} ${n.id} excludes "${e.what}" to itself`);
      else if (!ids.has(e.goes_to)) err('DANGLING', `${kind} ${n.id} excludes "${e.what}" to unknown ${kind} ${e.goes_to}`);
    }
  }

  // 5. Decision key: known ids, no contradiction, no shadowed step, one unconditional fallback at the end,
  //    every category reachable, every feature read.
  const steps = tax.classify;
  steps.forEach((s, i) => {
    if (!catIds.has(s.category)) err('UNKNOWN', `classify step ${i} ends in unknown category ${s.category}`);
    for (const f of [...s.all, ...s.none]) if (!featIds.has(f)) err('UNKNOWN', `classify step ${i} reads unknown feature ${f}`);
    if (s.all.some((f) => s.none.includes(f))) err('DEAD_STEP', `classify step ${i} requires and forbids the same feature`);
    const empty = s.all.length === 0 && s.none.length === 0;
    const last = i === steps.length - 1;
    if (last && !(empty && s.fallback === true)) err('FALLBACK', 'the last classify step must have no conditions and fallback: true');
    if (!last && (empty || s.fallback)) err('FALLBACK', `classify step ${i} is unconditional but not last`);
    for (let j = 0; j < i; j++) {
      const p = steps[j];
      if (p.all.length + p.none.length === 0) continue;
      if (p.all.every((f) => s.all.includes(f)) && p.none.every((f) => s.none.includes(f))) {
        err('DEAD_STEP', `classify step ${i} (${s.category}) can never fire: step ${j} (${p.category}) always matches first`);
        break;
      }
    }
  });
  const reachable = new Set(steps.filter((s) => !s.fallback).map((s) => s.category));
  for (const c of tax.categories) if (!reachable.has(c.id)) err('UNREACHABLE', `no classify step returns category ${c.id}`);
  const read = new Set(steps.flatMap((s) => [...s.all, ...s.none]));
  for (const f of tax.features) if (!read.has(f.id)) err('ORPHAN', `feature ${f.id} is read by no classify step`);

  // 6. Uses and surfaces each serve at least one pattern; patterns and components name known ids.
  for (const u of tax.uses) if (!ctx.patterns.some((p) => (p.uses || []).includes(u.id))) err('ORPHAN', `use ${u.id} is served by no pattern`);
  for (const s of tax.surfaces) if (!ctx.patterns.some((p) => (p.surfaces || []).includes(s.id))) err('ORPHAN', `surface ${s.id} is targeted by no pattern`);
  for (const p of ctx.patterns) {
    if (!catIds.has(p.category)) err('UNKNOWN', `pattern ${p.id} has unknown category ${p.category}`);
    for (const u of p.uses || []) if (!useIds.has(u)) err('UNKNOWN', `pattern ${p.id} has unknown use ${u}`);
    for (const s of p.surfaces || []) if (!surfIds.has(s)) err('UNKNOWN', `pattern ${p.id} has unknown surface ${s}`);
  }
  for (const c of ctx.registry) if (!catIds.has(c.category)) err('UNKNOWN', `component ${c.id} has unknown category ${c.category}`);

  // 7. Rule map: every rule, known categories and axes.
  for (const r of ctx.rules) if (!tax.ruleMap[r.id]) err('COVERAGE', `rule ${r.id} has no ruleMap entry`);
  for (const [id, m] of Object.entries(tax.ruleMap)) {
    if (!ruleIds.has(id)) err('UNKNOWN', `ruleMap names unknown rule ${id}`);
    for (const c of m.categories) if (!catIds.has(c)) err('UNKNOWN', `ruleMap ${id} names unknown category ${c}`);
    if (m.axis !== null && !axisIds.has(m.axis)) err('UNKNOWN', `ruleMap ${id} names unknown axis ${m.axis}`);
  }

  // 8. Axes: drives are real token properties, each driven by one axis only; snap steps and defaults.
  const driver = new Map();
  for (const a of tax.axes) {
    for (const v of a.drives) {
      if (!ctx.tokenVars.has(v)) err('DRIVES', `axis ${a.id} drives ${v}, which packages/registry/src/tokens.css does not define`);
      if (driver.has(v)) err('DRIVES', `${v} is driven by both ${driver.get(v)} and ${a.id}`);
      driver.set(v, a.id);
    }
    const s = tax.snap[a.id];
    if (!s) { err('COVERAGE', `axis ${a.id} has no snap steps`); continue; }
    if (s.steps.some((v, i) => i > 0 && v <= s.steps[i - 1])) err('SNAP', `snap steps of ${a.id} must ascend`);
    if (s.names.length !== s.steps.length) err('SNAP', `snap ${a.id} needs one name per step`);
    if (!s.steps.some((v) => Math.abs(v - a.default) <= EPS)) err('SNAP', `default ${a.default} of ${a.id} is not one of its steps`);
  }
  for (const k of Object.keys(tax.snap)) if (!axisIds.has(k)) err('UNKNOWN', `snap names unknown axis ${k}`);

  // 9. Relevance: exactly every category times every axis.
  for (const c of tax.categories) {
    const row = tax.relevance[c.id];
    if (!row) { err('COVERAGE', `relevance has no row for ${c.id}`); continue; }
    for (const a of tax.axes) if (row[a.id] === undefined) err('COVERAGE', `relevance ${c.id} has no value for axis ${a.id}`);
    for (const k of Object.keys(row)) if (!axisIds.has(k)) err('UNKNOWN', `relevance ${c.id} names unknown axis ${k}`);
  }
  for (const k of Object.keys(tax.relevance)) if (!catIds.has(k)) err('UNKNOWN', `relevance names unknown category ${k}`);

  // 10. Constraints: known axes and rules; each prevented rule is mapped to one of the constraint's axes.
  for (const c of tax.constraints) {
    for (const a of Object.keys(c.terms)) if (!axisIds.has(a)) err('UNKNOWN', `constraint ${c.id} uses unknown axis ${a}`);
    for (const r of c.prevents) {
      if (!ruleIds.has(r)) err('UNKNOWN', `constraint ${c.id} prevents unknown rule ${r}`);
      else if (tax.ruleMap[r] && !(tax.ruleMap[r].axis in c.terms)) err('RULEMAP', `constraint ${c.id} prevents ${r}, but ruleMap maps ${r} to axis ${tax.ruleMap[r].axis}`);
    }
  }
  const shapeOk = !errors.some((e) => ['UNKNOWN', 'COVERAGE', 'SNAP'].includes(e.code));

  // 11. Satisfiability on the snapped grid: defaults hold, some setting exists, and every step of every axis
  //     can be used (a step no balanced setting can reach is an ambiguity of its own).
  if (shapeOk) {
    const ax = createAxes(tax);
    const atDefaults = ax.validateAxes(ax.defaults).filter((v) => v.code === 'constraint');
    for (const v of atDefaults) err('DEFAULTS', `defaults break ${v.constraint}`);
    try {
      ax.balance(ax.defaults, null);
      for (const a of tax.axes) for (const v of ax.steps[a.id]) {
        const r = ax.balance({ ...ax.defaults, [a.id]: v }, a.id);
        if (Math.abs(r[a.id] - v) > EPS) err('UNSAT', `step ${v} of ${a.id} cannot be combined with any setting of the other axes`);
      }
    } catch (e) {
      err('UNSAT', `no snapped setting satisfies every constraint (${e.message})`);
    }
  }

  // 12. Gaps are current.
  const gaps = computeGaps(tax, ctx);
  if (JSON.stringify(gaps) !== JSON.stringify(tax.gaps)) err('GAPS', `gaps out of date (run node scripts/build-docs.mjs): expected ${JSON.stringify(gaps)}`);

  // 13. Fixture parts classify exactly, through specific steps only.
  if (ctx.parts && !errors.some((e) => e.code === 'UNKNOWN' && e.msg.startsWith('classify'))) {
    const classify = createClassifier(tax);
    for (const p of ctx.parts) {
      let r;
      try { r = classify(p.features); } catch (e) { err('FIXTURE', `${p.part}: ${e.message}`); continue; }
      if (r.fallback) err('FIXTURE', `"${p.part}" reached the fallback step`);
      else if (r.category !== p.expect) err('FIXTURE', `"${p.part}" classified as ${r.category}, expected ${p.expect}`);
    }
  }
  return errors;
}

export function applyPatch(doc, patch) {
  const out = structuredClone(doc);
  const match = (arr, m) => {
    const i = arr.findIndex((x) => Object.entries(m).every(([k, v]) => x?.[k] === v));
    if (i < 0) throw new Error(`patch target not found: ${JSON.stringify(m)}`);
    return i;
  };
  const key = (parent, seg) => (seg !== null && typeof seg === 'object' ? match(parent, seg) : seg);
  for (const op of patch) {
    let parent = out;
    for (const seg of op.path.slice(0, -1)) parent = parent[key(parent, seg)];
    const last = key(parent, op.path.at(-1));
    if (op.op === 'set') parent[last] = op.value;
    else if (op.op === 'push') parent[last].push(op.value);
    else if (op.op === 'delete') Array.isArray(parent) ? parent.splice(last, 1) : delete parent[last];
    else if (op.op === 'insert') { const arr = parent[last]; arr.splice(match(arr, op.after) + 1, 0, op.value); }
    else throw new Error(`unknown patch op ${op.op}`);
  }
  return out;
}

// Seeded PRNG so the sweep is the same on every run.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sweepBalance(tax) {
  const errors = [];
  const ax = createAxes(tax);
  const ids = ax.axes;
  // Every feasible point of the snapped grid, for brute force minimality checks.
  const feasible = [];
  (function grid(i, cur) {
    if (i === ids.length) { if (!ax.validateAxes(cur).length) feasible.push({ ...cur }); return; }
    for (const v of ax.steps[ids[i]]) { cur[ids[i]] = v; grid(i + 1, cur); }
  })(0, {});
  const rand = mulberry32(20261102);
  const randomSetting = (onGrid) => Object.fromEntries(ids.map((id) => {
    const st = ax.steps[id];
    return [id, onGrid ? st[Math.floor(rand() * st.length)] : Math.round(rand() * 100) / 100];
  }));
  let calls = 0, brute = 0;
  for (let b = 0; b < 40; b++) {
    const base = randomSetting(b % 2 === 0);
    for (const a of ids) {
      for (const v of ax.steps[a]) {
        const input = { ...base, [a]: v };
        const r = ax.balance(input, a);
        const r2 = ax.balance(input, a);
        calls += 2;
        const bad = ax.validateAxes(r);
        if (bad.length) errors.push(`balance(${JSON.stringify(input)}, ${a}) returned an invalid setting: ${bad.map((x) => x.code + ' ' + (x.constraint || x.axis)).join(', ')}`);
        if (JSON.stringify(r) !== JSON.stringify(r2)) errors.push(`balance is not deterministic for ${JSON.stringify(input)}`);
        if (Math.abs(r[a] - v) > EPS) errors.push(`balance moved the changed axis ${a} from ${v} to ${r[a]}`);
        if (b < 6) {
          const start = Object.fromEntries(ids.map((id) => [id, ax.snapValue(id, input[id])]));
          const cost = (s) => ids.reduce((sum, id) => sum + (id === a ? 0 : Math.abs(s[id] - start[id])), 0);
          const best = Math.min(...feasible.filter((s) => Math.abs(s[a] - v) <= EPS).map(cost));
          if (cost(r) > best + EPS) errors.push(`balance(${JSON.stringify(input)}, ${a}) moved ${cost(r)}, brute force finds ${best}`);
          brute++;
        }
      }
    }
  }
  for (let k = 0; k < 200; k++) {
    const input = randomSetting(false);
    const r = ax.balance(input, null);
    calls++;
    if (ax.validateAxes(r).length) errors.push(`balance(${JSON.stringify(input)}) without a changed axis returned an invalid setting`);
  }
  return { errors, calls, brute, feasible: feasible.length };
}

export function runAll() {
  const ctx = loadContext();
  const tax = readJson('data/taxonomy/taxonomy.json');
  const errors = checkTaxonomy(tax, ctx).map((e) => `${e.code} ${e.msg}`);

  // Fixture coverage: enough parts, every category, every specific step.
  const classify = createClassifier(tax);
  if (ctx.parts.length < 40) errors.push(`FIXTURE need at least 40 parts, have ${ctx.parts.length}`);
  const hitSteps = new Set();
  const hitCats = new Set();
  for (const p of ctx.parts) { const r = classify(p.features); hitSteps.add(r.step); hitCats.add(p.expect); }
  tax.classify.forEach((s, i) => { if (!s.fallback && !hitSteps.has(i)) errors.push(`FIXTURE no part reaches classify step ${i} (${s.category})`); });
  for (const c of tax.categories) if (!hitCats.has(c.id)) errors.push(`FIXTURE no part expects category ${c.id}`);

  // Negative controls.
  const dir = path.join(ROOT, 'data/taxonomy/fixtures/broken');
  const broken = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const f of broken) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    let got;
    try { got = checkTaxonomy(applyPatch(tax, fx.patch), ctx); } catch (e) { errors.push(`NEGATIVE ${f} crashed the checker: ${e.message}`); continue; }
    if (!got.some((e) => e.code === fx.expect)) errors.push(`NEGATIVE ${f} expected ${fx.expect}, got ${got.map((e) => e.code).join(', ') || 'no errors'}`);
  }

  const sweep = errors.length ? { errors: [], calls: 0, brute: 0, feasible: 0 } : sweepBalance(tax);
  for (const e of sweep.errors) errors.push(`BALANCE ${e}`);
  return {
    errors,
    summary: `categories=${tax.categories.length} families=${tax.families.length} features=${tax.features.length} steps=${tax.classify.length} parts=${ctx.parts.length} negatives=${broken.length} axes=${tax.axes.length} constraints=${tax.constraints.length} feasible=${sweep.feasible} balance_calls=${sweep.calls} brute_checked=${sweep.brute} gaps=${tax.gaps.length}`,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { errors, summary } = runAll();
  if (errors.length) {
    console.log(errors.slice(0, 80).join('\n'));
    console.log(`TAXONOMY FAIL ${errors.length}`);
    process.exit(1);
  }
  console.log(`TAXONOMY OK ${summary}`);
}
