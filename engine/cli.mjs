#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { RESPONSIVE_WIDTHS, RULES, VIEWPORTS, diagnose, explainRule, extract, formatText, viewportFor } from './diagnose.mjs';
import { brandTheme } from './brand.mjs';
import { checkConsistency, formatConsistencyText } from './consistency.mjs';
import { PLAN_FILE, nextStep, planFromExtract, planRelative, writePlan } from './plan.mjs';

const HELP = `Usage
  node engine/cli.mjs <url-or-file> [--out <dir>] [--json] [--widths 1440,390]
  node engine/cli.mjs <url-or-file> --extract [--out <dir>]
  node engine/cli.mjs <url-or-file> --brand [--json] [--out <dir>]
  node engine/cli.mjs --system [brand url or file] [--ref <url or file> ...] [--axis name=value ...] [--surface id] [--scheme dark|light] --out <dir> [--json]
  node engine/cli.mjs --tune <dir>/taster.system.json name=value ... [--json]
  node engine/cli.mjs --consistency <screen> <screen> ... [--system <file>]... [--logo-font <family>] [--json] [--out <dir>]
  node engine/cli.mjs --plan <url-or-file> --out <dir> [--route rebuild] [--system <file>] [--by-part]
  node engine/cli.mjs --rules
  node engine/cli.mjs --explain <rule-id>

Options
  --out <dir>       write report.json and annotated-<width>.png into <dir>
  --json            print the report as JSON
  --extract         print the page content (sections, actions, images, brand) for a rebuild
  --brand           read the site's brand (color, typeface, logo) and print a token theme fitted to it
  --consistency     render each screen at 1440 and 390 and report drift between screens and values off the
                    --system (theme CSS or { tokens } JSON, repeatable: tokens.css then theme.css)
  --logo-font <f>   the logo wordmark's own face: exempt for font-family inside the logo only, listed as exempt
                    (taster.system.json can declare it as identity.logoFont)
  --plan            write ${PLAN_FILE} into --out: the start page and the same-site pages its nav links to,
                    one screen at a time (--by-part splits each read page into its sections)
  --widths <list>   viewport widths, default ${VIEWPORTS.map((v) => v.width).join(',')}
                    'responsive' runs ${RESPONSIVE_WIDTHS.join(',')}

Exit codes: 0 no findings, 1 findings, 2 error`;

function viewportsFrom(list) {
  if (!list) return VIEWPORTS;
  if (list.trim() === 'responsive') return RESPONSIVE_WIDTHS.map(viewportFor);
  return list.split(',').map((w) => {
    const width = Number(w.trim());
    if (!Number.isInteger(width) || width < 320 || width > 3840) throw new Error(`Bad width: ${w}`);
    return viewportFor(width);
  });
}

async function main() {
  // Design system: brand and references in, balanced axes and every token out (engine/system.mjs).
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
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.log(HELP);
    return 0;
  }
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
  if (positionals.length !== 1) {
    console.error(HELP);
    return 2;
  }

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
  const report = await diagnose(positionals[0], { viewports: viewportsFrom(values.widths), outDir: values.out || null });
  if (values.out) writeFileSync(join(values.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(values.json ? JSON.stringify(report, null, 2) : formatText(report));
  return report.rulesHit > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`taster: ${err.message}`);
    process.exit(2);
  },
);
