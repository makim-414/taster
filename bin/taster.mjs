#!/usr/bin/env node
// One command for the published package (npx @makim-414/taster ...):
//   taster <url-or-file>...      diagnose (see `taster --help`)
//   taster add <id>...           copy registry components into an app
//   taster export <target|all>   write the rules for agents without MCP
//   taster mcp                   MCP server on stdio
//   taster acp [--setup]         ACP agent on stdio; --setup prepares the browser in a terminal
//   taster setup                 check for a browser, download Chromium if none works
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'mcp') {
  await import('../engine/mcp.mjs');
} else if (cmd === 'acp' && rest.includes('--setup')) {
  const { setup } = await import('../engine/setup.mjs');
  process.exit((await setup()) ? 0 : 1);
} else if (cmd === 'acp') {
  (await import('../engine/acp.mjs')).serve();
} else if (cmd === 'setup') {
  const { setup } = await import('../engine/setup.mjs');
  process.exit((await setup()) ? 0 : 1);
} else {
  // cli.mjs reads process.argv itself; the subcommand sits at argv[2] here just as when it runs directly.
  await import('../engine/cli.mjs');
}
