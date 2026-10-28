#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { RESPONSIVE_WIDTHS, RULES, VIEWPORTS, diagnose, explainRule, extract, formatText, viewportFor } from './diagnose.mjs';
import { brandTheme } from './brand.mjs';

const HELP = `Usage
  node engine/cli.mjs <url-or-file> [--out <dir>] [--json] [--widths 1440,390]
  node engine/cli.mjs <url-or-file> --extract [--out <dir>]
  node engine/cli.mjs <url-or-file> --brand [--json] [--out <dir>]
  node engine/cli.mjs --rules
  node engine/cli.mjs --explain <rule-id>

Options
  --out <dir>       write report.json and annotated-<width>.png into <dir>
  --json            print the report as JSON
  --extract         print the page content (sections, actions, images, brand) for a rebuild
  --brand           read the site's brand (color, typeface, logo) and print a token theme fitted to it
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
