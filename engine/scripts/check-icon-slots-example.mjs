// Checks the worked icon slot variations in examples/icon-slots/: every variation listed in
// taxonomy.json (iconography.slots[].variations) is on the page under its slot, five per slot,
// and the page itself has zero measured findings at both widths.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { diagnose } from '../diagnose.mjs';

const root = new URL('../../', import.meta.url);
const page = fileURLToPath(new URL('examples/icon-slots/index.html', root));
const html = readFileSync(page, 'utf8');
const slots = JSON.parse(readFileSync(new URL('taxonomy/taxonomy.json', root), 'utf8')).iconography.slots;

const fail = (msg) => {
  console.error(`ICON SLOTS EXAMPLE FAIL: ${msg}`);
  process.exit(1);
};

// Variation ids in document order, grouped by the slot section they sit in.
const onPage = {};
for (const m of html.matchAll(/<section class="slot" data-slot="([a-z-]+)">([\s\S]*?)<\/section>/g)) {
  onPage[m[1]] = [...m[2].matchAll(/data-variation="([a-z0-9-]+)"/g)].map((x) => x[1]);
}
for (const s of slots) {
  const want = (s.variations || []).map((v) => v.id);
  if (want.length !== 5) fail(`slot ${s.id} lists ${want.length} variations, expected 5`);
  const got = onPage[s.id] || [];
  if (got.join() !== want.join()) fail(`slot ${s.id}: page has ${got.join(', ') || 'nothing'}, taxonomy has ${want.join(', ')}`);
}
const extra = Object.keys(onPage).filter((id) => !slots.some((s) => s.id === id));
if (extra.length) fail(`page has slots not in the taxonomy: ${extra.join(', ')}`);

const diag = await diagnose(page);
if (diag.rulesHit !== 0) fail(`the page hits ${diag.rules.map((r) => `${r.ruleId} (${r.counts ? JSON.stringify(r.counts) : ''})`).join(', ')}`);

console.log(`variations: ${slots.map((s) => `${s.id} ${onPage[s.id].length}`).join(', ')}`);
console.log(`page: 0 rules hit at ${diag.widths.join(' and ')}`);
console.log('ICON SLOTS EXAMPLE OK');
