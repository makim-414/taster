#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { RESPONSIVE_WIDTHS, RULES, VIEWPORTS, diagnose, explainRule, extract, formatText, viewportFor } from './diagnose.mjs';
import { brandTheme } from './brand.mjs';
import { checkConsistency, formatConsistencyText } from './consistency.mjs';
import { PLAN_FILE, nextStep, planFromExtract, planRelative, writePlan } from './plan.mjs';

const HELP = `Usage
  taster <url-or-file>... [--out <dir>] [--json] [--widths 1440,390] [--sarif <file>] [--summary <file>] [--fail-on <level>]
  taster <url-or-file> --extract [--out <dir>]
  taster <url-or-file> --brand [--json] [--out <dir>]
  taster --system [brand url or file] [--ref <url or file> ...] [--axis name=value ...] [--surface id] [--scheme dark|light] --out <dir> [--json]
  taster --tune <dir>/taster.system.json name=value ... [--json]
  taster --consistency <screen> <screen> ... [--system <file>]... [--logo-font <family>] [--json] [--out <dir>]
  taster --plan <url-or-file> --out <dir> [--route rebuild] [--system <file>] [--by-part]
  taster --rules
  taster --explain <rule-id>
  taster add <component-id>... [--dir <dir>] [--from <url>] [--overwrite]
  taster add --list
  taster export <agents|claude|cursor|windsurf|cline|copilot|gemini|all> [--dir <project>]
  taster lint [paths...] [--json] [--baseline <file>] [--write-baseline] [--selftest]
  taster mcp                 MCP server on stdio
  taster acp [--setup]       ACP agent on stdio; --setup prepares the browser in a terminal
  taster setup               check for a browser, download Chromium if none works
  taster --version

In a clone of the repository, run node packages/engine/taster.mjs (or node packages/engine/cli.mjs for all but mcp, acp and setup)
in place of taster.

A target is an http(s) URL, localhost:<port> (opened as http), a bare domain (opened as https), or a local .html,
.htm, .xhtml or .svg file. Other local files are refused, and a missing file is never guessed into a web address.

Options
  --out <dir>       write report.json and annotated-<width>.jpg into <dir> (one target only); a capture taller than
                    one image allows comes as annotated-<width>-2.jpg and on, 2000px each
  --json            print the report as JSON
  --extract         print the page content (sections, actions, images, brand) for a rebuild
  --brand           read the site's brand (color, typeface, logo) and print a token theme fitted to it
  --consistency     render each screen at 1440 and 390 and report drift between screens and values off the
                    --system (theme CSS or { tokens } JSON, repeatable: tokens.css then theme.css)
  --logo-font <f>   the logo wordmark's own face: exempt for font-family inside the logo only, listed as exempt
                    (taster.system.json can declare it as identity.logoFont)
  --plan            write ${PLAN_FILE} into --out: the start page and the same-site pages its nav links to,
                    one screen at a time (--by-part splits each read page into its sections)
  --sarif <file>    also write the findings as SARIF 2.1.0 (GitHub code scanning)
  --summary <file>  also append a Markdown table (for $GITHUB_STEP_SUMMARY)
  --fail-on <level> exit 1 only for findings at this severity or above: high, medium, low (default) or none
  --widths <list>   viewport widths, default ${VIEWPORTS.map((v) => v.width).join(',')}
                    'responsive' runs ${RESPONSIVE_WIDTHS.join(',')}
  --version         print the version

add copies registry components into your app with every helper they import and the token files, no shadcn
needed. --dir defaults to src/components/taster. --from reads a hosted copy (https://taster-six.vercel.app)
instead of this repository. Files you changed are left alone unless --overwrite.

lint reads source files (tsx, jsx, vue, svelte, html, css, md) for the code form of the rules: tinted and outlined
pills, thick left bars, caps with wide tracking, long dashes, emoji, transition-all, ease-in, hard-coded colors,
pixel one-offs, stock palette classes and Tailwind screens that drop the defaults. --baseline makes it a ratchet:
counts per file and check may only go down. A line passes with a comment taster-allow <reason>.

Not diagnosed: when a URL answers with a bot check, a block page, an HTTP error (4xx, 5xx) or a redirect to a
sign-in page on another host, nothing is measured and the report says so instead of listing findings. Taster
does not get past checks or sign-in.

Environment
  TASTER_ROOT=<dir>     open local files only inside <dir>
  TASTER_WEB_URL=<url>  where the component and board links the MCP server gives point,
                        default https://taster-six.vercel.app (for a self-hosted copy of the site)

Exit codes: 0 no findings at --fail-on or above, 1 findings, 2 error or a target not diagnosed`;

function viewportsFrom(list) {
  if (!list) return VIEWPORTS;
  if (list.trim() === 'responsive') return RESPONSIVE_WIDTHS.map(viewportFor);
  return list.split(',').map((w) => {
    const width = Number(w.trim());
    if (!Number.isInteger(width) || width < 320 || width > 3840) throw new Error(`Bad width: ${w}`);
    return viewportFor(width);
  });
}

async function add(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { dir: { type: 'string' }, from: { type: 'string' }, overwrite: { type: 'boolean' }, list: { type: 'boolean' }, json: { type: 'boolean' } },
  });
  const { fetchBundle, loadRegistry, resolveComponents, writeBundle } = await import('./add.mjs');
  if (values.list) {
    for (const c of loadRegistry().components) console.log(`${c.id.padEnd(30)} ${c.category}`);
    return 0;
  }
  if (!positionals.length) throw new Error('add needs at least one component id, for example: add blocks/button');
  const bundle = values.from ? await fetchBundle(positionals, values.from) : resolveComponents(positionals);
  const dir = values.dir || join('src', 'components', 'taster');
  const { written, skipped } = writeBundle(bundle, dir, { overwrite: values.overwrite });
  if (values.json) {
    console.log(JSON.stringify({ dir, written, skipped, npm: bundle.npm, credits: bundle.credits }, null, 2));
    return 0;
  }
  console.log(`Added to ${dir}:`);
  for (const f of written) console.log(`  ${f}`);
  for (const f of skipped) console.log(`  ${f}  (kept your copy, it differs; --overwrite to replace)`);
  if (bundle.npm.length) console.log(`\nInstall: npm install ${bundle.npm.join(' ')}`);
  console.log(`\nThen import ${join(dir, 'tokens.css')} once at your app root and add ${join(dir, 'tailwind-preset.cjs')} to your Tailwind presets.`);
  const upstream = bundle.credits.filter((c) => /MIT|Apache|BSD/i.test(c.credit || ''));
  if (upstream.length) console.log(`Keep the "Upstream license" lines at the top of copied files; the full texts are in ${join(dir, 'THIRD_PARTY_NOTICES.md')}.`);
  return 0;
}

async function exportRules(argv) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: { dir: { type: 'string' } } });
  const { TARGETS, writeTarget } = await import('./exports.mjs');
  const names = positionals[0] === 'all' ? Object.keys(TARGETS) : positionals;
  if (!names.length) throw new Error(`export needs a target: ${Object.keys(TARGETS).join(', ')} or all`);
  for (const name of names) {
    if (!TARGETS[name]) throw new Error(`Unknown target ${name}. Known: ${Object.keys(TARGETS).join(', ')}`);
    console.log(`${TARGETS[name].label}: ${writeTarget(name, values.dir || '.')}`);
  }
  return 0;
}

async function main() {
  if (process.argv[2] === 'add') return add(process.argv.slice(3));
  if (process.argv[2] === 'export') return exportRules(process.argv.slice(3));
  if (process.argv[2] === 'lint') return (await import('./lint.mjs')).lintCommand(process.argv.slice(3));
  // Design system: brand and references in, balanced axes and every token out (packages/engine/system.mjs).
  // --system is also the system file flag of --consistency and --plan, so only those two keep it.
  const own = ['--consistency', '--plan'].some((f) => process.argv.includes(f));
  if ((process.argv.includes('--system') && !own) || process.argv.includes('--tune')) return (await import('./system.mjs')).runSystemCli(process.argv.slice(2));
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      json: { type: 'boolean' },
      widths: { type: 'string' },
      rules: { type: 'boolean' },
      explain: { type: 'string' },
      extract: { type: 'boolean' },
      brand: { type: 'boolean' },
      consistency: { type: 'boolean' },
      system: { type: 'string', multiple: true },
      'logo-font': { type: 'string' },
      plan: { type: 'boolean' },
      route: { type: 'string' },
      'by-part': { type: 'boolean' },
      sarif: { type: 'string' },
      summary: { type: 'string' },
      'fail-on': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean' },
    },
  });

  if (values.help || (positionals.length === 1 && positionals[0] === 'help')) {
    console.log(HELP);
    return 0;
  }
  if (values.version) {
    // The published package's own version (the repository root package.json, two levels above packages/engine/).
    console.log(JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version);
    return 0;
  }
  // Checked before any page is opened, whichever way the findings are reported.
  const ranks = { high: 3, medium: 2, low: 1, none: 99 };
  const failOn = values['fail-on'] || 'low';
  if (!Object.hasOwn(ranks, failOn)) throw new Error(`Bad --fail-on: ${failOn} (high, medium, low or none)`);
  if (values.rules) {
    for (const r of RULES) console.log(`${r.id.padEnd(7)} ${r.detect.level.padEnd(14)} ${r.severity.padEnd(7)} ${r.name}`);
    return 0;
  }
  if (values.explain) {
    const r = explainRule(values.explain);
    if (!r) throw new Error(`Unknown rule: ${values.explain}`);
    console.log(values.json ? JSON.stringify(r, null, 2) : `${r.id}  ${r.name}  [${r.severity}, ${r.detect.level}]\n\nWhat: ${r.what}\nWhy: ${r.why}\nHow it is found: ${r.detect.signal}\nFix: ${r.fix}`);
    return 0;
  }
  if (values.consistency) {
    const report = await checkConsistency(positionals, { system: values.system || null, identity: values['logo-font'] || null, widths: values.widths ? viewportsFrom(values.widths).map((v) => v.width) : undefined });
    if (values.out) {
      mkdirSync(values.out, { recursive: true });
      writeFileSync(join(values.out, 'consistency.json'), `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(values.json ? JSON.stringify(report, null, 2) : formatConsistencyText(report));
    return report.ok ? 0 : 1;
  }
  if (values.plan) {
    if (positionals.length !== 1 || !values.out) throw new Error('--plan needs one start page and --out <dir>');
    mkdirSync(values.out, { recursive: true });
    const system = values.system ? values.system.map((f) => planRelative(values.out, f)) : null;
    const plan = planFromExtract(await extract(positionals[0]), { route: values.route || 'rebuild', system: system && system.length === 1 ? system[0] : system, byPart: !!values['by-part'], baseDir: values.out });
    const file = writePlan(values.out, plan);
    console.log(values.json ? JSON.stringify(plan, null, 2) : `${file}\n${plan.screens.map((s) => `  ${s.id}  ${s.source}  ${s.purpose}${s.parts.length ? ` (${s.parts.length} parts)` : ''}`).join('\n')}\nnext: ${nextStep(plan).say}`);
    return 0;
  }
  const many = positionals.length > 1;
  if (!positionals.length || (many && (values.brand || values.extract || values.out))) {
    console.error(HELP);
    return 2;
  }
  const viewports = viewportsFrom(values.widths);

  if (values.out) mkdirSync(values.out, { recursive: true });
  if (values.brand) {
    const theme = brandTheme(await extract(positionals[0]));
    if (values.out) writeFileSync(join(values.out, 'theme.css'), theme.css);
    console.log(values.json ? JSON.stringify(theme, null, 2) : `${theme.css}\n${theme.notes.map((n) => `- ${n}`).join('\n')}`);
    return 0;
  }
  if (values.extract) {
    const content = await extract(positionals[0]);
    if (values.out) writeFileSync(join(values.out, 'content.json'), `${JSON.stringify(content, null, 2)}\n`);
    console.log(JSON.stringify(content, null, 2));
    return 0;
  }
  // --out is refused above for several targets, so with it there is exactly one.
  const reports = [];
  for (const target of positionals) {
    const report = await diagnose(target, { viewports, outDir: values.out || null });
    if (values.out) writeFileSync(join(values.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    reports.push(report);
    console.log(values.json ? JSON.stringify(report, null, 2) : formatText(report));
  }
  if (values.sarif || values.summary) {
    const { toSarif, toSummary } = await import('./sarif.mjs');
    if (values.sarif) writeFileSync(values.sarif, `${JSON.stringify(toSarif(reports), null, 2)}\n`);
    if (values.summary) appendFileSync(values.summary, `${toSummary(reports)}\n`);
  }
  // A target that was not diagnosed fails the run as an error, after every other target has been read, since
  // its findings would have been about a block or error page, not the site.
  if (reports.some((r) => r.diagnosed === false)) return 2;
  const worst = Math.max(0, ...reports.flatMap((r) => r.rules.map((h) => ranks[h.severity] || 0)));
  return worst >= ranks[failOn] ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`taster: ${err.message}`);
    process.exit(2);
  },
);
