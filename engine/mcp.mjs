#!/usr/bin/env node
// MCP server over stdio. Prompt: start (the opening question). Diagnose tools: diagnose, list_rules, explain_rule.
// Brand tool: brand_theme. System tools: design_system, tune_system, system_for_category. Rebuild tool: extract_content. Swap tools: suggest_swaps, list_patterns, get_pattern, get_component, taxonomy.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RESPONSIVE_WIDTHS, RULES, VIEWPORTS, diagnose, explainRule, extract, viewportFor } from './diagnose.mjs';
import { brandTheme } from './brand.mjs';
import { getComponent, getPattern, listPatterns, loadTaxonomy, suggestSwaps } from './catalog.mjs';

const server = new McpServer({ name: 'taster', version: '0.1.0' });
const json = (value) => ({ type: 'text', text: JSON.stringify(value, null, 2) });
const START_GUIDE = fileURLToPath(new URL('../skills/taster/references/start.md', import.meta.url));

// The opening question every session starts with. The text lives in the skill so both say the same thing.
server.registerPrompt(
  'start',
  {
    title: 'Start Taster',
    description: 'Ask whether the site already exists or is being built new, then take the matching route (diagnose and swap, diagnose and rebuild, or build).',
    argsSchema: { request: z.string().optional().describe('what the user asked for, if anything') },
  },
  ({ request }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${readFileSync(START_GUIDE, 'utf8')}\n---\n${request ? `The user said: ${request}\n\n` : ''}Follow the guide above. Your first reply is the opening question, unless the user's words already answer it.`,
        },
      },
    ],
  }),
);

server.registerTool(
  'diagnose',
  {
    title: 'Diagnose a page',
    description:
      'Open a URL or a local HTML file in a real browser at 1440 and 390 wide, run the taster detector, and return every finding grouped by rule with selector, page rect, evidence, severity, fix and fix patterns. Also returns one capture per width with each finding outlined and labeled by rule id, and the list of manual rules to judge by eye.',
    inputSchema: {
      target: z.string().describe('http(s) URL, file:// URL, or path to a local HTML file'),
      widths: z.array(z.number().int().min(320).max(3840)).max(9).optional().describe(`viewport widths, default [1440, 390]; for a responsive check pass [${RESPONSIVE_WIDTHS.join(', ')}]`),
      screenshots: z.boolean().optional().describe('return the annotated captures, default true'),
    },
  },
  async ({ target, widths, screenshots = true }) => {
    const dir = screenshots ? mkdtempSync(join(tmpdir(), 'taster-')) : null;
    try {
      const viewports = widths ? widths.map(viewportFor) : VIEWPORTS;
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
  'extract_content',
  {
    title: 'Read a page for a rebuild',
    description:
      "Open a URL or a local HTML file in a real browser and return its content in reading order: sections (each h1 or h2 with its text, subheadings, lists, actions with their targets, images, quotes and forms), nav and footer links, and the brand (name or logo, the most used solid action color, heading and body fonts, dark or light). Emoji are stripped. Use it to rebuild a page the user has no source for, then compare the rebuild's content with this one.",
    inputSchema: { target: z.string().describe('http(s) URL, file:// URL, or path to a local HTML file') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ target }) => {
    try {
      return { content: [json(await extract(target))] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `extract_content failed: ${err.message}` }] };
    }
  },
);

server.registerTool(
  'brand_theme',
  {
    title: "Absorb a site's brand",
    description:
      "Open a URL or a local HTML file, read its brand (the solid color on its own buttons and links, its typeface, its logo, light or dark) and return token overrides fitted to it: --brand and the text color on it, --font (kept when it was a real choice, replaced when it is a stock or usual AI default), and success and failure colors moved away from the brand hue. Returns the tokens, a ready :root CSS block to load after registry/src/tokens.css, and notes that say why each choice was made. Use it after diagnosing an existing site and before swapping or rebuilding.",
    inputSchema: { target: z.string().describe('http(s) URL, file:// URL, or path to a local HTML file') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ target }) => {
    try {
      return { content: [json(brandTheme(await extract(target)))] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `brand_theme failed: ${err.message}` }] };
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
    description: 'The strict taxonomy: families and categories (each with definition, includes, excludes and examples), the classify decision key over a boolean feature vocabulary, uses, surfaces, the weighting axes with the tokens each drives, snap steps, per-category relevance, design constraints, the rule map and gaps, plus the icon slot map (iconography). See taxonomy/SCHEMA.md.',
    inputSchema: {},
    annotations: readOnly,
  },
  guard(async () => ({ content: [json(loadTaxonomy())] })),
);

// Design system tools (engine/system.mjs): brand and references in, balanced axes and every token out.
{
  const sys = await import('./system.mjs');
  const { existsSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const systemArg = z.union([z.string(), z.record(z.string(), z.any())]).describe('path to a taster.system.json, or the system object itself');
  const load = (s) => (typeof s === 'string' ? sys.readSystem(s) : s);
  const run = (name, fn) => async (args) => {
    try {
      return { content: [json(await fn(args || {}))] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `${name} failed: ${err.message}` }] };
    }
  };
  server.registerTool(
    'design_system',
    {
      title: 'Make the design system',
      description:
        "Turn the brand's identity and the tone of references into one balanced design system before any screen is built. Reads the brand site (color, typeface, logo, light or dark) and measures each page in a real browser for the eight axes (radii, spacing and control heights, text contrast, type scale, hues, shadows, motion, borders). Axes come from builder intent first, then the references, then the brand site, then the taxonomy default; balance keeps every design constraint. Returns axes with step names, axisNotes saying where each came from and what balance moved (quoting the principle), every token the axes drive plus the brand tokens, and a theme.css block. With out, writes taster.system.json and theme.css there.",
      inputSchema: {
        brand: z.string().optional().describe('the brand site: URL or local HTML file'),
        references: z.array(z.string()).max(6).optional().describe('pages whose tone the builder likes'),
        axes: z.record(z.string(), z.number()).optional().describe('builder intent, e.g. { "density": 0.75 }; values on the taxonomy snap steps'),
        surface: z.string().optional().describe('surface id from the taxonomy, recorded for the screens'),
        scheme: z.enum(['dark', 'light']).optional(),
        out: z.string().optional().describe('directory to write taster.system.json and theme.css'),
      },
      annotations: { openWorldHint: true },
    },
    run('design_system', async ({ brand, references = [], axes, surface, scheme, out }) => {
      const system = await sys.designSystem({ brand: brand || null, references, intent: { axes, surface, scheme } });
      return out ? { files: sys.writeSystem(out, system), system } : system;
    }),
  );
  server.registerTool(
    'tune_system',
    {
      title: 'Move a weight',
      description:
        'The exchange with the builder: move one or more axes of a design system. The moved axes stay where the builder put them, the others move the least needed to keep every constraint, and the result says which moved and why (the constraint principle). Tokens and theme.css are regenerated. Given a path, the files are rewritten in place.',
      inputSchema: { system: systemArg, axes: z.record(z.string(), z.number()).describe('e.g. { "roundness": 1 }') },
    },
    run('tune_system', async ({ system, axes }) => {
      const next = sys.tuneSystem(load(system), axes);
      const summary = next.tuned[next.tuned.length - 1].summary;
      if (typeof system === 'string' && existsSync(system)) return { summary, files: sys.writeSystem(dirname(system), next), system: next };
      return { summary, system: next };
    }),
  );
  server.registerTool(
    'system_for_category',
    {
      title: 'Tokens that matter for a part',
      description: "For one taxonomy category, the axes ordered by relevance with this system's step and the tokens each drives, so the builder of that part knows which values matter most. Parts read these through the alias tokens only.",
      inputSchema: { system: systemArg, category: z.string().describe('category id, e.g. table, hero, button') },
      annotations: readOnly,
    },
    run('system_for_category', async ({ system, category }) => sys.systemForCategory(load(system), category)),
  );
}

await server.connect(new StdioServerTransport());
