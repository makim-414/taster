// Checks the worked Rebuild example in examples/rebuild/ the way references/rebuild.md asks:
// the original is slop, the rebuild has zero measured findings at both widths, and every heading,
// action label and nav item of the original is still on the rebuilt page.
import { fileURLToPath } from 'node:url';
import { contentParity, diagnose, extract } from '../diagnose.mjs';

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

const [contentBefore, contentAfter] = [await extract(before), await extract(after)];
const parity = contentParity(contentBefore, contentAfter);
if (parity.expected < 8) fail(`expected at least 8 headings, actions and nav items in the original, got ${parity.expected}`);
if (parity.missing.length) fail(`the rebuild dropped: ${parity.missing.join(' | ')}`);
if (contentAfter.brand.color !== contentBefore.brand.color) fail(`brand color changed from ${contentBefore.brand.color} to ${contentAfter.brand.color}`);

console.log(`before: ${diagBefore.rulesHit} rules hit (${diagBefore.rules.map((r) => r.ruleId).join(' ')})`);
console.log(`after: 0 rules hit at ${diagAfter.widths.join(' and ')}`);
console.log(`content kept: ${parity.kept} of ${parity.expected} headings, actions and nav items; brand color ${contentAfter.brand.color}`);
console.log('REBUILD OK');
