// Headless render gate. Opens demo/dist/index.html in Chrome, checks for page errors and
// console errors, checks that every registry id has a rendered element, saves screenshots.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

// playwright-core from this package (npm ci --prefix registry), else PLAYWRIGHT_CORE_PATH. The browser is CHROME_PATH
// when set, else the Chromium that Playwright installed (npx --prefix engine playwright install chromium), the one CI
// uses, so a local run and CI render with the same build.
const require = createRequire(import.meta.url)
function loadPlaywright() {
  for (const c of ['playwright-core', process.env.PLAYWRIGHT_CORE_PATH].filter(Boolean)) {
    try { return require(c) } catch { /* try the next one */ }
  }
  throw new Error('playwright-core not found: run npm ci --prefix registry, or set PLAYWRIGHT_CORE_PATH.')
}
const { chromium } = loadPlaywright()
const CHROME = process.env.CHROME_PATH
const root = path.dirname(fileURLToPath(import.meta.url))
const page_url = pathToFileURL(path.join(root, 'demo/dist/index.html')).href
const ids = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8')).components.map((c) => c.id)
fs.mkdirSync(path.join(root, 'demo/shots'), { recursive: true })

const problems = []
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
})
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`))
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${name}] console error: ${m.text()}`) })
    await page.goto(page_url)
    await page.waitForSelector('[data-registry-id]')
    await page.waitForTimeout(600)
    const missing = []
    for (const id of ids) {
      const n = await page.locator(`[data-registry-id="${id}"]`).count()
      if (n < 1) missing.push(id)
      else {
        const box = await page.locator(`[data-registry-id="${id}"]`).first().boundingBox()
        if (!box || box.height < 20) missing.push(`${id} (empty)`)
      }
    }
    if (missing.length) problems.push(`[${name}] missing or empty: ${missing.join(', ')}`)
    await page.screenshot({ path: path.join(root, `demo/shots/${name}.png`), fullPage: name === 'mobile' })
    if (name === 'desktop') {
      // desktop screenshot is the 1440 wide full page too, so reviewers see everything
      await page.screenshot({ path: path.join(root, 'demo/shots/desktop.png'), fullPage: true })
    }
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log(`${name}: ${ids.length} ids checked, horizontal overflow ${hscroll}px`)
    await ctx.close()
  }
} finally {
  await browser.close()
}
if (problems.length) {
  console.log(problems.join('\n'))
  console.log('RENDER FAIL')
  process.exit(1)
}
console.log('RENDER OK')
