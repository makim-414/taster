// Builds what the gallery and the MCP preview tools show: stage/index.html (the demo page as one file, which shows one
// component with ?only=<id>) and previews/<id>.<theme>.jpg (a still of each component, light and dark).
// Run after changing a component or its demo: npm --prefix registry run build-stage
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { previewFile, stageHash } from './stage-hash.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
// playwright-core from this package (npm ci --prefix registry), else PLAYWRIGHT_CORE_PATH. The browser is CHROME_PATH
// when set, else the Chromium that Playwright installed, the same one test-render and CI use.
function loadPlaywright() {
  for (const c of ['playwright-core', process.env.PLAYWRIGHT_CORE_PATH].filter(Boolean)) {
    try { return require(c) } catch { /* try the next one */ }
  }
  throw new Error('playwright-core not found: run npm ci --prefix registry, or set PLAYWRIGHT_CORE_PATH.')
}
const { chromium } = loadPlaywright()
const CHROME = process.env.CHROME_PATH

execFileSync(process.execPath, [path.join(root, 'demo/build.mjs')], { stdio: 'inherit' })
fs.mkdirSync(path.join(root, 'stage'), { recursive: true })
fs.copyFileSync(path.join(root, 'demo/dist/index.html'), path.join(root, 'stage/index.html'))
const stage = pathToFileURL(path.join(root, 'stage/index.html')).href

const ids = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8')).components.map((c) => c.id)
const out = path.join(root, 'previews')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const context = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 1.5 })
let bytes = 0
try {
  for (const id of ids) {
    for (const theme of ['dark', 'light']) {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(`${stage}?only=${encodeURIComponent(id)}&look=${encodeURIComponent(JSON.stringify({ theme }))}`)
      await page.waitForSelector(`[data-registry-id="${id}"]`)
      // Long enough for entrance motion to settle, so the still shows the component and not its first frame.
      await page.waitForTimeout(1400)
      if (errors.length) throw new Error(`${id}: ${errors[0]}`)
      const shot = await page.screenshot({ type: 'jpeg', quality: 72 })
      fs.writeFileSync(path.join(out, previewFile(id, theme)), shot)
      bytes += shot.length
      await page.close()
    }
  }
} finally {
  await browser.close()
}
fs.writeFileSync(path.join(root, 'stage/meta.json'), JSON.stringify({ sourceHash: stageHash() }, null, 2) + '\n')
console.log(`STAGE OK ${ids.length} components, ${Math.round(bytes / 1024)} KB of previews`)
