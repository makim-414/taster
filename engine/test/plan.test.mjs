import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { applyStep, nextStep, planFromExtract, validatePlan } from '../plan.mjs';

const screen = (name) => fileURLToPath(new URL(`./fixtures/screens/${name}`, import.meta.url));
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const server = fileURLToPath(new URL('../mcp.mjs', import.meta.url));

const content = {
  url: 'https://shop.example.com/',
  title: 'Shop',
  nav: [
    { text: 'Products', href: 'https://shop.example.com/products' },
    { text: 'Products again', href: 'https://shop.example.com/products/#top' },
    { text: 'About us', href: 'https://shop.example.com/about-us' },
    { text: 'Home', href: 'https://shop.example.com/#main' },
    { text: 'Elsewhere', href: 'https://other.example.org/' },
    { text: 'Mail', href: 'mailto:hello@example.com' },
    { text: 'Menu', href: null },
    { text: 'Price list', href: 'https://shop.example.com/prices.pdf' },
  ],
  sections: [
    { heading: null, text: ['top bar'] },
    { heading: { level: 1, text: 'Bags that last' } },
    { heading: { level: 2, text: 'How they are made' } },
    { heading: { level: 2, text: 'Questions' } },
  ],
};

test('planFromExtract: the start page, then same-site nav pages in nav order', () => {
  const plan = planFromExtract(content, { system: 'theme.css' });
  assert.equal(plan.version, 1);
  assert.equal(plan.route, 'rebuild');
  assert.equal(plan.system, 'theme.css');
  assert.deepEqual(plan.screens.map((s) => [s.id, s.source, s.purpose, s.status]), [
    ['home', 'https://shop.example.com/', 'Bags that last', 'planned'],
    ['products', 'https://shop.example.com/products', 'Products', 'planned'],
    ['about-us', 'https://shop.example.com/about-us', 'About us', 'planned'],
  ]);
  assert.ok(plan.screens.every((s) => s.parts.length === 0 && s.output === null && /confirm it with the builder/.test(s.notes)));
  const byPart = planFromExtract(content, { byPart: true, route: 'swap' });
  assert.deepEqual(byPart.screens[0].parts.map((p) => p.id), ['bags-that-last', 'how-they-are-made', 'questions']);
  assert.throws(() => planFromExtract(content, { route: 'redo' }), /route must be one of/);
});

const fresh = () => validatePlan({
  version: 1,
  route: 'rebuild',
  system: null,
  screens: [
    { id: 'home', source: 'https://shop.example.com/', output: null, purpose: 'Introduce the shop', parts: [], status: 'planned', notes: '' },
    { id: 'products', source: null, output: null, purpose: 'Compare the bags', parts: [], status: 'planned', notes: '' },
  ],
});
const step = (plan, ...events) => events.reduce((p, e) => applyStep(p, e), plan);
const clean = { findings: 0, drift: 0 };

test('nextStep gives one action at a time: propose, wait, build, check, then the next screen, then done', () => {
  let plan = fresh();
  const seen = [];
  const events = [
    { type: 'propose', screen: 'home' },
    { type: 'approve', screen: 'home', note: 'Yes, go ahead' },
    { type: 'build', screen: 'home', output: 'home.html' },
    { type: 'check', screen: 'home', ...clean },
    { type: 'propose', screen: 'products' },
    { type: 'approve', screen: 'products', note: 'ok' },
    { type: 'build', screen: 'products', output: 'products.html' },
    { type: 'check', screen: 'products', ...clean },
  ];
  for (const e of events) {
    const n = nextStep(plan);
    seen.push(`${n.action} ${n.screen}`);
    plan = applyStep(plan, e);
  }
  seen.push(nextStep(plan).action);
  assert.deepEqual(seen, ['propose home', 'wait home', 'build home', 'check home', 'propose products', 'wait products', 'build products', 'check products', 'done']);
  assert.match(plan.screens[0].notes, /approved by the builder: Yes, go ahead/);
  assert.equal(plan.screens[1].output, 'products.html');
  const check = nextStep(step(fresh(), events[0], events[1], events[2], events[3], events[4], events[5], events[6]));
  assert.deepEqual(check.against, ['home']);
  assert.throws(() => applyStep(plan, { type: 'propose', screen: 'home' }), /already checked/);
});

test('illegal steps throw and leave the plan as it was', () => {
  const plan = fresh();
  const proposed = step(plan, { type: 'propose', screen: 'home' });
  const approved = step(proposed, { type: 'approve', screen: 'home', note: 'yes' });
  const built = step(approved, { type: 'build', screen: 'home' });
  const cases = [
    [plan, { type: 'build', screen: 'home' }, /is planned; "build" needs it approved/],
    [proposed, { type: 'build', screen: 'home' }, /is proposed; "build" needs it approved/],
    [proposed, { type: 'approve', screen: 'home' }, /approve needs the builder's own words/],
    [plan, { type: 'approve', screen: 'home', note: 'yes' }, /is planned; "approve" needs it proposed/],
    [plan, { type: 'propose', screen: 'products' }, /"products" has to wait: "home" is planned/],
    [built, { type: 'propose', screen: 'products' }, /"products" has to wait: "home" is built and must be checked first/],
    [approved, { type: 'check', screen: 'home', ...clean }, /is approved; "check" needs it built/],
    [built, { type: 'check', screen: 'home' }, /check needs findings as a count/],
    [built, { type: 'check', screen: 'home', findings: 2, drift: 0 }, /not clean: 2 detector findings/],
    [built, { type: 'check', screen: 'home', findings: 0, drift: 1 }, /not clean: 0 detector findings, 1 consistency/],
    [plan, { type: 'propose', screen: 'home', part: 'hero' }, /has no parts/],
    [plan, { type: 'ship', screen: 'home' }, /Unknown event "ship"/],
    [plan, { type: 'propose', screen: 'nope' }, /No screen "nope"/],
  ];
  for (const [p, e, re] of cases) {
    const before = JSON.stringify(p);
    assert.throws(() => applyStep(p, e), re, JSON.stringify(e));
    assert.equal(JSON.stringify(p), before, 'applyStep must not change its input');
  }
});

test('part by part: the screen plan is approved first, parts go one at a time, then the whole screen is checked', () => {
  let plan = step(fresh(), { type: 'propose', screen: 'home', parts: ['Hero', 'How it works'] });
  assert.deepEqual(plan.screens[0].parts.map((p) => [p.id, p.status]), [['hero', 'planned'], ['how-it-works', 'planned']]);
  assert.throws(() => applyStep(plan, { type: 'propose', screen: 'home', part: 'hero' }), /approves the screen plan before any part starts/);
  plan = step(plan, { type: 'approve', screen: 'home', note: 'Two parts, fine' });
  assert.deepEqual([nextStep(plan).action, nextStep(plan).part], ['propose', 'hero']);
  assert.throws(() => applyStep(plan, { type: 'build', screen: 'home' }), /built part by part/);
  assert.throws(() => applyStep(plan, { type: 'propose', screen: 'home', part: 'how-it-works' }), /"how-it-works" has to wait: "hero" is planned/);
  plan = step(
    plan,
    { type: 'propose', screen: 'home', part: 'hero' },
    { type: 'approve', screen: 'home', part: 'hero', note: 'ok' },
    { type: 'build', screen: 'home', part: 'hero', output: 'home.html' },
    { type: 'check', screen: 'home', part: 'hero', ...clean },
    { type: 'propose', screen: 'home', part: 'how-it-works' },
  );
  assert.deepEqual([nextStep(plan).action, nextStep(plan).part], ['wait', 'how-it-works']);
  plan = step(plan, { type: 'approve', screen: 'home', part: 'how-it-works', note: 'ok' }, { type: 'build', screen: 'home', part: 'how-it-works' }, { type: 'check', screen: 'home', part: 'how-it-works', ...clean });
  assert.equal(plan.screens[0].status, 'built');
  assert.deepEqual([nextStep(plan).action, nextStep(plan).part], ['check', null]);
  plan = step(plan, { type: 'check', screen: 'home', ...clean });
  assert.deepEqual([nextStep(plan).action, nextStep(plan).screen], ['propose', 'products']);
});

test('validatePlan refuses a hand-edited plan that skips ahead', () => {
  const plan = fresh();
  plan.screens[1].status = 'approved';
  assert.throws(() => validatePlan(plan), /products\): is approved while an earlier screen \(home\) is not checked/);
  assert.throws(() => validatePlan({ ...fresh(), route: 'redo' }), /route must be one of/);
  assert.throws(() => nextStep({ ...fresh(), screens: [] }), /screens must be a non-empty list/);
});

test('CLI --plan writes taster.plan.json from the start page and its nav', { timeout: 60000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-plan-'));
  try {
    const r = spawnSync(process.execPath, [cli, '--plan', screen('home.html'), '--out', out, '--system', screen('system.css')], { encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    const plan = JSON.parse(readFileSync(join(out, 'taster.plan.json'), 'utf8'));
    assert.deepEqual(plan.screens.map((s) => s.id), ['home', 'pricing']);
    assert.match(r.stdout, /next: Propose screen "home"/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('MCP: plan_screens, plan_update runs the real check and refuses a drifted screen, check_consistency', { timeout: 240000 }, async () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-plan-mcp-'));
  const client = new Client({ name: 'taster-test', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    return { error: !!r.isError, body: r.content[0].text.startsWith('{') ? JSON.parse(r.content[0].text) : r.content[0].text };
  };
  const update = (event) => call('plan_update', { plan: out, event });
  try {
    const planned = await call('plan_screens', { target: screen('home.html'), system: screen('system.css'), out });
    assert.ok(!planned.error, planned.body);
    assert.deepEqual(planned.body.plan.screens.map((s) => s.id), ['home', 'pricing']);
    assert.equal(planned.body.next.action, 'propose');

    assert.ok((await update({ type: 'build', screen: 'home' })).error, 'build before approval must be refused');
    await update({ type: 'propose', screen: 'home' });
    assert.equal((await call('plan_next', { plan: out })).body.action, 'wait');
    await update({ type: 'approve', screen: 'home', note: 'looks right' });
    await update({ type: 'build', screen: 'home', output: screen('home.html') });
    const home = await update({ type: 'check', screen: 'home' });
    assert.ok(!home.error, JSON.stringify(home.body));
    assert.equal(home.body.check.findings, 0);
    assert.equal(home.body.next.screen, 'pricing');

    await update({ type: 'propose', screen: 'pricing' });
    await update({ type: 'approve', screen: 'pricing', note: 'yes' });
    await update({ type: 'build', screen: 'pricing', output: screen('drifted.html') });
    const refused = await update({ type: 'check', screen: 'pricing' });
    assert.ok(refused.error, 'the drifted screen must not pass its check');
    assert.match(refused.body.refused, /Not clean: \d+ detector findings, [1-9]\d* consistency findings/);
    assert.ok(refused.body.check.consistency.drift.some((d) => d.property === 'border-radius'));
    assert.equal(JSON.parse(readFileSync(join(out, 'taster.plan.json'), 'utf8')).screens[1].status, 'built');

    await update({ type: 'build', screen: 'pricing', output: screen('pricing.html') });
    const fixed = await update({ type: 'check', screen: 'pricing' });
    assert.ok(!fixed.error, JSON.stringify(fixed.body));
    assert.equal(fixed.body.next.action, 'done');

    const cons = await client.callTool({ name: 'check_consistency', arguments: { screens: [screen('pricing.html'), screen('drifted.html')], system: [screen('system.css')] } });
    assert.ok(!cons.isError, cons.content[0].text);
    assert.equal(JSON.parse(cons.content[0].text).ok, false);
    assert.match(cons.content[1].text, /CONSISTENCY FAIL/);
  } finally {
    await client.close();
    rmSync(out, { recursive: true, force: true });
  }
});
