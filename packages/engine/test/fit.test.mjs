import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRegistry, resolveComponents } from '../add.mjs';
import { detectHost, detectIcons, fitBundle, fitIcons, fitMode, fitNextSteps, fitReport, iconReport, planFit } from '../fit.mjs';

const HOSTS = fileURLToPath(new URL('./fixtures/hosts/', import.meta.url));
const CLI = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const preset = createRequire(import.meta.url)('../../registry/src/tailwind-preset.cjs');
const tokensCss = readFileSync(fileURLToPath(new URL('../../registry/src/tokens.css', import.meta.url)), 'utf8');

// Every class the Taster preset adds or redefines in a way the app would not read the same: its color keys under
// every color utility, its own size, radius, shadow, weight and motion names. Stock names it also sets (rounded-lg,
// text-xs, ease-out, the spacing steps) stay, since they are the app's own scale there.
const theme = preset.theme.extend;
const colorKeys = Object.entries(theme.colors).flatMap(([k, v]) => (typeof v === 'object' ? Object.keys(v).map((n) => `${k}-${n}`) : [k]));
const TASTER_CLASSES = new Set([
  ...['bg', 'text', 'border', 'ring', 'divide', 'fill', 'stroke', 'outline', 'ring-offset', 'border-t'].flatMap((p) => colorKeys.map((k) => `${p}-${k}`)),
  ...['display', 'h1', 'h2', 'title', 'body', 'label', 'caption', 'micro'].map((k) => `text-${k}`),
  'rounded-card', 'rounded-pill', 'shadow-card', 'shadow-pop', 'font-reg', 'font-med', 'font-semi', 'font-display',
  'duration-press', 'duration-tooltip', 'duration-dropdown', 'duration-modal', 'scale-press', 'scale-enter', 'ease-drawer',
]);
const TASTER_VARS = [...new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))];
const classesIn = (text) => [...text.matchAll(/(?:^|[\s'"`:!{])-?([a-z][a-z0-9-]*[a-z0-9])(?=$|[\s'"`/\]}])/g)].map((m) => m[1]);

test('detectHost reads a Tailwind v4 app: version, the stylesheet that loads Tailwind and its @theme tokens', () => {
  const host = detectHost(join(HOSTS, 'v4-lucide'));
  assert.equal(host.tailwind, 4);
  assert.equal(host.entry, join(HOSTS, 'v4-lucide/src/index.css'));
  assert.equal(host.theme.color.brand.value, '#0f6b4f');
  assert.equal(host.theme.radius.card.value, '1.25rem');
  assert.equal(fitMode(host), 'host');
  // An app with Tailwind and no theme of its own keeps the token files and the preset, as before.
  assert.equal(fitMode(detectHost(join(HOSTS, 'plain'))), 'taster');
  assert.equal(fitMode(detectHost(join(HOSTS, 'v4-lucide')), 'taster'), 'taster');
});

test('detectHost reads a Tailwind v3 config without running it, nested colors and CSS variables included', () => {
  const host = detectHost(join(HOSTS, 'v3-config'));
  assert.equal(host.tailwind, 3);
  assert.equal(host.theme.color['primary-foreground'].value, 'hsl(var(--primary-foreground))');
  assert.equal(host.theme.color.primary.value, 'hsl(var(--primary))');
  assert.equal(host.vars['--muted-foreground'], '215 16% 47%');
  assert.equal(fitMode(host), 'host');
});

test('planFit maps Taster tokens onto the app tokens that play the same part, never onto a name it only shares', () => {
  const plan = planFit(detectHost(join(HOSTS, 'v4-lucide')));
  const to = (cls) => plan.classes.get(cls).to;
  // The app's accent is a lime highlight; Taster's accent is the brand's solid color, so it goes to brand.
  assert.equal(to('bg-accent'), 'bg-brand');
  assert.equal(to('text-text-muted'), 'text-ink-muted');
  assert.equal(to('bg-bg-elev'), 'bg-surface');
  assert.equal(to('border-border'), 'border-line');
  assert.equal(to('border-border-input'), 'border-line-strong');
  assert.equal(to('bg-accent-soft'), 'bg-brand-soft');
  // No foreground token for the brand: the app color that reads best on it, by contrast.
  assert.equal(to('text-accent-fg'), 'text-surface');
  assert.match(plan.color['accent-fg'].note, /:1 on brand/);
  // Sizes and weights land on Tailwind's own class of the same value; a size Tailwind lacks is namespaced.
  assert.equal(to('text-h2'), 'text-2xl');
  assert.equal(to('text-body'), 'text-sm');
  assert.equal(to('font-med'), 'font-medium');
  assert.equal(to('text-caption'), 'text-tst-caption');
  assert.equal(to('rounded-card'), 'rounded-card');
  assert.equal(to('rounded-pill'), 'rounded-full');
  assert.equal(to('duration-press'), 'duration-[var(--tst-dur-press)]');
  assert.equal(plan.scheme, 'light');
  assert.equal(to('text-success'), 'text-tst-success');
});

test('a v3 shadcn style app maps onto its config names and gets an extend-only preset', () => {
  const host = detectHost(join(HOSTS, 'v3-config'));
  const { bundle, plan } = fitBundle(resolveComponents(['marketing/pricing-cards'], { tokens: false }), host);
  assert.equal(plan.classes.get('bg-accent').to, 'bg-primary');
  assert.equal(plan.classes.get('text-accent-fg').to, 'text-primary-foreground');
  assert.equal(plan.classes.get('text-text-muted').to, 'text-muted-foreground');
  assert.equal(plan.classes.get('bg-bg-sunken').to, 'bg-muted');
  const presetFile = bundle.files.find((f) => f.path === 'taster-tailwind.cjs').content;
  const config = new Function('module', `${presetFile}; return module.exports`)({});
  assert.deepEqual(Object.keys(config.theme), ['extend']);
  for (const group of Object.values(config.theme.extend)) for (const key of Object.keys(group)) assert.match(key, /^tst-/);
  const css = bundle.files.find((f) => f.path === 'taster.css').content;
  assert.match(css, /--tst-accent: hsl\(var\(--primary\)\);/);
  assert.doesNotMatch(css, /@theme/);
  assert.match(fitNextSteps('src/components/taster', host).join('\n'), /taster-tailwind\.cjs'\) to presets/);
});

test('fitBundle leaves no Taster token class or custom property behind and defines no name the app has', () => {
  const host = detectHost(join(HOSTS, 'v4-lucide'));
  const ids = loadRegistry().components.map((c) => c.id);
  const { bundle, used, plan } = fitBundle(resolveComponents(ids, { tokens: false }), host);
  const paths = bundle.files.map((f) => f.path);
  assert.ok(!paths.includes('tokens.css') && !paths.includes('tailwind-preset.cjs'));
  for (const f of bundle.files) {
    if (!/\.(tsx?|css)$/.test(f.path) || f.path === 'taster.css') continue;
    // A class may stay only where it is the app's own name too (rounded-card on an app with --radius-card).
    const left = classesIn(f.content).filter((c) => TASTER_CLASSES.has(c) && plan.classes.get(c)?.to !== c);
    assert.deepEqual(left, [], `${f.path} keeps ${left.join(', ')}`);
    for (const name of TASTER_VARS) assert.ok(!new RegExp(`var\\(\\s*${name}(?![\\w-])`).test(f.content), `${f.path} reads ${name}`);
    assert.ok(!/(^|[\s'"`:])desk:/.test(f.content), `${f.path} keeps desk:`);
  }
  assert.ok(used.size > 40);
  const css = bundle.files.find((f) => f.path === 'taster.css').content;
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) assert.match(m[1], /^--(tst-|color-tst-|text-tst-)/, `taster.css defines ${m[1]}`);
  assert.match(css, /--tst-text-muted: var\(--color-ink-muted, #4a5753\);/);
  assert.match(css, /@custom-variant tst-desk/);
  assert.doesNotMatch(css, /\bbody\s*\{/);
});

test('the report says what each used token became, and the setup names the line to add', () => {
  const host = detectHost(join(HOSTS, 'v4-lucide'));
  const fitted = fitBundle(resolveComponents(['marketing/pricing-cards'], { tokens: false }), host);
  const text = fitReport(fitted, host).join('\n');
  assert.match(text, /Tailwind 4/);
  assert.match(text, /color accent\s+your --color-brand: bg-accent -> bg-brand/);
  assert.match(text, /type size h2\s+Tailwind 2xl \(1\.5rem\): text-h2 -> text-2xl/);
  assert.match(text, /duration press .*duration-\[var\(--tst-dur-press\)\]/);
  const setup = fitNextSteps(join(HOSTS, 'v4-lucide/src/components/taster'), host).join('\n');
  assert.match(setup, /@import "\.\/components\/taster\/taster\.css";/);
});

test('add fits the copy when run in an app with its own theme', () => {
  const app = mkdtempSync(join(tmpdir(), 'taster-fit-app-'));
  cpSync(join(HOSTS, 'v4-lucide'), app, { recursive: true });
  const out = JSON.parse(execFileSync('node', [CLI, 'add', 'marketing/pricing-cards', '--json'], { cwd: app, encoding: 'utf8' }));
  assert.equal(out.fit.mode, 'host');
  assert.ok(out.written.includes('taster.css'));
  assert.ok(!existsSync(join(app, 'src/components/taster/tokens.css')));
  assert.ok(out.fit.mapping.some((m) => m.from === 'bg-accent' && m.to === 'bg-brand' && m.via === '--color-brand'));
  const copied = readFileSync(join(app, 'src/components/taster/marketing/pricing-cards.tsx'), 'utf8');
  assert.match(copied, /bg-brand text-surface/);
  // The app's own files are not touched.
  assert.equal(readFileSync(join(app, 'src/index.css'), 'utf8'), readFileSync(join(HOSTS, 'v4-lucide/src/index.css'), 'utf8'));
  // --tokens taster keeps the old way: the token files and the preset.
  const old = JSON.parse(execFileSync('node', [CLI, 'add', 'blocks/badge', '--json', '--tokens', 'taster', '--dir', 'src/old'], { cwd: app, encoding: 'utf8' }));
  assert.equal(old.fit.mode, 'taster');
  assert.ok(old.written.includes('tokens.css') && old.written.includes('tailwind-preset.cjs'));
});

test('detectIcons finds the set the app imports, its stroke, and the glyphs it can match', () => {
  const lucide = detectIcons(join(HOSTS, 'v4-lucide'));
  assert.equal(lucide.kind, 'lucide-react');
  // Read from the app's own use (strokeWidth={1.5}), not lucide's default.
  assert.equal(lucide.stroke, 1.5);
  assert.equal(lucide.glyphs.close.name, 'X');
  assert.equal(lucide.glyphs['chevron-down'].name, 'ChevronDown');
  const hero = detectIcons(join(HOSTS, 'v3-config'));
  assert.equal(hero.kind, '@heroicons/react');
  assert.equal(hero.stroke, 1.5);
  assert.equal(hero.glyphs.close.name, 'XMarkIcon');
  const local = detectIcons(join(HOSTS, 'plain'));
  assert.equal(local.kind, 'local');
  assert.equal(local.stroke, 1.75);
  assert.deepEqual(Object.fromEntries(Object.entries(local.glyphs).map(([k, g]) => [k, g.expr])), { check: 'host.Icon.Check', 'arrow-right': 'host.Icon.Arrow' });
});

test('fitIcons sends every icon of the copied files through one adapter at the app stroke', () => {
  const host = detectHost(join(HOSTS, 'v4-lucide'));
  const icons = detectIcons(host.root);
  const fitted = fitBundle(resolveComponents(['marketing/pricing-cards', 'marketing/reveal-faq', 'blocks/session-list'], { tokens: false }), host);
  const { bundle, inline, files } = fitIcons(fitted.bundle, icons, { dir: join(host.root, 'src/components/taster') });
  assert.ok(inline >= 2);
  assert.ok(files.includes('marketing/pricing-cards.tsx'));
  const pricing = bundle.files.find((f) => f.path === 'marketing/pricing-cards.tsx').content;
  assert.match(pricing, /^import \{ ICON_STROKE \} from '\.\.\/icons'$/m);
  assert.match(pricing, /strokeWidth=\{ICON_STROKE\}/);
  assert.doesNotMatch(pricing, /viewBox="0 0 24 24"[^>]*strokeWidth="2"/);
  const adapter = bundle.files.find((f) => f.path === 'icons/index.tsx').content;
  assert.match(adapter, /^import \{ [^}]*X as HostX[^}]* \} from 'lucide-react'$/m);
  assert.match(adapter, /export const ICON_STROKE = 1\.5/);
  assert.match(adapter, /'close': HostX,/);
  assert.match(adapter, /strokeWidth=\{strokeWidth \?\? ICON_STROKE\}/);
  assert.doesNotMatch(adapter, /icon-stroke/);
  // A file that already imports Icon from the adapter gets ICON_STROKE in the same import.
  for (const f of bundle.files.filter((x) => /from '\.\.\/icons'/.test(x.content))) assert.equal((f.content.match(/from '\.\.\/icons'/g) || []).length, 1, f.path);
  // A local set is imported from where it is, relative to the adapter.
  const plain = detectHost(join(HOSTS, 'plain'));
  const local = fitIcons(resolveComponents(['marketing/audience-split']), detectIcons(plain.root), { dir: join(plain.root, 'src/components/taster') });
  const localAdapter = local.bundle.files.find((f) => f.path === 'icons/index.tsx').content;
  assert.match(localAdapter, /^import \* as host from '\.\.\/\.\.\/icons'$/m);
  assert.match(localAdapter, /export const ICON_STROKE = 1\.75/);
  assert.match(iconReport(local, 'src/components/taster').join('\n'), /src\/components\/taster\/icons\/index\.tsx/);
});
