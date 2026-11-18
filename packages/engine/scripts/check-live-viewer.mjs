// The live viewer end to end: a hub on a free port, a real diagnose of examples/rebuild/before.html reporting to it
// through packages/engine/live.mjs, a second agent's swaps, component and token tune, and a stage refresh that measures
// examples/rebuild/after.html in place of the changed page. The viewer is opened in headless Chromium before the
// events (live) and again after them (replay), at desktop and phone width. It must draw the picture, the marks and a
// cursor per agent, mark findings resolved after the refresh, and do it with no page error, no console error and no
// content security policy violation. Run: node packages/engine/scripts/check-live-viewer.mjs
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
  await finish('desktop', desk);

  // A tab opened afterwards gets everything from the replay, and a phone width does not scroll sideways.
  const phone = await openViewer({ width: 390, height: 844 });
  await phone.page.waitForFunction(() => document.querySelectorAll('.mark').length > 5 && document.querySelectorAll('.shot[data-on]').length === 1, null, { timeout: 15000 }).catch(() => fail('phone: the replay did not draw the stage'));
  const wide = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (wide > 0) fail(`phone: the page is ${wide}px wider than the screen`);
  await finish('phone', phone);

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
