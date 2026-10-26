import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contentParity, extract } from '../diagnose.mjs';

const before = fileURLToPath(new URL('../../examples/rebuild/before.html', import.meta.url));

test('extract reads the words as written, without the decoration', { timeout: 60000 }, async () => {
  const c = await extract(before);
  assert.equal(c.lang, 'en');
  assert.equal(c.brand.name, 'Acme Ledger');
  assert.equal(c.brand.dark, true);
  assert.deepEqual(c.nav.map((n) => n.text), ['Product', 'Pricing', 'Docs']);
  const h1 = c.sections.find((s) => s.heading?.level === 1);
  assert.equal(h1.heading.text, 'Close your books 10x faster with effortless clarity');
  assert.deepEqual(h1.subheadings.map((h) => h.text), ['Lightning fast', 'Bank-grade security', 'AI insights']);
  assert.deepEqual(h1.actions.map((a) => [a.text, a.filled]), [['Get started', false], ['Book a demo', true]]);
  const all = JSON.stringify(c);
  // The eyebrow is uppercased by CSS only; the rebuild gets the words as the owner typed them.
  assert.ok(all.includes('The future of finance') && !all.includes('THE FUTURE OF FINANCE'));
  assert.ok(!/\p{Extended_Pictographic}/u.test(all), 'emoji should be stripped');
});

test('content parity reports what a rebuild dropped', () => {
  const page = (headings, actions, nav = []) => ({
    nav: nav.map((text) => ({ text })),
    sections: [{ heading: { level: 1, text: headings[0] }, subheadings: headings.slice(1).map((text) => ({ level: 3, text })), actions: actions.map((text) => ({ text })), links: [], text: [], lists: [], quotes: [] }],
  });
  const original = page(['Close your books', 'Fast', 'Secure'], ['Get started', 'Book a demo'], ['Pricing']);
  assert.deepEqual(contentParity(original, original), { expected: 6, kept: 6, missing: [] });
  // Negative control: drop one heading and one action, case and punctuation differences do not count as drops.
  const rebuilt = page(['close your books.', 'Fast'], ['Get started!'], ['Pricing']);
  assert.deepEqual(contentParity(original, rebuilt).missing, ['Secure', 'Book a demo']);
});
