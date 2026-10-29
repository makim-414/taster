// One-time setup: Taster opens pages in a real browser. It uses Playwright's Chromium when installed and falls back to
// Google Chrome (engine/diagnose.mjs launch()). This checks both and downloads Chromium only when neither works.
// Run with `taster setup` or, from an ACP client, as the agent's terminal setup (`taster acp --setup`).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launch } from './diagnose.mjs';

export async function setup({ log = (m) => process.stderr.write(`${m}\n`) } = {}) {
  try {
    const browser = await launch();
    const version = browser.version();
    await browser.close();
    log(`taster: a browser is ready (${version}). Nothing to install.`);
    return true;
  } catch {
    log('taster: no usable browser found, downloading Chromium for Playwright (about 150 MB, once)...');
  }
  const require = createRequire(import.meta.url);
  const cli = require.resolve('playwright/cli.js');
  const r = spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: ['inherit', 2, 2] });
  if (r.status !== 0) {
    log('taster: the download failed. Install Google Chrome, or run `npx playwright install chromium` yourself.');
    return false;
  }
  log('taster: Chromium installed. You can close this and start using Taster.');
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) setup().then((ok) => process.exit(ok ? 0 : 1));
