#!/usr/bin/env node
// Launcher for plugin and editor installs: neither runs npm install, so do it once on first start.
//   node engine/start.mjs        MCP server (agents: Claude Code, Codex, Cursor)
//   node engine/start.mjs acp    ACP agent (editors: Zed, JetBrains IDEs)
// stdout carries the protocol, so all install output goes to stderr.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === 'acp' ? 'acp' : 'mcp';
// Both SDKs are checked, so an install made before the ACP agent existed gets topped up.
const needed = [['@modelcontextprotocol', 'sdk'], ['@agentclientprotocol', 'sdk'], ['playwright']];
if (needed.some((parts) => !fs.existsSync(path.join(here, 'node_modules', ...parts)))) {
  process.stderr.write('taster: installing dependencies (first run)...\n');
  const r = spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: here,
    stdio: ['ignore', 2, 2],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.stderr.write('taster: npm install failed. Run it manually in ' + here + '\n');
    process.exit(1);
  }
}
if (mode === 'acp') (await import(pathToFileURL(path.join(here, 'acp.mjs')).href)).serve();
else await import(pathToFileURL(path.join(here, 'mcp.mjs')).href);
