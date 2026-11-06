// Writes the rules as instruction files for agents without MCP into exports/ (not committed): one folder per tool and
// a README that says where each file goes. RELEASING.md zips the folder and attaches it to each release. In a project,
// `taster export` writes the same files in place instead.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { TARGETS, renderAll } from '../engine/exports.mjs';

const OUT = path.join(ROOT, 'exports');
const files = renderAll();
const readme = [
  '# Taster rules for agents without MCP',
  '',
  'Generated from `rules/rules.json` of https://github.com/makim-414/taster. Copy a file to the place its tool reads.',
  'In a file you share with your own instructions, paste it at the end; the Taster part sits between',
  '`<!-- taster:start -->` and `<!-- taster:end -->`, so you can replace it later.',
  '',
  '| Tool | File | Put it at |',
  '|---|---|---|',
  ...Object.entries(TARGETS).map(([name, t]) => `| ${t.label} | \`${name}/${path.basename(t.file)}\` | \`${t.file}\` |`),
  '',
  'Or, in a clone of Taster, let the CLI place them and keep your own text: `node engine/cli.mjs export all --dir <your app>`.',
  '',
].join('\n');

fs.rmSync(OUT, { recursive: true, force: true });
for (const [rel, content] of Object.entries({ ...files, 'exports/README.md': readme })) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), content);
}
console.log(`${Object.keys(files).length} files and a README in ${path.relative(process.cwd(), OUT) || '.'}`);
