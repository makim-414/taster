// Diagnose reports as SARIF 2.1.0, so GitHub code scanning (and any SARIF viewer) shows findings on the source.
// A finding knows its CSS selector, not a source line, so for a local file the line is found by searching the
// file for the element's own text (then its id or class); when nothing matches it points at line 1 and says so.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from './diagnose.mjs';

const LEVEL = { high: 'error', medium: 'warning', low: 'note' };
const HELP_BASE = 'https://github.com/makim-414/taster/blob/main/patterns/';

function localPath(url) {
  try {
    return url.startsWith('file:') ? fileURLToPath(url) : null;
  } catch {
    return null;
  }
}

// 1-based line of the first line containing any of the needles, or null.
function findLine(lines, needles) {
  for (const n of needles) {
    if (!n || n.length < 3) continue;
    const i = lines.findIndex((l) => l.includes(n));
    if (i >= 0) return i + 1;
  }
  return null;
}

function needlesFor(finding) {
  const out = [];
  if (finding.text) {
    const t = String(finding.text).trim();
    out.push(t.slice(0, 60), t.slice(0, 30), t.split(/\s+/).slice(0, 4).join(' '));
  }
  const last = String(finding.selector || '').split('>').pop().trim();
  const id = last.match(/#([\w-]+)/)?.[1];
  const cls = last.match(/\.([\w-]+)/)?.[1];
  if (id) out.push(`id="${id}"`);
  if (cls) out.push(cls);
  return out;
}

/**
 * @param {object[]} reports diagnose reports (engine/diagnose.mjs), one per target
 * @param {{ cwd?: string }} [options] paths in the SARIF are relative to cwd (the repository root in CI)
 */
export function toSarif(reports, { cwd = process.cwd() } = {}) {
  const used = new Set(reports.flatMap((r) => r.rules.map((h) => h.ruleId)));
  const rules = RULES.filter((r) => used.has(r.id)).map((r) => ({
    id: r.id,
    name: r.name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')),
    shortDescription: { text: r.name },
    fullDescription: { text: r.what },
    help: { text: `${r.why}\n\nFix: ${r.fix}`, markdown: `${r.why}\n\n**Fix:** ${r.fix}${r.fix_patterns?.length ? `\n\nPatterns: ${r.fix_patterns.map((p) => `[${p}](${HELP_BASE}${p}.md)`).join(', ')}` : ''}` },
    helpUri: r.fix_patterns?.[0] ? `${HELP_BASE}${r.fix_patterns[0]}.md` : undefined,
    defaultConfiguration: { level: LEVEL[r.severity] || 'warning' },
    properties: { severity: r.severity, check: r.detect.level, tags: ['design', 'ui'] },
  }));
  const results = [];
  for (const report of reports) {
    const file = localPath(report.url);
    const lines = file && existsSync(file) ? readFileSync(file, 'utf8').split('\n') : null;
    const uri = file ? relative(cwd, file).split('\\').join('/') : report.url;
    for (const hit of report.rules) {
      // The same element at two widths is one result with both widths named.
      const seen = new Map();
      for (const f of hit.findings) {
        const key = f.selector;
        if (seen.has(key)) {
          seen.get(key).widths.push(f.width);
          continue;
        }
        seen.set(key, { f, widths: [f.width] });
      }
      for (const { f, widths } of seen.values()) {
        const line = lines ? findLine(lines, needlesFor(f)) : null;
        results.push({
          ruleId: hit.ruleId,
          level: LEVEL[hit.severity] || 'warning',
          message: { text: `${hit.name} at ${f.selector} (${widths.join(' and ')} wide).${f.text ? ` Text: "${Array.from(String(f.text)).slice(0, 60).join('')}"` : ''} Fix: ${hit.fix}` },
          locations: [
            {
              physicalLocation: { artifactLocation: { uri }, region: { startLine: line || 1 } },
              logicalLocations: [{ fullyQualifiedName: f.selector, kind: 'element' }],
            },
          ],
          partialFingerprints: { tasterSelector: `${hit.ruleId}:${f.selector}` },
          properties: { widths, lineFound: Boolean(line), evidence: f.evidence },
        });
      }
    }
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'Taster', informationUri: 'https://github.com/makim-414/taster', version: '0.1.0', rules } },
        results,
      },
    ],
  };
}

/** A short Markdown summary for $GITHUB_STEP_SUMMARY: one table row per rule hit. */
export function toSummary(reports) {
  const out = ['## Taster', ''];
  for (const r of reports) {
    out.push(`**${r.url}**: ${r.rulesHit} of ${r.measured} measured rules hit at ${r.widths.join(' and ')} wide`, '');
    if (!r.rules.length) continue;
    out.push('| Rule | Severity | Count | Fix |', '|---|---|---|---|');
    for (const h of r.rules) out.push(`| ${h.ruleId} ${h.name} | ${h.severity} | ${Object.values(h.counts).reduce((a, b) => a + b, 0)} | ${h.fix.replace(/\|/g, '/')} |`);
    out.push('');
  }
  return out.join('\n');
}
