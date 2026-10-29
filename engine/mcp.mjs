#!/usr/bin/env node
// MCP server over stdio. Prompt: start (the opening question). Diagnose tools: diagnose, list_rules, explain_rule.
// Brand tool: brand_theme. Rebuild tool: extract_content. Swap tools: suggest_swaps, list_patterns, get_pattern, get_component, taxonomy.
// Screen by screen tools: check_consistency, plan_screens, plan_next, plan_update.
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
import { checkConsistency, formatConsistencyText } from './consistency.mjs';
import { applyStep, checkScreen, nextStep, planFromExtract, planPath, planRelative, readPlan, writePlan } from './plan.mjs';
import { dirname } from 'node:path';

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
    description: 'Families, categories, uses and surfaces used to organize and filter patterns, plus the icon slot map (iconography): which slots get an icon, which stay empty, and the one-set rules.',
    inputSchema: {},
    annotations: readOnly,
  },
  guard(async () => ({ content: [json(loadTaxonomy())] })),
);

// ---- screen by screen: one screen or one part at a time, approved by the builder, checked before the next ----
const systemArg = z.union([z.string(), z.array(z.string()).min(1)]).optional();

server.registerTool(
  'check_consistency',
  {
    title: 'Check screens against each other and the system',
    description:
      'Render each screen (URL or local HTML file) at 1440 and 390 wide and read the computed values of every button, input, card, h1 to h3, body text, link and badge: radius, typeface, size, weight, line height, padding, gap, text, fill and border colors, shadow, transition duration. Returns drift (the same component drawn differently on two screens, with selectors and screen ids) and, when a system is given (theme CSS with :root tokens, or { tokens } JSON; a list loads in order), every value that is not one of its tokens with the nearest token. ok is true only with zero findings.',
    inputSchema: {
      screens: z.array(z.string()).min(1).describe('URLs or HTML file paths, in the order the screens were built'),
      system: systemArg.describe('theme CSS or { tokens } JSON path, or a list such as [tokens.css, theme.css]'),
      widths: z.array(z.number().int().min(320).max(3840)).max(9).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  guard(async ({ screens, system, widths }) => {
    const report = await checkConsistency(screens, { system: system ?? null, widths });
    return { content: [json(report), { type: 'text', text: formatConsistencyText(report) }] };
  }),
);

server.registerTool(
  'plan_screens',
  {
    title: 'Plan the screens',
    description:
      'Read the start page and list the screens to work through: the page itself, then every same-site page its nav links to. Each screen gets a draft purpose, optional parts (byPart splits a read page into its sections) and status planned. With out, writes taster.plan.json there. Then call plan_next and follow it: one screen or part at a time, proposed to the builder, built only after their OK, checked before the next.',
    inputSchema: {
      target: z.string().describe('the start page: URL or local HTML file'),
      route: z.enum(['swap', 'rebuild', 'build']).optional().describe('default rebuild'),
      system: systemArg.describe('the design system file(s) every screen is checked against'),
      byPart: z.boolean().optional(),
      out: z.string().optional().describe('folder to write taster.plan.json into'),
    },
    annotations: { openWorldHint: true },
  },
  guard(async ({ target, route = 'rebuild', system, byPart = false, out }) => {
    const sys = system == null ? null : (Array.isArray(system) ? system : [system]).map((f) => (out ? planRelative(out, f) : f));
    const plan = planFromExtract(await extract(target), { route, system: sys && sys.length === 1 ? sys[0] : sys, byPart, baseDir: out || null });
    const file = out ? writePlan(out, plan) : null;
    return { content: [json({ file, plan, next: nextStep(plan) })] };
  }),
);

server.registerTool(
  'plan_next',
  {
    title: 'The next step',
    description: 'Read taster.plan.json and return exactly one next action: propose a screen or part, wait for the builder, build it, check it, or done. Never build before the builder approved; never start the next screen before this one is checked.',
    inputSchema: { plan: z.string().describe('path to taster.plan.json or its folder') },
    annotations: readOnly,
  },
  guard(async ({ plan }) => ({ content: [json(nextStep(readPlan(plan)))] })),
);

server.registerTool(
  'plan_update',
  {
    title: 'Record a step',
    description:
      'Move the screen (or part) in progress one step and save the plan: propose (planned to proposed; may set purpose and parts), revise (the builder asked for changes, back to planned), approve (needs note with the builder\'s own words), build (approved to built; output is the built file or URL), check (built to checked). A check without counts runs diagnose on the output and check_consistency against the checked screens and the system itself, and refuses unless both are zero. Out of order steps are refused with the reason.',
    inputSchema: {
      plan: z.string().describe('path to taster.plan.json or its folder'),
      event: z.object({
        type: z.enum(['propose', 'revise', 'approve', 'build', 'check']),
        screen: z.string(),
        part: z.string().optional(),
        note: z.string().optional(),
        purpose: z.string().optional(),
        parts: z.array(z.union([z.string(), z.object({ id: z.string().optional(), purpose: z.string() })])).optional(),
        output: z.string().optional(),
        findings: z.number().int().min(0).optional(),
        drift: z.number().int().min(0).optional(),
      }),
    },
  },
  guard(async ({ plan: path, event }) => {
    const file = planPath(path);
    const plan = readPlan(file);
    let check = null;
    if (event.type === 'check' && (event.findings === undefined || event.drift === undefined)) {
      check = await checkScreen(plan, event.screen, { baseDir: dirname(file) });
      if (check.findings || check.drift) return { isError: true, content: [json({ refused: `Not clean: ${check.findings} detector findings, ${check.drift} consistency findings. Fix them and check again.`, check })] };
      event = { ...event, findings: check.findings, drift: check.drift };
    }
    const next = applyStep(plan, event);
    writePlan(file, next);
    return { content: [json({ file, next: nextStep(next), plan: next, check })] };
  }),
);

await server.connect(new StdioServerTransport());
