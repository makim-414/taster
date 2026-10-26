#!/usr/bin/env node
// MCP server over stdio. Diagnose tools: diagnose, list_rules, explain_rule.
// Swap tools: suggest_swaps, list_patterns, get_pattern, get_component, taxonomy.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RULES, VIEWPORTS, diagnose, explainRule } from './diagnose.mjs';
import { getComponent, getPattern, listPatterns, loadTaxonomy, suggestSwaps } from './catalog.mjs';

const server = new McpServer({ name: 'taster', version: '0.1.0' });
const json = (value) => ({ type: 'text', text: JSON.stringify(value, null, 2) });

server.registerTool(
  'diagnose',
  {
    title: 'Diagnose a page',
    description:
      'Open a URL or a local HTML file in a real browser at 1440 and 390 wide, run the taster detector, and return every finding grouped by rule with selector, page rect, evidence, severity, fix and fix patterns. Also returns one capture per width with each finding outlined and labeled by rule id, and the list of manual rules to judge by eye.',
    inputSchema: {
      target: z.string().describe('http(s) URL, file:// URL, or path to a local HTML file'),
      widths: z.array(z.number().int().min(320).max(3840)).max(4).optional().describe('viewport widths, default [1440, 390]'),
      screenshots: z.boolean().optional().describe('return the annotated captures, default true'),
    },
  },
  async ({ target, widths, screenshots = true }) => {
    const dir = screenshots ? mkdtempSync(join(tmpdir(), 'taster-')) : null;
    try {
      const viewports = widths ? widths.map((width) => VIEWPORTS.find((v) => v.width === width) || { width, height: width < 768 ? 844 : 900 }) : VIEWPORTS;
      const report = await diagnose(target, { viewports, outDir: dir });
      const content = [json({ ...report, screenshots: undefined })];
      for (const file of report.screenshots) content.push({ type: 'image', mimeType: 'image/png', data: readFileSync(file).toString('base64') });
      return { content };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `diagnose failed: ${err.message}` }] };
    } finally {
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  },
);

server.registerTool(
  'list_rules',
  {
    title: 'List rules',
    description: 'Every slop rule with id, name, severity and how it is checked (deterministic rules are measured, manual rules are judged by eye).',
    inputSchema: {},
  },
  async () => ({ content: [json(RULES.map((r) => ({ id: r.id, name: r.name, severity: r.severity, level: r.detect.level })))] }),
);

server.registerTool(
  'explain_rule',
  {
    title: 'Explain a rule',
    description: 'What a rule flags, why it reads as generated, how it is checked, the fix and the fix patterns.',
    inputSchema: { id: z.string().describe('rule id such as AC-01') },
  },
  async ({ id }) => {
    const rule = explainRule(id);
    if (!rule) return { isError: true, content: [{ type: 'text', text: `Unknown rule: ${id}` }] };
    return { content: [json(rule)] };
  },
);

const guard = (fn) => async (args) => {
  try {
    return await fn(args || {});
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: err.message }] };
  }
};
const readOnly = { readOnlyHint: true, idempotentHint: true };

server.registerTool(
  'suggest_swaps',
  {
    title: 'Suggest replacements',
    description: 'For rule ids found by diagnose, return the patterns that fix each rule and the registry components for each pattern. Next, call get_pattern for the swap recipe and get_component for code.',
    inputSchema: { ruleIds: z.array(z.string()).min(1).describe('rule ids such as AC-01, CMP-04') },
    annotations: readOnly,
  },
  guard(async ({ ruleIds }) => ({ content: [json(suggestSwaps(ruleIds))] })),
);

server.registerTool(
  'list_patterns',
  {
    title: 'List patterns',
    description: 'Pattern stubs (id, name, category, uses, surfaces, replaces, components, summary). Filters combine with AND. Use this to build a screen from scratch: pick a surface, then one pattern per use.',
    inputSchema: {
      family: z.string().optional(),
      category: z.string().optional(),
      use: z.string().optional(),
      surface: z.string().optional(),
      rule: z.string().optional().describe('only patterns that fix this rule id'),
    },
    annotations: readOnly,
  },
  guard(async (filters) => ({ content: [json(listPatterns(filters))] })),
);

server.registerTool(
  'get_pattern',
  {
    title: 'Get a pattern',
    description: 'Full Markdown of one pattern: when to use, anatomy, do, don\'t, swap recipe with before and after code, tokens.',
    inputSchema: { id: z.string().describe('pattern id, kebab-case') },
    annotations: readOnly,
  },
  guard(async ({ id }) => ({ content: [{ type: 'text', text: getPattern(id) }] })),
);

server.registerTool(
  'get_component',
  {
    title: 'Get a component',
    description: 'Source of a registry component (for example blocks/badge) with the shared helpers and token files it needs, ready to copy into an app.',
    inputSchema: { id: z.string().describe('registry component id') },
    annotations: readOnly,
  },
  guard(async ({ id }) => ({ content: [{ type: 'text', text: getComponent(id) }] })),
);

server.registerTool(
  'taxonomy',
  {
    title: 'Taxonomy',
    description: 'Families, categories, uses and surfaces used to organize and filter patterns.',
    inputSchema: {},
    annotations: readOnly,
  },
  guard(async () => ({ content: [json(loadTaxonomy())] })),
);

await server.connect(new StdioServerTransport());
