// Checks the worked Rebuild example in examples/rebuild/ the way references/rebuild.md asks:
// the original is slop, the rebuild has zero measured findings at both widths, and every heading,
// action label and nav item of the original is still on the rebuilt page. Its theme is the design system made from
// the original (brand and tone), so theme.css and taster.system.json must be exactly what designSystem gives. Then,
// as references/screens.md asks, the second screen is clean too, both screens draw every component the same way and
// only from the system (registry tokens plus theme.css), and taster.plan.json records both screens as checked.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAxes } from '../../taxonomy/axes.mjs';
import { checkConsistency } from '../consistency.mjs';
import { contentParity, diagnose, extract } from '../diagnose.mjs';
import { nextStep, readPlan } from '../plan.mjs';
import { designSystem } from '../system.mjs';

const file = (name) => fileURLToPath(new URL(`../../examples/rebuild/${name}`, import.meta.url));
const before = file('before.html');
const after = file('after.html');

const fail = (msg) => {
  console.error(`REBUILD FAIL: ${msg}`);
  process.exit(1);
};

const [diagBefore, diagAfter] = [await diagnose(before), await diagnose(after)];
if (diagBefore.rulesHit < 10) fail(`the original should be clearly slop, only ${diagBefore.rulesHit} rules hit`);
if (diagAfter.rulesHit !== 0) fail(`the rebuild still hits ${diagAfter.rules.map((r) => r.ruleId).join(', ')}`);
// Both READMEs say how many rules the original breaks, so a change to the rules or the example updates them too.
for (const [readme, said] of [['README.md', /breaks (\d+) of the rules/], ['README.ko.md', /\((\d+)개 규칙에 걸림\)/]]) {
  const count = said.exec(readFileSync(fileURLToPath(new URL(`../../${readme}`, import.meta.url)), 'utf8'))?.[1];
  if (!count) fail(`${readme} no longer says how many rules examples/rebuild/before.html breaks (${said})`);
  if (Number(count) !== diagBefore.rulesHit) fail(`${readme} says the original breaks ${count} rules, it breaks ${diagBefore.rulesHit}`);
}

const [contentBefore, contentAfter] = [await extract(before), await extract(after)];
const parity = contentParity(contentBefore, contentAfter);
if (parity.expected < 8) fail(`expected at least 8 headings, actions and nav items in the original, got ${parity.expected}`);
if (parity.missing.length) fail(`the rebuild dropped: ${parity.missing.join(' | ')}`);
if (contentAfter.brand.color !== contentBefore.brand.color) fail(`brand color changed from ${contentBefore.brand.color} to ${contentAfter.brand.color}`);

// The rebuild wears the design system made from the original, not hand-typed values.
const system = await designSystem({ brand: before });
const violations = validateAxes(system.axes);
if (violations.length) fail(`the system's axes are not balanced: ${violations.map((v) => v.message).join('; ')}`);
if (readFileSync(file('theme.css'), 'utf8') !== system.css) fail('examples/rebuild/theme.css is not what design_system gives for before.html (regenerate: node engine/cli.mjs --system examples/rebuild/before.html --out examples/rebuild)');
// The evidence strings quote raw measurements (a 17px gap, a 26px card padding) that move by a pixel with the
// platform's fallback fonts; the steps, tokens, css and notes they lead to do not. Everything else must match exactly.
const stable = (s) => JSON.parse(JSON.stringify(s), (k, v) => ((k === 'evidence' || k === 'from') && typeof v === 'string' ? undefined : v));
const differs = (a, b, at = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [at || '(root)'];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => differs(a[k], b[k], `${at}.${k}`));
};
const drift = differs(stable(JSON.parse(readFileSync(file('taster.system.json'), 'utf8'))), stable(system));
if (drift.length) fail(`examples/rebuild/taster.system.json drifted from design_system for before.html at ${drift.slice(0, 12).join(', ')}`);
if (!/<link rel="stylesheet" href="theme\.css">/.test(readFileSync(after, 'utf8'))) fail('after.html does not load theme.css');

// Screen by screen: the second screen, consistency across both against the system, and the plan.
const pricing = file('pricing.html');
const diagPricing = await diagnose(pricing);
if (diagPricing.rulesHit !== 0) fail(`pricing.html hits ${diagPricing.rules.map((r) => r.ruleId).join(', ')}`);
const planFile = file('taster.plan.json');
const plan = readPlan(planFile);
const systemFiles = (Array.isArray(plan.system) ? plan.system : [plan.system]).map((p) => join(dirname(planFile), p));
const consistency = await checkConsistency([after, pricing], { system: systemFiles });
if (!consistency.ok) fail(`the two rebuilt screens are not consistent: ${consistency.drift.map((d) => `${d.role} ${d.property}`).concat(consistency.offSystem.map((f) => `${f.screen} ${f.role} ${f.property} ${f.value}`)).join(' | ')}`);
// Negative control: the original was not drawn from this system, so the same check must fail on it.
const control = await checkConsistency([after, before], { system: systemFiles });
if (control.ok) fail('the consistency check passed the original against the system; it is not measuring anything');
if (nextStep(plan).action !== 'done') fail(`the plan is not finished: ${nextStep(plan).say}`);
for (const s of plan.screens) if (!s.output || !existsSync(join(dirname(planFile), s.output))) fail(`plan screen ${s.id} has no output file`);
if (plan.screens.map((s) => s.output).join() !== 'after.html,pricing.html') fail('the plan should list after.html and pricing.html in build order');

console.log(`before: ${diagBefore.rulesHit} rules hit (${diagBefore.rules.map((r) => r.ruleId).join(' ')})`);
console.log(`after: 0 rules hit at ${diagAfter.widths.join(' and ')}`);
console.log(`design system: ${Object.keys(system.tokens).length} tokens, ${Object.entries(system.steps).map(([a, n]) => `${a} ${n}`).join(', ')}; lowest text contrast ${system.contrast.lowest.ratio}:1`);
console.log(`content kept: ${parity.kept} of ${parity.expected} headings, actions and nav items; brand color ${contentAfter.brand.color}`);
console.log(`pricing: 0 rules hit at ${diagPricing.widths.join(' and ')}`);
console.log(`consistency: 0 drift, 0 off-system values across ${consistency.screens.length} screens and ${consistency.system.tokens} system tokens; the original against the same system: ${control.findings} findings`);
console.log(`plan: ${plan.screens.length} screens checked, next step ${nextStep(plan).action}`);
console.log('REBUILD OK');
