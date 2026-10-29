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
