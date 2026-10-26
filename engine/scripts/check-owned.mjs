// Confirms this branch only carries the paths the engine owns and that the tree is clean.
// Prints OWNED OK on success.
import { execFileSync } from 'node:child_process';

const OWNED = [/^rules\/rules\.json$/, /^rules\/detect\.js$/, /^rules\/test-detect\.mjs$/, /^rules\/fixtures\//, /^engine\//];
const want = process.argv[2];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const errors = [];

const branch = git('branch', '--show-current');
if (want && branch !== want) errors.push(`on branch ${branch}, expected ${want}`);
const dirty = git('status', '--porcelain');
if (dirty) errors.push(`uncommitted changes:\n${dirty}`);
const files = git('ls-files').split('\n').filter(Boolean);
if (!files.length) errors.push('no tracked files');
for (const f of files) if (!OWNED.some((re) => re.test(f))) errors.push(`outside the owned paths: ${f}`);

if (errors.length) {
  for (const e of errors) console.log(`FAIL ${e}`);
  process.exit(1);
}
console.log(`OWNED OK files=${files.length} branch=${branch}`);
