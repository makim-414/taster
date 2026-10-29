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
  node engine/cli.mjs add <component-id>... [--dir <dir>] [--from <url>] [--overwrite]
  node engine/cli.mjs add --list

Options
  --out <dir>       write report.json and annotated-<width>.png into <dir>
  --json            print the report as JSON
  --extract         print the page content (sections, actions, images, brand) for a rebuild
  --brand           read the site's brand (color, typeface, logo) and print a token theme fitted to it
  --widths <list>   viewport widths, default ${VIEWPORTS.map((v) => v.width).join(',')}
                    'responsive' runs ${RESPONSIVE_WIDTHS.join(',')}

add copies registry components into your app with every helper they import and the token files, no shadcn
needed. --dir defaults to src/components/taster. --from reads a hosted copy (https://taster-six.vercel.app)
instead of this repository. Files you changed are left alone unless --overwrite.

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

async function main() {
  if (process.argv[2] === 'add') return add(process.argv.slice(3));
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
