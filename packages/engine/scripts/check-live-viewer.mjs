// The live viewer end to end: a hub on a free port, a real diagnose of examples/rebuild/before.html reporting to it
// through packages/engine/live.mjs, a second agent's swaps, component and token tune, and a stage refresh that measures
// examples/rebuild/after.html in place of the changed page. The viewer is opened in headless Chromium before the
// events (live) and again after them (replay), at desktop and phone width. It must draw the picture, the marks and a
// cursor per agent, mark findings resolved after the refresh and then clear those marks, let a cursor's last label fade
// once its call is over, count in the singular for one, draw a per-edit patch (the region of the new picture fading in
// inside a box in the editing agent's color, a finding in it resolving), and do it with no page error, no console error
// and no content security policy violation. Run: node packages/engine/scripts/check-live-viewer.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { diagnose } from '../diagnose.mjs';
import * as live from '../live.mjs';
import { engineRefresher, startHub } from '../watch.mjs';

const root = new URL('../../../', import.meta.url);
const before = fileURLToPath(new URL('examples/rebuild/before.html', root));
const after = pathToFileURL(fileURLToPath(new URL('examples/rebuild/after.html', root))).href;
const dir = mkdtempSync(join(tmpdir(), 'taster-live-check-'));
process.env.TASTER_LIVE_FILE = join(dir, 'hub.json');

const problems = [];
const fail = (msg) => problems.push(msg);
const engine = engineRefresher();
// The page "changed" into the rebuilt one: the refresh measures after.html where the stage was before.html.
const refresher = { run: (stage) => engine.run({ ...stage, url: after }), close: engine.close };
const hub = await startHub({ port: 0, refresher, refreshEvery: 300 });
const browser = await chromium.launch();

// Opens the viewer and records everything that would mean it broke.
async function openViewer(viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.goto(hub.viewUrl);
  return { page, errors };
}
async function finish(name, { page, errors }) {
  const csp = await page.evaluate(() => window.__csp);
  for (const v of csp) fail(`${name}: content security policy violation: ${v}`);
  for (const e of errors) fail(`${name}: ${e}`);
  await page.close();
}
const post = (events) =>
  fetch(`${hub.url}ingest`, { method: 'POST', headers: { 'content-type': 'application/json', [live.TOKEN_HEADER]: hub.token }, body: JSON.stringify(events) });

try {
  const desk = await openViewer({ width: 1440, height: 900 });
  await desk.page.waitForFunction(() => document.getElementById('status').textContent === 'Live', null, { timeout: 10000 });

  // Agent one: a real diagnose, the way the MCP server runs it.
  live.reset();
  const agentA = { id: 'mcp-check', kind: 'mcp', client: 'check-client', label: 'rebuild' };
  const report = await live.tracked('diagnose', () => diagnose(before), () => agentA)({ target: before }, null);
  await live.flush();
  if (report.rulesHit < 5) fail(`the diagnose found only ${report.rulesHit} rules on before.html`);

  // Agent two, at the same time as the first one's cursor is still visiting: a swap, a component, a token tune, an add.
  const ruleIds = report.rules.map((r) => r.ruleId).slice(0, 3);
  const agentB = { id: 'acp-check', kind: 'acp', client: 'editor', label: 'rebuild', lane: 0 };
  const ev = (type, data, extra = {}) => ({ v: 1, n: 1, t: Date.now(), agent: agentB, call: 'b1', tool: 'suggest_swaps', type, data, ...extra });
  await post([
    ev('call.start', { args: { ruleIds } }),
    ev('swaps', { items: ruleIds.map((ruleId) => ({ ruleId, patterns: ['hairline-card'], components: ['blocks/button'] })) }),
    ev('call.end', { ok: true, ms: 12 }),
    ev('component', { id: 'blocks/button', fixes: ruleIds }, { call: 'b2', tool: 'get_component' }),
    ev('system.tuned', { changes: { roundness: 1 }, summary: ['roundness set to round (1) by the builder'], diff: [{ name: '--radius', from: '0.625rem', to: '1rem' }, { name: '--r-sm', from: '0.375rem', to: '0.6rem' }] }, { call: 'b3', tool: 'tune_system' }),
    ev('component.add', { ids: ['blocks/button'], dir: 'src/components/taster', written: ['blocks/button.tsx'], skipped: 0 }, { call: 'b4', tool: 'add' }),
  ]);

  const p = desk.page;
  await p.waitForFunction(() => document.querySelectorAll('.shot[data-on]').length === 1, null, { timeout: 15000 }).catch(() => fail('desktop: the stage picture never showed'));
  const marks = await p.locator('.mark').count();
  if (marks < 10) fail(`desktop: ${marks} marks, expected 10 or more`);
  await p.waitForFunction(() => document.querySelectorAll('.cursor').length >= 2, null, { timeout: 10000 }).catch(() => fail('desktop: fewer than two cursors'));
  await p.waitForFunction(() => [...document.querySelectorAll('.cursor-say')].some((s) => /[A-Z]{2,4}-\d{2}/.test(s.textContent)), null, { timeout: 10000 }).catch(() => fail('desktop: no cursor ever named a rule'));
  await p.waitForFunction(() => document.querySelectorAll('.token').length >= 2, null, { timeout: 10000 }).catch(() => fail('desktop: the token diff never showed'));
  // The refresh: a newer picture crossfades in and some marks turn resolved.
  await p.waitForFunction(() => document.querySelectorAll('.mark[data-resolved]').length > 0, null, { timeout: 60000 }).catch(() => fail('desktop: no mark was resolved after the refresh'));
  // Marks still waiting for the hub cursor are hidden, not left as outlines over the new picture.
  const waiting = await p.evaluate(() => [...document.querySelectorAll('.mark[data-gone]')].filter((m) => getComputedStyle(m).opacity !== '0').length);
  if (waiting) fail(`desktop: ${waiting} resolved marks still show as outlines on the new picture`);
  const shown = await p.evaluate(() => ({
    title: document.getElementById('stage-title').textContent,
    counts: document.getElementById('counts').textContent,
    names: [...document.querySelectorAll('.cursor-name')].map((n) => n.textContent),
    calls: document.querySelectorAll('.call').length,
    agents: document.querySelectorAll('.agent').length,
    note: document.querySelector('.note').textContent,
    picture: (() => {
      const img = document.querySelector('.shot[data-on]');
      return img ? { w: img.naturalWidth, h: img.naturalHeight } : null;
    })(),
  }));
  if (shown.title !== 'before.html') fail(`desktop: the stage title is "${shown.title}"`);
  if (!/resolved after the change/.test(shown.counts)) fail(`desktop: counts say "${shown.counts}"`);
  if (!shown.names.some((n) => n.includes('check-client')) || !shown.names.some((n) => n.includes('editor'))) fail(`desktop: cursor names ${shown.names.join(', ')}`);
  if (shown.agents !== 3) fail(`desktop: ${shown.agents} agents listed, expected 3 (two agents and the hub)`);
  if (shown.calls < 2) fail(`desktop: ${shown.calls} calls in the log`);
  if (!/chosen here/.test(shown.note)) fail('desktop: the note on the visiting order is missing');
  if (!shown.picture || shown.picture.w !== 1440) fail(`desktop: the picture is ${JSON.stringify(shown.picture)}`);
  // The resolved marks play their turn and go, so the new picture is not left under old boxes; the count stays.
  await p.waitForFunction(() => document.querySelectorAll('.mark[data-resolved], .mark[data-gone]').length === 0, null, { timeout: 30000 }).catch(() => fail('desktop: resolved marks were still on the stage 30s after the refresh'));
  const kept = await p.locator('#counts').textContent();
  if (!/resolved after the change/.test(kept)) fail(`desktop: the resolved count went away: "${kept}"`);
  // A cursor whose call is over keeps its arrow and name, and its last label fades.
  const quiet = (client) =>
    p
      .waitForFunction((who) => [...document.querySelectorAll('.cursor')].some((c) => c.querySelector('.cursor-name').textContent.includes(who) && c.hasAttribute('data-idle') && c.querySelector('.cursor-say').textContent === ''), client, { timeout: 30000 })
      .catch(() => fail(`desktop: the ${client} cursor still shows its last label after its call ended`));
  await quiet('editor');
  await quiet('hub');
  const legend = await p.locator('.agent').count();
  if (legend !== 3) fail(`desktop: the agent legend lost an agent once the cursors went quiet (${legend})`);

  // Per edit: an agent's own edit (what its PostToolUse hook reports) and two patches the hub sends for edits. The
  // editing agent's cursor flies to the changed region, the region of the new picture crossfades in inside a box with
  // its size, a finding inside the region resolves, and the count goes down. The hub's capture and DOM diff are
  // checked in test/watch.test.mjs; here the patches are published as the hub would.
  const stageEvent = hub.events.find((e) => e.type === 'stage' && e.agent.id === 'mcp-check' && e.data.width === 1440);
  const refresh = [...hub.events].reverse().find((e) => e.type === 'stage.refresh');
  const hookAgent = { id: 'cc-check', kind: 'hook', client: 'claude-code', label: 'site', lane: 0 };
  await post([{ v: 1, n: 1, t: Date.now(), agent: hookAgent, call: null, tool: null, type: 'edit', data: { file: 'src/hero.html', tool: 'Edit' } }]);
  const spot = { ruleId: 'AC-01', severity: 'high', selector: 'main > h1', rect: { x: 120, y: 140, w: 300, h: 60 } };
  const region = { rect: { x: 100, y: 120, w: 420, h: 120 }, kind: 'changed', label: 'h1 "Close your books"', count: 1, edit: 0, guessed: false };
  const patch = (findings, changed) => ({ of: stageEvent.seq, url: stageEvent.data.url, width: 1440, shot: refresh.data.shot, shotSize: refresh.data.shotSize, file: 'src/hero.html', tool: 'Edit', agent: hookAgent, edits: [{ file: 'src/hero.html', tool: 'Edit', agent: hookAgent }], changed, compared: true, findings, counts: {} });
  hub.publish('stage.patch', patch([spot], [region]));
  await p.waitForFunction(() => document.querySelector('.patch[data-on] .patch-img') && /^\d+ x \d+$/.test(document.querySelector('.patch-size')?.textContent || ''), null, { timeout: 15000 }).catch(() => fail('desktop: the first patch never showed a region crossfade with its size'));
  const editor = await p.evaluate(() => [...document.querySelectorAll('.cursor-name')].find((n) => n.textContent.includes('claude-code'))?.textContent || null);
  if (!editor) fail('desktop: no cursor for the editing agent');
  await p.waitForFunction(() => /1 edit shown, 0 resolved/.test(document.getElementById('counts').textContent), null, { timeout: 15000 }).catch(async () => fail(`desktop: after one patch the counts say "${await p.locator('#counts').textContent()}"`));
  hub.publish('stage.patch', patch([], [region]));
  await p.waitForFunction(() => document.querySelectorAll('.mark[data-resolved]').length > 0, null, { timeout: 15000 }).catch(() => fail('desktop: the finding inside the second patch did not resolve'));
  await p.waitForFunction(() => /2 edits shown, 1 resolved/.test(document.getElementById('counts').textContent), null, { timeout: 15000 }).catch(async () => fail(`desktop: after two patches the counts say "${await p.locator('#counts').textContent()}"`));
  await p.waitForFunction(() => document.querySelectorAll('.patch').length === 0, null, { timeout: 15000 }).catch(() => fail('desktop: the patch boxes stayed after the picture settled'));
  if (!editor?.includes('claude-code edits')) fail(`desktop: the editing cursor is named "${editor}"`);
  // A page shorter than the stage leaves no "Waiting for an agent" note under it.
  if (await p.evaluate(() => getComputedStyle(document.getElementById('empty')).display !== 'none')) fail('desktop: the empty note shows under the stage');
  const logged = await p.evaluate(() => [...document.querySelectorAll('.call')].some((c) => c.textContent.includes('src/hero.html')));
  if (!logged) fail('desktop: the edit is not in the log');
  await finish('desktop', desk);

  // A tab opened afterwards gets everything from the replay, and a phone width does not scroll sideways.
  const phone = await openViewer({ width: 390, height: 844 });
  await phone.page.waitForFunction(() => document.querySelectorAll('.mark').length > 5 && document.querySelectorAll('.shot[data-on]').length === 1, null, { timeout: 15000 }).catch(() => fail('phone: the replay did not draw the stage'));
  const wide = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (wide > 0) fail(`phone: the page is ${wide}px wider than the screen`);
  await finish('phone', phone);

  // One finding on one element reads in the singular, and a stage with no picture does not count elements.
  const agentC = { id: 'cli-check', kind: 'cli', client: null, label: 'single' };
  const one = (type, data, call) => ({ v: 1, n: 1, t: Date.now(), agent: agentC, call, tool: 'diagnose', type, data });
  const finding = { ruleId: 'AC-01', severity: 'high', selector: 'h1', rect: { x: 10, y: 10, w: 100, h: 40 } };
  await post([
    one('stage', { url: 'https://example.test/one', width: 800, shotSize: { width: 800, height: 600 } }, 'c1'),
    one('findings', { width: 800, findings: [finding] }, 'c1'),
  ]);
  const single = await openViewer({ width: 1440, height: 900 });
  await single.page.waitForFunction(() => document.getElementById('counts').textContent === '1 rule, 1 finding at 800', null, { timeout: 10000 }).catch(async () => fail(`singular: counts say "${await single.page.locator('#counts').textContent()}"`));
  await post([
    one('stage', { url: 'https://example.test/two', width: 800 }, 'c2'),
    one('findings', { width: 800, findings: [finding, { ...finding, selector: 'p' }] }, 'c2'),
  ]);
  await single.page.waitForFunction(() => document.getElementById('counts').textContent === '1 rule, 2 findings at 800', null, { timeout: 10000 }).catch(async () => fail(`no picture: counts say "${await single.page.locator('#counts').textContent()}"`));
  await finish('singular', single);

  // A tab without the key reads nothing and says what to open.
  const nokey = await browser.newPage();
  await nokey.goto(hub.url);
  const said = await nokey.locator('#status').textContent();
  if (said !== 'No key in this address') fail(`no key: the status says "${said}"`);
  await nokey.close();

  console.log(`marks ${marks}, cursors ${shown.names.length} (${shown.names.join('; ')}), calls ${shown.calls}, ${shown.counts}`);
} finally {
  await browser.close();
  await hub.close();
  rmSync(dir, { recursive: true, force: true });
}

if (problems.length) {
  for (const p of problems) console.error(`LIVE VIEWER FAIL: ${p}`);
  process.exit(1);
}
console.log('LIVE VIEWER OK');
