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

test('accept: a named exception the builder approved lets the check pass; anything else still blocks, and the list stays in the output', () => {
  let plan = step(fresh(), { type: 'propose', screen: 'home' }, { type: 'approve', screen: 'home', note: 'yes' }, { type: 'build', screen: 'home', output: 'home.html' });
  const left = { findings: 1, drift: 1, remaining: ['AC-03', 'off-system:link:font-family'] };
  // Negative control: without an accepted exception the check refuses and names what is left.
  assert.throws(() => applyStep(plan, { type: 'check', screen: 'home', ...left }), /not clean: 1 detector findings, 1 consistency findings[^]*AC-03, off-system:link:font-family/);
  const why = 'The symbol is in the markup text; a stylesheet cannot remove it';
  const ok = 'Accepted, the docs team changes the markup later';
  for (const [e, re] of [
    [{ type: 'accept', screen: 'home', rule: 'AC-03', by: ok }, /accept needs a reason/],
    [{ type: 'accept', screen: 'home', rule: 'AC-03', reason: why }, /accept needs the builder's own words in by/],
    [{ type: 'accept', screen: 'home', rule: 'everything', reason: why, by: ok }, /rule must be a detector rule id/],
    [{ type: 'accept', screen: 'home', part: 'hero', rule: 'AC-03', reason: why, by: ok }, /recorded on the screen/],
    [{ type: 'accept', screen: 'products', rule: 'AC-03', reason: why, by: ok }, /"products" has to wait/],
  ]) assert.throws(() => applyStep(plan, e), re, JSON.stringify(e));
  assert.throws(() => applyStep(fresh(), { type: 'accept', screen: 'home', rule: 'AC-03', reason: why, by: ok }), /is planned; "accept" needs it proposed, approved or built/);

  plan = step(plan, { type: 'accept', screen: 'home', rule: 'AC-03', reason: why, by: ok });
  assert.deepEqual(plan.screens[0].accepted, [{ rule: 'AC-03', reason: why, by: ok }]);
  assert.equal(plan.screens[0].status, 'built', 'accept does not move the status');
  assert.match(plan.screens[0].notes, /accepted exception AC-03: The symbol is in the markup text; a stylesheet cannot remove it \(builder: Accepted, the docs team changes the markup later\)/);
  assert.throws(() => applyStep(plan, { type: 'check', screen: 'home', ...left }), /not accepted: off-system:link:font-family/);
  assert.throws(() => applyStep(plan, { type: 'accept', screen: 'home', rule: 'AC-03', reason: why, by: ok }), /AC-03 is already accepted/);
  plan = step(plan, { type: 'accept', screen: 'home', rule: 'off-system:link:font-family', reason: 'The wordmark keeps its own face', by: ok });

  const n = nextStep(plan);
  assert.equal(n.action, 'check');
  assert.match(n.say, /Accepted exceptions on this screen, approved by the builder: AC-03 \(The symbol is in the markup text[^)]*\), off-system:link:font-family \(The wordmark keeps its own face\)\. The check passes when every remaining finding is one of these; any other finding still has to be fixed\./);
  assert.deepEqual(n.accepted.map((a) => [a.screen, a.rule]), [['home', 'AC-03'], ['home', 'off-system:link:font-family']]);
  assert.throws(() => applyStep(plan, { type: 'check', screen: 'home', findings: 1, drift: 1 }), /list the remaining findings in remaining/);
  plan = step(plan, { type: 'check', screen: 'home', ...left });
  assert.equal(plan.screens[0].status, 'checked');
  assert.match(plan.screens[0].notes, /checked: 1 findings, 1 drift, every one an accepted exception \(AC-03, off-system:link:font-family\)/);

  plan = step(plan, { type: 'propose', screen: 'products' }, { type: 'approve', screen: 'products', note: 'ok' }, { type: 'build', screen: 'products' }, { type: 'check', screen: 'products', ...clean });
  const done = nextStep(plan);
  assert.equal(done.action, 'done');
  assert.match(done.say, /2 accepted exceptions stay on record[^]*home AC-03/);
  assert.equal(done.accepted.length, 2);
  assert.deepEqual(nextStep(fresh()).accepted, []);
  const hand = structuredClone(plan);
  hand.screens[0].accepted[0].by = ' ';
  assert.throws(() => validatePlan(hand), /accepted\[0\]: by needs the builder's own words/);
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

test('MCP: an accepted exception lets plan_update check a screen whose remaining findings the builder approved', { timeout: 240000 }, async () => {
  const out = mkdtempSync(join(tmpdir(), 'taster-plan-accept-'));
  const client = new Client({ name: 'taster-test', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    return { error: !!r.isError, body: r.content[0].text.startsWith('{') ? JSON.parse(r.content[0].text) : r.content[0].text };
  };
  const update = (event) => call('plan_update', { plan: out, event });
  try {
    await call('plan_screens', { target: screen('home.html'), system: screen('system.css'), out });
    await update({ type: 'propose', screen: 'home' });
    await update({ type: 'approve', screen: 'home', note: 'go' });
    await update({ type: 'build', screen: 'home', output: screen('drifted.html') });
    // Negative control: the off-system values refuse the check and are named the way accept names them.
    const refused = await update({ type: 'check', screen: 'home' });
    assert.ok(refused.error);
    const left = refused.body.check.unaccepted;
    assert.ok(left.includes('off-system:button:border-radius') && left.includes('off-system:badge:background-color'), left.join(', '));
    assert.match(refused.body.refused, /Not accepted: .*off-system:button:border-radius/);

    const noWords = await update({ type: 'accept', screen: 'home', rule: left[0], reason: 'needs a markup change' });
    assert.ok(noWords.error && /builder's own words/.test(noWords.body), 'accept without the builder words is refused');
    for (const rule of left) {
      const r = await update({ type: 'accept', screen: 'home', rule, reason: 'The markup sets it inline; the stylesheet cannot reach it', by: 'Accept it for now' });
      assert.ok(!r.error, JSON.stringify(r.body));
    }
    const passed = await update({ type: 'check', screen: 'home' });
    assert.ok(!passed.error, JSON.stringify(passed.body));
    assert.equal(passed.body.plan.screens[0].status, 'checked');
    assert.equal(passed.body.next.screen, 'pricing');
    assert.deepEqual(passed.body.next.accepted.map((a) => a.rule), left, 'accepted exceptions stay in the next step');
    assert.match(passed.body.plan.screens[0].notes, /every one an accepted exception/);
  } finally {
    await client.close();
    rmSync(out, { recursive: true, force: true });
  }
});
