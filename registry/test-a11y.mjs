// Accessibility gate for the components that a keyboard, a screen reader or reduced motion used to trip up.
// Part one renders component markup on the server (no browser): an accessible name never sits on an element whose
// role forbids one, the moving letters are hidden and the final text is in one plain sr-only span, charts and
// progress bars carry their names. Part two drives demo/dist/index.html?only=<id> in Chrome: the command palette is a
// combobox whose Enter runs the row shown as chosen, modal sheets take focus in and hand it back, focus rings show,
// labels are connected, popups have names, the weekday row reads at 4.5:1 and the skeleton pulse stops under reduced
// motion.
// Run: npm --prefix registry run build-demo, then node registry/test-a11y.mjs (same browser variables as test-render).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const problems = []
let checks = 0
const expect = (ok, message) => {
  checks++
  if (!ok) problems.push(message)
}

// Part one: server markup.
const out = await build({
  stdin: {
    contents: ["export { createElement as h } from 'react'", "export { renderToStaticMarkup } from 'react-dom/server'", "export * from './src/index'"].join('\n'),
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  target: 'node20',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.css': 'empty' },
  logLevel: 'error',
})
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taster-a11y-'))
const file = path.join(dir, 'bundle.cjs')
fs.writeFileSync(file, out.outputFiles[0].text)
const R = require(file)
fs.rmSync(dir, { recursive: true, force: true })
const { h, renderToStaticMarkup: html } = R

// aria-label is allowed on a heading, a landmark or a widget, not on a plain span, p or div (ARIA 1.2, naming
// prohibited on generic and paragraph).
const namedGeneric = (markup) => [...markup.matchAll(/<(span|p|div)\b(?![^>]*\srole=)[^>]*\saria-label="/g)].map((m) => m[0])
const srOnly = (markup) => [...markup.matchAll(/<span class="sr-only">([^<]*)<\/span>/g)].map((m) => m[1])

const text = {
  'motion/number-ticker': [h(R.NumberTicker, { value: 18420 }), '18,420'],
  'motion/text-scramble': [h(R.TextScramble, { text: 'Hover to replay' }), 'Hover to replay'],
  'motion/typewriter': [h(R.Typewriter, { words: ['landing page', 'store'] }), 'store'],
  'motion/typewriter loop': [h(R.Typewriter, { words: ['landing page', 'store'], loop: true }), 'landing page, store'],
  'motion/text-reveal': [h(R.TextReveal, { text: 'Every finding has a rule' }), 'Every finding has a rule'],
  'motion/text-reveal h2': [h(R.TextReveal, { as: 'h2', text: 'Every finding has a rule' }), 'Every finding has a rule'],
  'marketing/reveal-faq letters': [
    h(R.RevealFaq, { title: 'Questions', reveal: 'letters', items: [{ q: 'Does it change my code?', a: 'No, it only reads the page.' }] }),
    'No, it only reads the page.',
  ],
}
for (const [name, [element, final]] of Object.entries(text)) {
  const markup = html(element)
  expect(namedGeneric(markup).length === 0, `${name}: aria-label on an element that cannot be named: ${namedGeneric(markup)[0]}`)
  expect(srOnly(markup).includes(final), `${name}: no sr-only span with the final text "${final}"`)
}
expect(!/tabindex/i.test(html(h(R.TextScramble, { text: 'Hover to replay' }))), 'motion/text-scramble: the text is a tab stop with nothing to do')

const svgName = (markup) => ({
  label: (markup.match(/<svg\b[^>]*\saria-label="([^"]*)"/) || [])[1],
  title: (markup.match(/<title>([^<]*)<\/title>/) || [])[1],
})
const bar = svgName(html(h(R.BarChart, { label: 'Weekly throughput', data: [{ label: 'Mon', value: 3 }, { label: 'Tue', value: 5 }] })))
expect(bar.label === 'Weekly throughput' && bar.title === 'Weekly throughput', 'blocks/bar: label is not the svg name and title')
expect(/<desc>Mon 3, Tue 5<\/desc>/.test(html(h(R.BarChart, { label: 'L', data: [{ label: 'Mon', value: 3 }, { label: 'Tue', value: 5 }] }))), 'blocks/bar: the values are not in the description')
expect(/<g aria-hidden="true"><text/.test(html(h(R.BarChart, { label: 'L', data: [{ label: 'Mon', value: 3 }] }))), 'blocks/bar: axis text is not hidden')
const spark = svgName(html(h(R.Sparkline, { label: 'Conversion trend', data: [1, 3, 2] })))
expect(spark.label === 'Conversion trend' && spark.title === 'Conversion trend', 'blocks/spark: label is not the svg name and title')

const bars = [
  html(h(R.Progress, { value: 40, label: 'Upload' })),
  html(h(R.Progress, { value: 40, 'aria-label': 'Indexing' })),
  html(h(R.Progress, { value: 40, 'aria-labelledby': 'outside' })),
]
for (const markup of bars) {
  const bar = (markup.match(/<div role="progressbar"[^>]*>/) || [''])[0]
  expect(/\saria-(label|labelledby)="[^"]+"/.test(bar), `blocks/progress: the progressbar has no name: ${bar}`)
  expect(namedGeneric(markup).length === 0, `blocks/progress: the name landed on the wrapper: ${namedGeneric(markup)[0]}`)
}
expect(/aria-labelledby="([^"]+)"/.test(bars[0]) && bars[0].includes(`id="${bars[0].match(/aria-labelledby="([^"]+)"/)[1]}"`), 'blocks/progress: label is not the bar name')

const skeleton = html(h(R.Skeleton, { className: 'h-3' }))
expect(/motion-safe:animate-pulse/.test(skeleton) && !/(^|[\s"])animate-pulse/.test(skeleton), 'blocks/skeleton: the pulse runs under reduced motion')

// Part two: the demo page in a browser.
function loadPlaywright() {
  for (const c of ['playwright-core', process.env.PLAYWRIGHT_CORE_PATH, path.join(os.homedir(), '.claude/skills/motion-studio/node_modules/playwright-core')].filter(Boolean)) {
    try { return require(c) } catch { /* try the next one */ }
  }
  throw new Error('playwright-core not found. Install it or set PLAYWRIGHT_CORE_PATH.')
}
const { chromium } = loadPlaywright()
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const demo = path.join(root, 'demo/dist/index.html')
if (!fs.existsSync(demo)) throw new Error('demo/dist/index.html is missing. Run npm --prefix registry run build-demo first.')
const stage = (id, theme = 'dark') => `${pathToFileURL(demo).href}?only=${encodeURIComponent(id)}&look=${encodeURIComponent(JSON.stringify({ theme }))}`

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const pageErrors = []
async function open(ctx, id, theme) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => pageErrors.push(`${id}: ${e.message}`))
  await page.goto(stage(id, theme))
  await page.waitForSelector(`[data-registry-id="${id}"]`)
  await page.waitForTimeout(300)
  return page
}
// A step that throws is one failure, and the steps after it still run.
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    expect(false, `${name}: ${String(e.message).split('\n')[0]}`)
  }
}
const press = async (page, key) => {
  await page.keyboard.press(key)
  await page.waitForTimeout(150)
}
const focused = (page) =>
  page.evaluate(() => {
    const el = document.activeElement
    const s = el ? getComputedStyle(el) : null
    return el && el !== document.body
      ? { tag: el.tagName, role: el.getAttribute('role'), text: (el.getAttribute('aria-label') || el.textContent || '').trim(), ring: s.boxShadow !== 'none' || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0), inDialog: !!el.closest('[role=dialog]') }
      : { tag: 'BODY' }
  })
// The accessible name an element gets from aria-labelledby or aria-label, enough for these checks.
const nameOf = (page, selector) =>
  page.evaluate((selector) => {
    const el = document.querySelector(selector)
    if (!el) return null
    const ids = el.getAttribute('aria-labelledby')
    if (ids) return ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim()
    return (el.getAttribute('aria-label') || '').trim()
  }, selector)

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })

  // Command palette: a combobox over a listbox, focus stays in the input, Enter runs the highlighted row.
  await step('blocks/command-palette', async () => {
    const page = await open(ctx, 'blocks/command-palette')
    await press(page, 'Tab')
    await press(page, 'Enter')
    const input = await page.evaluate(() => {
      const el = document.activeElement
      const list = document.getElementById(el.getAttribute('aria-controls') || '')
      const options = list ? [...list.querySelectorAll('[role=option]')] : []
      return {
        role: el.getAttribute('role'),
        expanded: el.getAttribute('aria-expanded'),
        listRole: list?.getAttribute('role'),
        options: options.length,
        selected: options.filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.id),
        active: el.getAttribute('aria-activedescendant'),
        tabbable: options.filter((o) => o.tabIndex >= 0 || o.matches('button,a[href]')).length,
        ring: options[0] ? getComputedStyle(options[0]).boxShadow !== 'none' : false,
      }
    })
    expect(input.role === 'combobox' && input.expanded === 'true', `command-palette: focus is not on a combobox input (${JSON.stringify(input)})`)
    expect(input.listRole === 'listbox' && input.options > 1, 'command-palette: aria-controls does not point at a listbox of options')
    expect(input.selected.length === 1 && input.selected[0] === input.active, 'command-palette: aria-activedescendant is not the one selected option')
    expect(input.tabbable === 0, 'command-palette: options are tab stops')
    expect(input.ring, 'command-palette: the highlighted option has no ring')
    await press(page, 'ArrowDown')
    const moved = await page.evaluate(() => {
      const el = document.activeElement
      return { active: el.getAttribute('aria-activedescendant'), text: document.getElementById(el.getAttribute('aria-activedescendant') || '')?.textContent }
    })
    expect(/Audience/.test(moved.text || ''), `command-palette: ArrowDown did not move the highlight (${moved.text})`)
    await press(page, 'Tab')
    expect((await focused(page)).role === 'combobox', 'command-palette: Tab left the input')
    await press(page, 'Enter')
    expect(/Last run: Audience/.test(await page.locator('[data-registry-id="blocks/command-palette"]').innerText()), 'command-palette: Enter did not run the highlighted command')
    const back = await focused(page)
    expect(back.tag === 'BUTTON' && /Open command palette/.test(back.text), `command-palette: focus did not return to the opener after a command (${JSON.stringify(back)})`)
    await press(page, 'Enter')
    await press(page, 'Escape')
    const afterEscape = await focused(page)
    expect(/Open command palette/.test(afterEscape.text || ''), 'command-palette: focus did not return to the opener after Escape')
    await page.close()
  })

  // Shortcuts sheet: focus moves in, the sheet has a title and a close button, focus comes back, ? opens it.
  await step('blocks/shortcuts-cheatsheet', async () => {
    const page = await open(ctx, 'blocks/shortcuts-cheatsheet')
    await press(page, 'Tab')
    await press(page, 'Enter')
    const inside = await focused(page)
    expect(inside.inDialog, `shortcuts-cheatsheet: focus stayed behind the modal (${JSON.stringify(inside)})`)
    expect((await nameOf(page, '[role=dialog]')) === 'Keyboard shortcuts', 'shortcuts-cheatsheet: the dialog is not named by its title')
    expect((await page.locator('[role=dialog] button[aria-label="Close"]').count()) === 1, 'shortcuts-cheatsheet: no close button')
    for (let i = 0; i < 3; i++) await press(page, 'Tab')
    expect((await focused(page)).inDialog, 'shortcuts-cheatsheet: Tab left the modal')
    await press(page, 'Escape')
    expect(/Show shortcuts/.test((await focused(page)).text || ''), 'shortcuts-cheatsheet: focus did not return to the opener')
    await press(page, '?')
    expect((await page.locator('[role=dialog]').count()) === 1, 'shortcuts-cheatsheet: ? does not open the sheet')
    await page.close()
  })

  // Focus rings that were missing.
  await step('blocks/accordion', async () => {
    const page = await open(ctx, 'blocks/accordion')
    await press(page, 'Tab')
    const f = await focused(page)
    expect(f.tag === 'BUTTON' && f.ring, `accordion: the focused trigger shows no ring (${JSON.stringify(f)})`)
    await page.close()
  })
  await step('motion/text-scramble', async () => {
    const page = await open(ctx, 'motion/text-scramble')
    await press(page, 'Tab')
    const f = await focused(page)
    expect(f.tag === 'A' && f.ring, `text-scramble demo: the link around the text is not the tab stop (${JSON.stringify(f)})`)
    await page.close()
  })

  // Names and labels.
  await step('blocks/input', async () => {
    const page = await open(ctx, 'blocks/input')
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll('#stage input, #stage select')].filter((el) => !el.labels?.length).length)
    expect(unlabeled === 0, `input demo: ${unlabeled} fields have no connected label`)
    await page.close()
  })
  for (const [id, name] of [['blocks/popover', 'Dimensions'], ['blocks/datepicker', 'Choose a date'], ['blocks/combobox', 'Choose an option']]) await step(id, async () => {
    const page = await open(ctx, id)
    await press(page, 'Tab')
    await press(page, 'Enter')
    await page.waitForSelector('[role=dialog]')
    expect((await nameOf(page, '[role=dialog]')) === name, `${id}: the popup is not named "${name}"`)
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] input')].filter((el) => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length)
    expect(unlabeled === 0, `${id}: ${unlabeled} fields in the popup have no name`)
    await page.close()
  })
  for (const id of ['blocks/bar', 'blocks/spark', 'blocks/progress']) await step(id, async () => {
    const page = await open(ctx, id)
    const nameless = await page.evaluate(() =>
      [...document.querySelectorAll('#stage [role=img], #stage [role=progressbar]')].filter((el) => {
        const ids = el.getAttribute('aria-labelledby')
        const name = ids ? ids.split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join('') : el.getAttribute('aria-label')
        return !(name || '').trim()
      }).length,
    )
    expect(nameless === 0, `${id}: ${nameless} charts or bars have no name`)
    await page.close()
  })

  // Landmarks: the stage frame is not a main, so AppShell's own main is the only one.
  await step('blocks/app-shell', async () => {
    const page = await open(ctx, 'blocks/app-shell')
    const mains = await page.evaluate(() => ({ stage: document.getElementById('stage')?.tagName, mains: document.querySelectorAll('main,[role=main]').length }))
    expect(mains.stage === 'DIV' && mains.mains === 1, `stage: nested main landmarks (${JSON.stringify(mains)})`)
    await page.close()
  })

  // Sample covers carry no words drawn into the picture.
  await step('blocks/coverflow-carousel', async () => {
    const page = await open(ctx, 'blocks/coverflow-carousel')
    const worded = await page.evaluate(() => [...document.querySelectorAll('#stage img')].filter((img) => decodeURIComponent(img.src).includes('<text')).length)
    expect(worded === 0, `coverflow demo: ${worded} covers have words drawn into the picture`)
    await page.close()
  })

  // The weekday row reads at 4.5:1 in both themes. Colors are read back through a canvas, so any CSS color works.
  for (const theme of ['dark', 'light']) await step(`blocks/calendar ${theme}`, async () => {
    const page = await open(ctx, 'blocks/calendar', theme)
    const ratio = await page.evaluate(() => {
      const rgb = (color) => {
        const c = document.createElement('canvas')
        c.width = c.height = 1
        const g = c.getContext('2d')
        g.fillStyle = color
        g.fillRect(0, 0, 1, 1)
        return [...g.getImageData(0, 0, 1, 1).data]
      }
      const lum = ([r, g, b]) => [r, g, b].map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
      const th = document.querySelector('.rdp-weekday')
      let bgEl = th
      while (bgEl && rgb(getComputedStyle(bgEl).backgroundColor)[3] === 0) bgEl = bgEl.parentElement
      const bg = bgEl ? rgb(getComputedStyle(bgEl).backgroundColor) : [255, 255, 255]
      const fgRaw = rgb(getComputedStyle(th).color)
      const a = (fgRaw[3] / 255) * Number(getComputedStyle(th).opacity)
      const fg = fgRaw.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a))
      const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      return (l1 + 0.05) / (l2 + 0.05)
    })
    expect(ratio >= 4.5, `calendar (${theme}): weekday contrast ${ratio.toFixed(2)}:1 is under 4.5:1`)
    await page.close()
  })
  await ctx.close()

  // Reduced motion: the skeleton stands still, and it does pulse without the setting, so the check can fail.
  for (const reducedMotion of ['reduce', 'no-preference']) await step(`blocks/skeleton ${reducedMotion}`, async () => {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion })
    const page = await open(rctx, 'blocks/skeleton')
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)
    if (reducedMotion === 'reduce') expect(running === 0, `skeleton: ${running} animations run under reduced motion`)
    else expect(running > 0, 'skeleton: no pulse without reduced motion, so the reduced motion check proves nothing')
    await rctx.close()
  })
} finally {
  await browser.close()
}
for (const e of pageErrors) problems.push(`pageerror ${e}`)

if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`A11Y FAIL ${problems.length} of ${checks} checks`)
  process.exit(1)
}
console.log(`A11Y OK ${checks} checks`)
