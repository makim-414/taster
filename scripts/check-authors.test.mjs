// check-authors.mjs on a throwaway repository: noreply addresses (a person, Dependabot, GitHub as committer) pass,
// any other address fails, the address itself is never printed, and commits before the range are not read.
// Run: node --test scripts/check-authors.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check-authors.mjs');
const PERSON = '1234+someone@users.noreply.github.com';
const BOT = '49699333+dependabot[bot]@users.noreply.github.com';
const OUTSIDE = 'someone@example.com';

function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'taster-authors-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1' } });
  git('init', '-q', '-b', 'main');
  const commit = (author, committer = author) =>
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'x'], {
      cwd: dir,
      env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: author, GIT_COMMITTER_NAME: 'c', GIT_COMMITTER_EMAIL: committer },
    });
  return { dir, git, commit, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const run = (dir, range) => spawnSync(process.execPath, [SCRIPT, range], { cwd: dir, encoding: 'utf8' });

test('noreply authors and committers pass, older history is not read', () => {
  const r = repo();
  try {
    r.commit(OUTSIDE); // before the range: the base
    r.git('branch', 'base');
    r.commit(PERSON);
    r.commit(BOT, 'noreply@github.com');
    const out = run(r.dir, 'base..HEAD');
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /AUTHORS OK 2 commits/);
  } finally {
    r.done();
  }
});

test('another address as author or committer fails without printing it', () => {
  const r = repo();
  try {
    r.commit(PERSON);
    r.git('branch', 'base');
    r.commit(OUTSIDE, 'noreply@github.com');
    r.commit(PERSON, OUTSIDE);
    const out = run(r.dir, 'base..HEAD');
    assert.equal(out.status, 1, out.stdout + out.stderr);
    assert.match(out.stdout, /AUTHORS_FAIL \(2\)/);
    assert.match(out.stdout, / author email is not/);
    assert.match(out.stdout, / committer email is not/);
    assert.ok(!out.stdout.includes('example.com') && !out.stderr.includes('example.com'), 'the address was printed');
  } finally {
    r.done();
  }
});

test('a range git cannot read is an error, not a pass', () => {
  const r = repo();
  try {
    r.commit(PERSON);
    const out = run(r.dir, 'no-such-branch..HEAD');
    assert.equal(out.status, 2, out.stdout + out.stderr);
  } finally {
    r.done();
  }
});
