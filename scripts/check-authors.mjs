// Fails when a commit this branch adds carries an author or committer email that is not a GitHub noreply address, so
// a personal or work address never reaches the public history. Only the commits in the range are read (default
// origin/main..HEAD); earlier history is not. Allowed: <login>@users.noreply.github.com and
// <id>+<login>@users.noreply.github.com (people and bots such as Dependabot), and noreply@github.com (the committer
// GitHub writes for merges, web edits and bot commits). The output names the commit and the field, never the address.
// Usage: node scripts/check-authors.mjs [range]   (CI passes <base sha>..<head sha> of the pull request)
import { execFileSync } from 'node:child_process';

const range = process.argv[2] || 'origin/main..HEAD';
const isNoreply = (email) => /^[^\s@]+@users\.noreply\.github\.com$/i.test(email) || email.toLowerCase() === 'noreply@github.com';

let log;
try {
  log = execFileSync('git', ['log', '--format=%h%x09%ae%x09%ce', range, '--'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  console.error(`check-authors: git log ${range} failed (${String(e.stderr || e.message).trim().split('\n')[0]}). Fetch the base branch first.`);
  process.exit(2);
}
const commits = log.split('\n').filter(Boolean).map((line) => line.split('\t'));
const bad = [];
for (const [hash, author, committer] of commits) {
  if (!isNoreply(author)) bad.push(`${hash} author`);
  if (!isNoreply(committer)) bad.push(`${hash} committer`);
}
for (const b of bad) console.log(`${b} email is not a GitHub noreply address`);
if (bad.length) {
  console.log('Set git config user.email to the noreply address from github.com/settings/emails, then rewrite these commits (git rebase --exec "git commit --amend --no-edit --reset-author" <base>) before pushing.');
  console.log(`AUTHORS_FAIL (${bad.length})`);
  process.exit(1);
}
console.log(`AUTHORS OK ${commits.length} commits in ${range}`);
