import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildReport, checkConsistency, loadSystem, parseThemeCss, tokenKind } from '../consistency.mjs';

const screen = (name) => fileURLToPath(new URL(`./fixtures/screens/${name}`, import.meta.url));
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 120000 });

test('theme CSS: top level :root tokens only, and the system.mjs { tokens } shape', () => {
  const css = readFileSync(screen('system.css'), 'utf8');
  const tokens = parseThemeCss(css);
  assert.equal(tokens['--dur-press'], '160ms', 'the reduced-motion block inside @media must not replace the real value');
  assert.equal(tokens['--r-md'], 'calc(var(--radius) * 0.8)');
  assert.equal(parseThemeCss('.card { --x: 1px } :root, :host { --y: 2px }')['--y'], '2px');
  assert.equal(parseThemeCss('.card { --x: 1px }')['--x'], undefined);
  const fromJson = loadSystem({ tokens: { '--r-card': '12px', '--brand': '#1f4f8a' }, css: ':root{}', notes: [] });
  assert.deepEqual(fromJson.tokens, { '--brand': '#1f4f8a', '--r-card': '12px' });
  // Later files override earlier ones, the way tokens.css then theme.css load.
  const merged = loadSystem([screen('system.css'), { tokens: { '--brand': '#000000' } }]);
  assert.equal(merged.tokens['--brand'], '#000000');
  assert.throws(() => loadSystem({ tokens: {} }), /No --tokens/);
  assert.deepEqual(
    ['--r-card', '--radius', '--sp-6', '--font', '--font-mono', '--t-body', '--sh-card', '--dur-press', '--stagger-step', '--brand'].map(tokenKind),
    ['radius', 'radius', 'spacing', 'fontFamily', 'fontFamily', 'color', 'shadow', 'duration', 'duration', 'color'],
  );
});

test('two consistent screens pass, against a theme CSS and against { tokens } JSON whose var() chains resolve through the page', { timeout: 120000 }, async () => {
  const pair = [screen('home.html'), screen('pricing.html')];
  const css = await checkConsistency(pair, { system: screen('system.css') });
  assert.equal(css.ok, true, JSON.stringify([css.drift, css.offSystem], null, 1));
  assert.deepEqual(css.screens.map((s) => s.id), ['home', 'pricing']);
  assert.deepEqual(css.widths, [1440, 390]);
  assert.ok(['button', 'input', 'card', 'h1', 'h2', 'h3', 'body', 'link', 'badge'].every((r) => css.roles.home[1440][r]), JSON.stringify(css.roles.home));
  assert.deepEqual(css.system.unchecked, []);
  // system.json leaves --radius out: --r-md: calc(var(--radius) * 0.8) resolves through the page's own --radius.
  const json = await checkConsistency(pair, { system: screen('system.json') });
  assert.equal(json.ok, true, JSON.stringify(json.offSystem, null, 1));
  assert.ok(json.system.kinds.radius >= 3 && json.system.kinds.color >= 7);
});

test('negative control: a drifted screen fails on the button radius and the off-system badge color', { timeout: 120000 }, async () => {
  const report = await checkConsistency([screen('home.html'), screen('pricing.html'), screen('drifted.html')], { system: screen('system.css') });
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.drift.map((d) => [d.width, d.role, d.property, d.values.map((v) => `${v.value}:${v.screens.map((s) => s.id).join('+')}`).join(' ')]),
    [
      [1440, 'button', 'border-radius', '8px:home+pricing 4px:drifted'],
      [390, 'button', 'border-radius', '8px:home+pricing 4px:drifted'],
    ],
  );
  assert.ok(report.drift[0].values[1].screens[0].selectors[0].endsWith('a.button'));
  assert.deepEqual(
    report.offSystem.map((f) => [f.width, f.screen, f.role, f.property, f.value, f.nearest && f.nearest.token]),
    [
      [1440, 'drifted', 'button', 'border-radius', '4px', '--r-sm'],
      [1440, 'drifted', 'badge', 'background-color', 'rgba(255, 0, 170, 1)', report.offSystem[1].nearest.token],
      [390, 'drifted', 'button', 'border-radius', '4px', '--r-sm'],
      [390, 'drifted', 'badge', 'background-color', 'rgba(255, 0, 170, 1)', report.offSystem[3].nearest.token],
    ],
  );
  assert.equal(report.findings, 6);
  // Deterministic: the same input gives the same report.
  const again = await checkConsistency([screen('home.html'), screen('pricing.html'), screen('drifted.html')], { system: screen('system.css') });
  assert.equal(JSON.stringify(again), JSON.stringify(report));
});

test('a system the screens were not built from flags what they use; drift between them stays zero', { timeout: 120000 }, async () => {
  const report = await checkConsistency([screen('home.html'), screen('pricing.html')], { system: screen('mismatch.json') });
  assert.equal(report.drift.length, 0);
  const at1440 = report.offSystem.filter((f) => f.width === 1440).map((f) => `${f.screen} ${f.role} ${f.property} ${f.value}`);
  for (const want of ['home card border-radius 10px', 'home button background-color rgba(31, 79, 138, 1)', 'home badge padding 4px 8px', 'pricing card border-radius 10px']) assert.ok(at1440.includes(want), `${want} not in ${at1440.join(' | ')}`);
  assert.deepEqual(report.system.unchecked, ['shadow', 'duration']);
});

// Synthetic samples: tolerance and variants without a browser.
const style = (over = {}) => ({
  radius: ['8px', '8px', '8px', '8px'],
  fontFamily: 'Fixture Sans, serif',
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '24px',
  padding: ['12px', '24px', '12px', '24px'],
  gap: null,
  color: [255, 255, 255, 255],
  background: [31, 79, 138, 255],
  borderColor: [],
  shadow: 'none',
  duration: '0.16s',
  ...over,
});
const screenOf = (...styles) => ({ 1440: { counts: { button: styles.length }, allowed: null, elements: styles.map((s, i) => ({ role: 'button', selector: `a.b${i}`, w: 120, h: 48, style: s })) } });
const report = (a, b) => buildReport({ a: screenOf(...a), b: screenOf(...b) }, { screens: [{ id: 'a' }, { id: 'b' }], widths: [1440], system: null });

test('tolerance: subpixel lengths and 8-bit color rounding are the same value; a different variant is not drift', () => {
  assert.equal(report([style()], [style({ padding: ['12.3px', '24px', '12.3px', '24px'], background: [32, 79, 138, 255] })]).findings, 0);
  // A ghost button (no fill, other text color) on one screen is a variant, not drift of the filled one.
  assert.equal(report([style()], [style({ background: null, color: [31, 79, 138, 255], borderColor: [[31, 79, 138, 255]] }), style()]).findings, 0);
  // 999px and 9999px on a 48px button both draw a full pill.
  assert.equal(report([style({ radius: Array(4).fill('999px') })], [style({ radius: Array(4).fill('9999px') })]).findings, 0);
  // Negative controls: one pixel of padding, and a near but visibly different fill.
  const pad = report([style()], [style({ padding: ['13px', '24px', '13px', '24px'] })]);
  assert.deepEqual(pad.drift.map((d) => [d.property, d.values.map((v) => v.value)]), [['padding', ['12px 24px', '13px 24px']]]);
  assert.equal(report([style()], [style({ background: [40, 90, 150, 255] })]).drift[0].property, 'background-color');
});

test('CLI: --consistency exits 1 on drift and 0 when consistent; one screen without a system is an error', { timeout: 120000 }, () => {
  const bad = run('--consistency', screen('pricing.html'), screen('drifted.html'));
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stdout, /button border-radius at 1440\n {4}8px {2}pricing/);
  assert.match(bad.stdout, /CONSISTENCY FAIL/);
  const good = run('--consistency', screen('home.html'), screen('pricing.html'), '--system', screen('system.css'), '--json');
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).ok, true);
  assert.equal(run('--consistency', screen('home.html')).status, 2);
});
