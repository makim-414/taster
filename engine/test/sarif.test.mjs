import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toSarif, toSummary } from '../sarif.mjs';

const report = {
  url: 'https://example.com/',
  widths: [1440, 390],
  measured: 71,
  rulesHit: 1,
  findings: 2,
  rules: [{ ruleId: 'AC-01', name: 'All-caps label with wide letter spacing', severity: 'high', counts: { 1440: 1, 390: 1 }, fix: 'Sentence case.', fix_patterns: [], findings: [
    { width: 1440, selector: 'main > p.eyebrow', text: 'NEW' },
    { width: 390, selector: 'main > p.eyebrow', text: 'NEW' },
  ] }],
  judgeByEye: [],
};

test('one result per element across widths, URL targets keep the URL, severity maps to level', () => {
  const s = toSarif([report]);
  assert.equal(s.version, '2.1.0');
  const [r] = s.runs[0].results;
  assert.equal(s.runs[0].results.length, 1);
  assert.deepEqual(r.properties.widths, [1440, 390]);
  assert.equal(r.level, 'error');
  assert.equal(r.locations[0].physicalLocation.artifactLocation.uri, 'https://example.com/');
  assert.equal(s.runs[0].tool.driver.rules[0].id, 'AC-01');
  assert.match(toSummary([report]), /\| AC-01 All-caps label with wide letter spacing \| high \| 2 \|/);
});

test('a target that was not diagnosed is a tool notification at level error, not results', () => {
  const blocked = {
    url: 'https://shop.example.test/',
    finalUrl: 'https://shop.example.test/',
    status: 403,
    diagnosed: false,
    notDiagnosed: { reason: 'bot-check', status: 403, title: 'Just a moment...', finalUrl: 'https://shop.example.test/', message: 'not diagnosed: got a bot check page (HTTP 403, title "Just a moment...") instead of the site at https://shop.example.test/.' },
    widths: [1440],
    measured: 71,
    rulesHit: 0,
    findings: 0,
    rules: [],
    judgeByEye: [],
  };
  const s = toSarif([blocked, report]);
  const [invocation] = s.runs[0].invocations;
  assert.equal(invocation.executionSuccessful, false);
  assert.equal(invocation.toolExecutionNotifications.length, 1);
  const [note] = invocation.toolExecutionNotifications;
  assert.equal(note.level, 'error');
  assert.equal(note.message.text, blocked.notDiagnosed.message);
  assert.equal(note.locations[0].physicalLocation.artifactLocation.uri, 'https://shop.example.test/');
  assert.deepEqual(note.properties, { reason: 'bot-check', status: 403, title: 'Just a moment...', finalUrl: 'https://shop.example.test/' });
  assert.ok(s.runs[0].results.every((r) => r.locations[0].physicalLocation.artifactLocation.uri === 'https://example.com/'), 'the diagnosed target keeps its results');
  assert.equal(toSarif([report]).runs[0].invocations[0].executionSuccessful, true);
  assert.match(toSummary([blocked]), /\*\*https:\/\/shop\.example\.test\/\*\*: not diagnosed: got a bot check page/);
});

test('rule help says why the rule flags, not that a finding proves how the page was made', () => {
  const [rule] = toSarif([report]).runs[0].tool.driver.rules;
  assert.match(rule.help.text, /^Why it is flagged: /);
  assert.match(rule.help.markdown, /^\*\*Why it is flagged:\*\* /);
  assert.match(rule.help.text, /\n\nFix: /);
});
