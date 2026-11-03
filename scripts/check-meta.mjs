// The package and plugin descriptions, which build-docs.mjs writes from the repository's counts. No dependencies.

// The counts every description and README states. measured leaves out the manual rules, which are judged by eye.
export function metaCounts({ rules, patterns, components }) {
  return {
    rules: rules.length,
    measured: rules.filter((r) => r.detect.level !== 'manual').length,
    patterns: patterns.length,
    components: components.length,
  };
}

// Where each description lives (file and key path) and what it says. max: the Chrome Web Store limit for an
// extension's description.
export const DESCRIPTIONS = [
  {
    file: 'package.json',
    at: ['description'],
    text: (c) =>
      `Find the AI generated look in a frontend and fix it: ${c.rules} rules, ${c.measured} measured in a real browser, ${c.patterns} patterns and ${c.components} components to swap in, for agents (MCP, ACP), editors, CI and the browser.`,
  },
  {
    file: 'extension/manifest.json',
    at: ['description'],
    max: 132,
    text: (c) => `Outline the habits that make a page look AI generated: ${c.rules} rules, ${c.measured} measured on the page you are viewing.`,
  },
  {
    file: 'distribution/acp-registry/taster/agent.json',
    at: ['description'],
    text: (c) =>
      `Checks a page for the AI generated look (${c.rules} rules, ${c.measured} measured in a real browser) and answers with findings, fixes and patterns. No model inside.`,
  },
  {
    file: '.claude-plugin/marketplace.json',
    at: ['plugins', 0, 'description'],
    text: (c) =>
      `Diagnose, swap and build. ${c.rules} rules, ${c.measured} measured in a real browser, a taxonomy of ${c.patterns} patterns sorted by use and surface, and a registry of ${c.components} components built on tokens.`,
  },
  {
    file: '.codex-plugin/plugin.json',
    at: ['interface', 'longDescription'],
    text: (c) =>
      `${c.rules} rules, ${c.measured} measured in a real browser, a taxonomy of ${c.patterns} patterns organized by what the user is trying to do, and a registry of ${c.components} components built on tokens that you copy into your app.`,
  },
];

export const getAt = (obj, at) => at.reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setAt(obj, at, value) {
  const parent = getAt(obj, at.slice(0, -1));
  parent[at[at.length - 1]] = value;
}
