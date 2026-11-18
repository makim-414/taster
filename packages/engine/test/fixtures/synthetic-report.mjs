// A diagnose report the size of a real landing page's, or much larger: long selectors, page text and evidence on
// every finding. test/mcp.test.mjs and test/http.test.mjs check the summary of it stays small.
import { RULES } from '../../diagnose.mjs';

export function syntheticReport({ rules = 40, perRule = 7, widths = [1440, 390] } = {}) {
  const deep = (i) => `html > body > div#__next > main.page-root > section:nth-of-type(${i}) > div.container.mx-auto.px-6 > div.grid.grid-cols-3.gap-8 > article.card.rounded-2xl.shadow-xl > h3.text-xl.font-semibold`;
  const picked = RULES.filter((r) => r.detect.level !== 'manual').slice(0, rules);
  return {
    url: 'http://localhost:5190/',
    finalUrl: 'http://localhost:5190/',
    diagnosed: true,
    widths,
    measured: 85,
    rulesHit: picked.length,
    findings: picked.length * perRule,
    consentFindings: 0,
    rules: picked.map((r, n) => ({
      ruleId: r.id,
      name: r.name,
      severity: r.severity,
      counts: Object.fromEntries(widths.map((w) => [w, perRule])),
      fix: r.fix,
      fix_patterns: r.fix_patterns,
      findings: widths.flatMap((w) => Array.from({ length: perRule }, (_, i) => ({ width: w, ruleId: r.id, selector: deep(n * perRule + i), text: 'A heading the page wrote, quite long, '.repeat(3), rect: { x: 10, y: 20 + i * 300, w: 400, h: 60 }, evidence: { fontSize: '48px', letterSpacing: '-0.02em', gradient: 'linear-gradient(90deg, #a855f7, #ec4899)', note: 'x'.repeat(200) } }))),
    })),
    judgeByEye: RULES.filter((r) => r.detect.level === 'manual').map((r) => r.id),
    screenshots: ['/tmp/taster-x/annotated-1440.jpg', '/tmp/taster-x/annotated-390.jpg'],
  };
}

