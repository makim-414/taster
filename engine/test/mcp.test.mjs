import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { RULES } from '../diagnose.mjs';

const server = fileURLToPath(new URL('../mcp.mjs', import.meta.url));
const fixture = fileURLToPath(new URL('../../rules/fixtures/slop.html', import.meta.url));

test('the MCP server diagnoses over stdio and suggests swaps', { timeout: 120000 }, async () => {
  const client = new Client({ name: 'taster-test', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.map((t) => t.name).sort().join(','), 'brand_theme,browse_components,diagnose,explain_rule,extract_content,get_component,get_pattern,list_patterns,list_rules,preview_component,suggest_swaps,taxonomy');

    // The opening question comes from the skill's start guide, so the prompt and the skill say the same thing.
    const { prompts } = await client.listPrompts();
    assert.deepEqual(prompts.map((p) => p.name), ['start']);
    const start = await client.getPrompt({ name: 'start', arguments: { request: 'check my site' } });
    const startText = start.messages[0].content.text;
    assert.match(startText, /Is this a site that already exists, or are we building a new one\?/);
    assert.match(startText, /이미 있는 사이트인가요, 아니면 새로 지을까요\?/);
    assert.match(startText, /The user said: check my site/);

    const extracted = await client.callTool({ name: 'extract_content', arguments: { target: fixture } });
    assert.ok(!extracted.isError, extracted.content[0].text);
    assert.ok(JSON.parse(extracted.content[0].text).sections.length >= 3);
    assert.ok((await client.callTool({ name: 'extract_content', arguments: { target: '/no/such/file.html' } })).isError);

    const theme = await client.callTool({ name: 'brand_theme', arguments: { target: fixture } });
    assert.ok(!theme.isError, theme.content[0].text);
    const t = JSON.parse(theme.content[0].text);
    assert.match(t.css, /:root, :root\[data-theme\], \.theme-dark, \.theme-light \{/);
    assert.ok(t.tokens['--success'] && t.tokens['--danger'] && t.notes.length >= 3);

    // Choosing by eye: numbered candidates, one picture each, a live link each, and one board link for all of them.
    const browsed = await client.callTool({ name: 'browse_components', arguments: { query: 'hero', limit: 3, theme: 'light', brand: '#e4002b' } });
    assert.ok(!browsed.isError, browsed.content[0].text);
    const pictures = browsed.content.filter((c) => c.type === 'image');
    assert.equal(pictures.length, 3);
    assert.ok(pictures.every((c) => c.mimeType === 'image/jpeg' && Buffer.from(c.data, 'base64').length > 2000));
    const words = browsed.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    assert.match(words, /\/board\?ids=[^\s]+&brand=e4002b&theme=light/);
    assert.match(words, /1\. blocks\/[\w-]*hero/);
    assert.match(words, /\/components\/blocks\/[\w-]*hero\?brand=e4002b&theme=light/);
    assert.match(words, /Do not write code until they choose/);
    const dark = await client.callTool({ name: 'browse_components', arguments: { ids: ['blocks/button'], theme: 'dark' } });
    const light = await client.callTool({ name: 'browse_components', arguments: { ids: ['blocks/button'], theme: 'light' } });
    assert.notEqual(dark.content.find((c) => c.type === 'image').data, light.content.find((c) => c.type === 'image').data);
    assert.ok((await client.callTool({ name: 'browse_components', arguments: { ids: ['blocks/nope'] } })).isError);
    assert.match((await client.callTool({ name: 'browse_components', arguments: { query: 'zzzqqq' } })).content[0].text, /No component matches/);

    // The picture changes with the brand: the same component renders differently for each look.
    const preview = (args) => client.callTool({ name: 'preview_component', arguments: { id: 'blocks/button', theme: 'light', width: 600, ...args } });
    const plain = await preview({});
    const red = await preview({ brand: '#e4002b' });
    assert.ok(!plain.isError && !red.isError, (plain.isError ? plain : red).content[0].text);
    assert.notEqual(plain.content.find((c) => c.type === 'image').data, red.content.find((c) => c.type === 'image').data);
    assert.match(red.content[0].text, /\/components\/blocks\/button\?brand=e4002b&theme=light/);
    const fromTheme = await preview({ tokens: { '--brand': '#0a7f3f', '--accent-fg': '#ffffff' } });
    assert.notEqual(fromTheme.content.find((c) => c.type === 'image').data, plain.content.find((c) => c.type === 'image').data);
    assert.ok((await client.callTool({ name: 'preview_component', arguments: { id: 'blocks/nope' } })).isError);

    const listed = JSON.parse((await client.callTool({ name: 'list_rules', arguments: {} })).content[0].text);
    assert.equal(listed.length, RULES.length);

    const explained = await client.callTool({ name: 'explain_rule', arguments: { id: 'ac-01' } });
    assert.ok(!explained.isError);
    assert.equal(JSON.parse(explained.content[0].text).severity, 'high');
    assert.ok((await client.callTool({ name: 'explain_rule', arguments: { id: 'NOPE-01' } })).isError);

    const result = await client.callTool({ name: 'diagnose', arguments: { target: fixture } });
    assert.ok(!result.isError, result.content[0].text);
    const report = JSON.parse(result.content.find((c) => c.type === 'text').text);
    assert.ok(report.rulesHit >= 10, `only ${report.rulesHit} rules hit`);
    const images = result.content.filter((c) => c.type === 'image');
    assert.equal(images.length, 2);
    for (const img of images) assert.equal(Buffer.from(img.data, 'base64').subarray(1, 4).toString(), 'PNG');

    // Every rule found has at least one fix pattern, and its components resolve to registry files.
    const ids = report.rules.map((g) => g.ruleId);
    const swaps = JSON.parse((await client.callTool({ name: 'suggest_swaps', arguments: { ruleIds: ids } })).content[0].text);
    assert.equal(swaps.length, ids.length);
    for (const s of swaps) assert.ok(s.patterns.length > 0, `no fix pattern for ${s.ruleId}`);
    for (const c of swaps.flatMap((s) => s.patterns.flatMap((p) => p.components))) assert.ok(!c.missing, `missing component ${c.id}`);

    const pattern = await client.callTool({ name: 'get_pattern', arguments: { id: swaps[0].patterns[0].id } });
    assert.match(pattern.content[0].text, /## Swap recipe/);
    const component = await client.callTool({ name: 'get_component', arguments: { id: 'blocks/badge' } });
    assert.match(component.content[0].text, /export/);
    assert.match(component.content[0].text, /registry\/src\/tokens\.css/);
    const hero = JSON.parse((await client.callTool({ name: 'list_patterns', arguments: { category: 'hero', surface: 'landing' } })).content[0].text);
    assert.ok(hero.length >= 2);
    assert.ok((await client.callTool({ name: 'get_pattern', arguments: { id: '../etc' } })).isError);
  } finally {
    await client.close();
  }
});
