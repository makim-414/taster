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

test('pages with a strict Content-Security-Policy can still be diagnosed and read', { timeout: 60000 }, async () => {
  const { diagnose } = await import('../diagnose.mjs');
  const csp = fileURLToPath(new URL('./fixtures/csp.html', import.meta.url));
  const report = await diagnose(csp, { viewports: [{ width: 1440, height: 900 }] });
  assert.ok(report.rules.some((r) => r.ruleId === 'AC-01'), 'the uppercase eyebrow should be found');
  const content = await extract(csp);
  assert.equal(content.sections.find((s) => s.heading)?.heading.text, 'A page that forbids inline scripts');
});

test('a page whose load event never fires is still diagnosed', { timeout: 90000 }, async () => {
  const { createServer } = await import('node:http');
  const { diagnose } = await import('../diagnose.mjs');
  const hung = [];
  const server = createServer((req, res) => {
    if (req.url === '/slow.png') return hung.push(res); // never answers, so load never fires
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html lang="en"><body><h1>Still here</h1><p style="text-transform:uppercase;letter-spacing:.2em">heavy page</p><img src="/slow.png" alt=""></body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const report = await diagnose(`http://127.0.0.1:${server.address().port}/`, { viewports: [{ width: 1440, height: 900 }], timeout: 30000 });
    assert.ok(report.rules.some((r) => r.ruleId === 'AC-01'));
  } finally {
    hung.forEach((res) => res.destroy());
    server.close();
  }
});
