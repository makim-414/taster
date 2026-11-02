import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMcpRequest } from '../http.mjs';

// Each call is a fresh stateless POST, as a serverless function would see it.
async function rpc(method, params, remote) {
  const request = new Request('https://taster.test/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const res = await handleMcpRequest(request, { remote });
  assert.equal(res.status, 200, `${method} answered ${res.status}`);
  return (await res.json()).result;
}

const fake = {
  calls: [],
  async diagnose(url) {
    this.calls.push(url);
    return { report: { url, rulesHit: 1, findings: 2 }, shots: { 1440: 'data:image/jpeg;base64,AAAA' } };
  },
};

test('hosted MCP answers initialize, lists only the hosted tools and runs them', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } }, fake);
  assert.equal(init.serverInfo.name, 'taster');

  const { tools } = await rpc('tools/list', {}, fake);
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['browse_components', 'diagnose', 'explain_rule', 'get_component', 'get_pattern', 'list_patterns', 'list_rules', 'pick_tone', 'preview_component', 'suggest_swaps', 'taxonomy']);
  assert.ok(!names.includes('extract_content') && !names.includes('brand_theme'), 'local-file tools stay out of hosted mode');

  // Hosted, a preview is the still plus the live link, since there is no render without a local browser.
  const still = await rpc('tools/call', { name: 'preview_component', arguments: { id: 'blocks/button', brand: '#e4002b' } }, fake);
  assert.ok(still.content.some((c) => c.type === 'image'));
  assert.match(still.content[0].text, /brand=e4002b/);

  const rule = await rpc('tools/call', { name: 'explain_rule', arguments: { id: 'AC-01' } }, fake);
  assert.match(rule.content[0].text, /"id": "AC-01"/);

  const diag = await rpc('tools/call', { name: 'diagnose', arguments: { target: 'https://example.com/' } }, fake);
  assert.deepEqual(fake.calls, ['https://example.com/']);
  assert.match(diag.content[0].text, /"rulesHit": 1/);
  assert.equal(diag.content[1].type, 'image');
  assert.equal(diag.content[1].mimeType, 'image/jpeg');

  const prompts = await rpc('prompts/list', {}, fake);
  assert.ok(prompts.prompts.some((p) => p.name === 'start'));
});

test('hosted pick_tone shows the pictures the host could take, a link for the rest, and the live parts link', async () => {
  const asked = [];
  const remote = {
    ...fake,
    async tone(ids) {
      asked.push(ids);
      return { [ids[0]]: { status: 'ok', image: 'data:image/jpeg;base64,AAAA' }, [ids[1]]: { status: 'blocked' } };
    },
  };
  const out = await rpc('tools/call', { name: 'pick_tone', arguments: { x: 0.9, y: 0.1, genre: 'geek' } }, remote);
  assert.ok(!out.isError, out.content[0].text);
  assert.equal(asked[0].length, 4);
  assert.equal(out.content.filter((c) => c.type === 'image').length, 1);
  const text = out.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  assert.match(text, /bot check or a block page/);
  assert.match(text, /The parts wearing these tokens, live: https:\/\/[^\s]+\/tone\?x=0\.9&y=0\.1&genre=geek/);

  // A host without a capture function still answers, with links only.
  const plain = await rpc('tools/call', { name: 'pick_tone', arguments: { like: 'govuk' } }, fake);
  assert.ok(!plain.isError);
  assert.equal(plain.content.filter((c) => c.type === 'image').length, 0);
  assert.match(plain.content[1].text, /^1\. GOV\.UK/);
});

test('a diagnose failure comes back as a tool error, not a crash', async () => {
  const failing = { diagnose: async () => { throw new Error('private address refused'); } };
  const out = await rpc('tools/call', { name: 'diagnose', arguments: { target: 'http://10.0.0.1/' } }, failing);
  assert.equal(out.isError, true);
  assert.match(out.content[0].text, /private address refused/);
});

test('handleMcpRequest refuses to run without a fenced diagnose', async () => {
  await assert.rejects(() => handleMcpRequest(new Request('https://taster.test/api/mcp', { method: 'POST' }), {}), /remote\.diagnose/);
});
