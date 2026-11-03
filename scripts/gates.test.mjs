// scripts/gates.mjs and .github/workflows/validate.yml run the same gates in the same jobs and the same order: every
// gate command is in its job in the workflow, in order, and every node or npm command a workflow job runs (installs
// and the server start aside) is a gate. Run: node --test scripts/gates.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JOBS } from './gates.mjs';

const workflow = readFileSync(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8');

// The text of each job: from its "  name:" line under jobs: to the next one.
function jobsOf(text) {
  const lines = text.slice(text.indexOf('\njobs:\n') + 7).split('\n');
  const jobs = {};
  let current = null;
  for (const line of lines) {
    const m = line.match(/^ {2}([\w-]+):\s*$/);
    if (m) jobs[(current = m[1])] = [];
    else if (current) jobs[current].push(line);
  }
  return Object.fromEntries(Object.entries(jobs).map(([k, v]) => [k, v.join('\n')]));
}
// The node and npm commands a job runs, without the arguments CI fills in from the event.
const commandsOf = (job) =>
  job
    .split('\n')
    .map((l) => l.trim().replace(/^run:\s*/, '').replace(/\s+"\$\w+"$/, ''))
    .filter((l) => (/^node /.test(l) && !/^node -[ep] /.test(l)) || (/^npm --prefix /.test(l) && !/ start\b/.test(l)));

const ci = jobsOf(workflow);

test('the workflow has the jobs gates.mjs runs, in the same order', () => {
  assert.deepEqual(Object.keys(ci), Object.keys(JOBS));
});

for (const [job, gates] of Object.entries(JOBS)) {
  test(`${job}: every gate is in the workflow job, in order`, () => {
    let at = -1;
    for (const g of gates.filter((x) => x.cmd && x.ci !== false)) {
      const i = ci[job].indexOf(g.cmd, at + 1);
      assert.ok(i > at, `${job}: "${g.cmd}" is missing from the workflow job, or out of order`);
      at = i;
    }
  });
  test(`${job}: every command the workflow job runs is a gate`, () => {
    const mine = new Set(gates.map((g) => g.cmd));
    for (const cmd of commandsOf(ci[job])) assert.ok(mine.has(cmd), `${job}: the workflow runs "${cmd}" and gates.mjs does not`);
  });
}
