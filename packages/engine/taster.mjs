#!/usr/bin/env node
// One command for the published package (npx @makim-414/taster ...):
//   taster <url-or-file>...      diagnose (see `taster --help`)
//   taster add <id>...           copy registry components into an app
//   taster export <target|all>   write the rules for agents without MCP
//   taster lint [paths...]       the rules' source form on tsx, vue, svelte, html, css (no browser needed)
//   taster mcp                   MCP server on stdio
//   taster acp [--setup]         ACP agent on stdio; --setup prepares the browser in a terminal
//   taster setup                 check for a browser, download Chromium if none works
//   taster watch [--port <n>]    live viewer: a local page that draws what agents running Taster tools do
//   taster live edit [--file f]  tell a running live viewer a source file changed (the plugin's edit hook runs it)
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'live') {
  // First and with nothing but node:* behind it, since an agent's edit hook waits on it: no browser, no SDK.
  const { liveCommand } = await import('./edit.mjs');
  process.exit(await liveCommand(rest));
} else if (cmd === 'mcp') {
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
} else if (cmd === 'watch') {
  // Runs until Ctrl+C. It needs no browser to start; only a stage refresh after a change opens one.
  const { watchCommand } = await import('./watch.mjs');
  process.exit(await watchCommand(rest));
} else if (cmd === 'setup') {
  const { setup } = await import('./setup.mjs');
  process.exit((await setup()) ? 0 : 1);
} else {
  // cli.mjs reads process.argv itself; the subcommand sits at argv[2] here just as when it runs directly.
  await import('./cli.mjs');
}
