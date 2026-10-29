// Taster's rules as instruction files for coding agents that do not speak MCP: AGENTS.md, Cursor, Windsurf, Cline,
// GitHub Copilot, Gemini CLI and Claude Code. One body, rendered from rules/rules.json, wrapped per tool.
// scripts/build-docs.mjs writes them to exports/ in this repository; `cli.mjs export` writes one into a project.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RULES_FILE = new URL('../rules/rules.json', import.meta.url);
const REPO = 'https://github.com/makim-414/taster';
const HOSTED = 'https://taster-six.vercel.app';
const START = '<!-- taster:start -->';
const END = '<!-- taster:end -->';

// Where each tool reads its instructions, relative to the project root. `block` files are shared with the
// user's own instructions, so Taster writes only between its markers there.
export const TARGETS = {
  agents: { file: 'AGENTS.md', block: true, label: 'AGENTS.md (Codex, Jules, Amp, Zed and others)' },
  claude: { file: 'CLAUDE.md', block: true, label: 'Claude Code' },
  cursor: { file: '.cursor/rules/taster.mdc', block: false, label: 'Cursor' },
  windsurf: { file: '.windsurf/rules/taster.md', block: false, label: 'Windsurf' },
  cline: { file: '.clinerules/taster.md', block: false, label: 'Cline' },
  copilot: { file: '.github/copilot-instructions.md', block: true, label: 'GitHub Copilot' },
  gemini: { file: 'GEMINI.md', block: true, label: 'Gemini CLI' },
};

const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** The shared Markdown body: every rule as "avoid, fix", high severity first. */
export function renderBody(rules = JSON.parse(readFileSync(RULES_FILE, 'utf8')).rules) {
  const order = ['high', 'medium', 'low'];
  const out = [
    '# Taster: UI rules against the generated look',
    '',
    `When you build or change a user interface, avoid every pattern below. They are the ${rules.length} rules of`,
    `Taster (${REPO}), each one a habit that makes a screen read as AI generated. Each line says what to avoid and`,
    'what to do instead. Use the project\'s design tokens for color, spacing, radius and type, never raw values.',
    '',
  ];
  for (const sev of order) {
    const list = rules.filter((r) => r.severity === sev);
    if (!list.length) continue;
    out.push(`## ${sev[0].toUpperCase()}${sev.slice(1)} severity`, '');
    for (const r of list) out.push(`- ${r.id} ${oneLine(r.name)}. Avoid: ${oneLine(r.what)} Instead: ${oneLine(r.fix)}`);
    out.push('');
  }
  out.push(
    '## Check the result',
    '',
    `- With the Taster MCP server connected (local plugin, or hosted at ${HOSTED}/api/mcp), call \`diagnose\` on the page and fix every finding.`,
    `- Without it, open ${HOSTED} and paste the page address, or run \`node engine/cli.mjs <url or file>\` in a Taster clone.`,
    '- Rules marked by eye in the report (manual) need a look at the screen; the others are measured in a real browser.',
    '',
  );
  return out.join('\n');
}

/** One tool's file content. Files the user shares with their own text get the body between markers. */
export function renderTarget(target, body = renderBody()) {
  const t = TARGETS[target];
  if (!t) throw new Error(`Unknown target ${target}. Known: ${Object.keys(TARGETS).join(', ')}`);
  if (target === 'cursor') {
    // Cursor project rule: applied when matching files are in context, and fetchable by description.
    return [
      '---',
      'description: Taster UI rules. Use when building or changing screens, components, styles or layouts.',
      'globs: **/*.tsx,**/*.jsx,**/*.vue,**/*.svelte,**/*.html,**/*.css,**/*.astro',
      'alwaysApply: false',
      '---',
      '',
      body,
    ].join('\n');
  }
  if (target === 'windsurf') return ['---', 'trigger: glob', 'globs: **/*.tsx,**/*.jsx,**/*.vue,**/*.svelte,**/*.html,**/*.css', '---', '', body].join('\n');
  return t.block ? `${START}\n${body}${END}\n` : body;
}

/** Write one target into a project, keeping the user's own text in shared files. Returns the path written. */
export function writeTarget(target, projectDir) {
  const t = TARGETS[target];
  const content = renderTarget(target);
  const file = join(projectDir, t.file);
  mkdirSync(dirname(file), { recursive: true });
  if (t.block && existsSync(file)) {
    const prev = readFileSync(file, 'utf8');
    const next = prev.includes(START) && prev.includes(END)
      ? prev.slice(0, prev.indexOf(START)) + content.trimEnd() + prev.slice(prev.indexOf(END) + END.length)
      : `${prev.trimEnd()}\n\n${content}`;
    writeFileSync(file, next.endsWith('\n') ? next : `${next}\n`);
  } else {
    writeFileSync(file, content);
  }
  return file;
}

/** Every target as repository files under exports/, for build-docs and the freshness check in validate. */
export function renderAll() {
  const body = renderBody();
  return Object.fromEntries(Object.entries(TARGETS).map(([name, t]) => [join('exports', name, t.file.split('/').pop()), renderTarget(name, body)]));
}
