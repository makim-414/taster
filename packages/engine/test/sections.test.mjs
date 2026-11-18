import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LANDING_SECTIONS, sectionCategory, suggestForSections } from '../catalog.mjs';

// A page with no findings leaves suggest_swaps no rule to start from; it then suggests parts per page section.
test('sectionCategory reads a section from its category id, its name or its heading', () => {
  assert.equal(sectionCategory('pricing'), 'pricing');
  assert.equal(sectionCategory('Plans for every team'), 'pricing');
  assert.equal(sectionCategory('Questions people ask'), 'faq');
  assert.equal(sectionCategory('Pricing FAQ'), 'faq');
  assert.equal(sectionCategory('How it works'), 'feature-section');
  assert.equal(sectionCategory('Ready to close faster?'), 'cta');
  assert.equal(sectionCategory('Footer'), 'footer');
  assert.equal(sectionCategory('Two kinds of teams'), null);
});

test('suggestForSections lists registry parts of each section category, with the browse call to show them', () => {
  const out = suggestForSections(['Pricing', 'Questions', 'Something else']);
  assert.deepEqual(out.map((s) => s.category), ['pricing', 'faq', null]);
  assert.ok(out[0].components.some((c) => c.id === 'marketing/pricing-cards'));
  assert.ok(out[1].components.some((c) => c.id === 'marketing/reveal-faq'));
  assert.deepEqual(out[0].browse, { category: 'pricing' });
  assert.deepEqual(out[2].browse, { query: 'Something else' });
  assert.deepEqual(suggestForSections().map((s) => s.category), LANDING_SECTIONS);
});

test('suggest_swaps with no rule ids answers per section instead of failing', async () => {
  const client = new Client({ name: 'taster-test', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../mcp.mjs', import.meta.url))] }));
  try {
    const empty = await client.callTool({ name: 'suggest_swaps', arguments: { ruleIds: [], sections: ['Hero', 'Pricing'] } });
    assert.ok(!empty.isError, empty.content[0].text);
    assert.match(empty.content[0].text, /^No rule ids, so nothing to fix/);
    assert.match(empty.content[0].text, /browse_components \{ category \}/);
    assert.deepEqual(JSON.parse(empty.content[1].text).map((s) => s.category), ['hero', 'pricing']);
    const none = await client.callTool({ name: 'suggest_swaps', arguments: {} });
    assert.ok(!none.isError);
    assert.equal(JSON.parse(none.content[1].text).length, LANDING_SECTIONS.length);
    const rules = await client.callTool({ name: 'suggest_swaps', arguments: { ruleIds: ['AC-01'] } });
    assert.equal(JSON.parse(rules.content[0].text)[0].ruleId, 'AC-01');
  } finally {
    await client.close();
  }
});
