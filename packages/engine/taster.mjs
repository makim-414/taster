#!/usr/bin/env node
// One command for the published package (npx @makim-414/taster ...):
//   taster <url-or-file>...      diagnose (see `taster --help`)
//   taster add <id>...           copy registry components into an app
//   taster export <target|all>   write the rules for agents without MCP
//   taster lint [paths...]       the rules' source form on tsx, vue, svelte, html, css (no browser needed)
//   taster mcp                   MCP server on stdio
//   taster acp [--setup]         ACP agent on stdio; --setup prepares the browser in a terminal
//   taster setup                 check for a browser, download Chromium if none works
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'mcp') {
  await import('./mcp.mjs');
} else if (cmd === 'acp' && rest.includes('--setup')) {
  const { setup } = await import('./setup.mjs');
  process.exit((await setup()) ? 0 : 1);
} else if (cmd === 'acp') {
  (await import('./acp.mjs')).serve();
} else if (cmd === 'lint') {
  // Straight to the linter: it reads files only, so it must not wait for the browser engine to load.
  const { lintCommand } = await import('./lint.mjs');
  process.exit(await lintCommand(rest));
} else if (cmd === 'setup') {
  const { setup } = await import('./setup.mjs');
  process.exit((await setup()) ? 0 : 1);
} else {
  // cli.mjs reads process.argv itself; the subcommand sits at argv[2] here just as when it runs directly.
  await import('./cli.mjs');
}
