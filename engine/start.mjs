#!/usr/bin/env node
// Launcher for plugin installs: plugins do not run npm install, so do it once on first start.
// stdout carries the MCP protocol, so all install output goes to stderr.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
if (!fs.existsSync(path.join(here, 'node_modules', '@modelcontextprotocol', 'sdk'))) {
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
await import(pathToFileURL(path.join(here, 'mcp.mjs')).href);
