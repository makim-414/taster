// Injection gate. A component copied into an app renders whatever its props hold, so this renders every component
// that puts a prop into markup a browser could run, with hostile values, and fails on anything runnable in the output:
// an element or an on* handler smuggled in through an icon title, an href or form action whose scheme is not http,
// https or mailto, or a storage key that closes the theme script early. No browser needed.
// Run: npm ci --prefix packages/registry, then node packages/registry/test-injection.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// One CommonJS bundle with React inside, so the components and the server renderer share the same copy.
const out = await build({
  stdin: {
    contents: [
      "export { createElement as h } from 'react'",
      "export { renderToStaticMarkup } from 'react-dom/server'",
      "export { safeHref, youtubeId } from './src/blocks/_url'",
      "export * from './src/index'",
    ].join('\n'),
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taster-injection-'))
const file = path.join(dir, 'bundle.cjs')
fs.writeFileSync(file, out.outputFiles[0].text)
const R = require(file)
fs.rmSync(dir, { recursive: true, force: true })
const { h, renderToStaticMarkup } = R

const problems = []
let checks = 0
const expect = (ok, message) => {
  checks++
  if (!ok) problems.push(message)
}

// What a browser does to a URL before it reads the scheme: drop leading and trailing C0 controls and spaces, and
// every tab and newline. Written separately from src/blocks/_url.ts, so the two can catch each other.
const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'" })[e])
function schemeOf(url) {
  let u = url
  while (u.length && u.charCodeAt(0) <= 0x20) u = u.slice(1)
  while (u.length && u.charCodeAt(u.length - 1) <= 0x20) u = u.slice(0, -1)
  u = u.split('').filter((c) => c !== '\t' && c !== '\n' && c !== '\r').join('')
  const m = u.match(/^([a-z][a-z0-9+.-]*):/i)
  return m ? m[1].toLowerCase() : null
}
const ALLOWED = new Set(['http', 'https', 'mailto'])

const BAD_URLS = [
  'javascript:alert(1)',
  ' JaVaScRiPt:alert(1)',
  'java\tscript:alert(1)',
  '\u0001javascript:alert(1)',
  'javascript\n:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
]
const OK = 'https://example.com/ok'

/** Every href, xlink:href, action and formaction value in the markup, decoded. */
function urlsIn(html) {
  return [...html.matchAll(/\s(href|xlink:href|action|formaction)="([^"]*)"/gi)].map((m) => ({ attr: m[1], value: decode(m[2]) }))
}

function checkMarkup(name, html) {
  for (const { attr, value } of urlsIn(html)) {
    const scheme = schemeOf(value)
    expect(scheme === null || ALLOWED.has(scheme), `${name}: ${attr}="${JSON.stringify(value).slice(1, -1)}" would run`)
  }
  expect(!/<(script|image|iframe|object|embed|img)\b[^>]*\son[a-z]+=/i.test(html), `${name}: an element with an on* handler`)
  expect(!/<image\b/i.test(html), `${name}: an <image> element came in through a prop`)
}

// Each case renders one component with a URL slot set to u.
const noop = () => {}
const img = { src: '/a.jpg', alt: 'A' }
const cases = {
  'blocks/citations': (u) => h(R.CitationList, { idPrefix: 'c', citations: [{ id: 'a', title: 'A', domain: 'example.com', url: u }] }),
  'blocks/app-shell': (u) => h(R.AppShell, { brand: 'Brand', nav: [{ label: 'Home', href: u }] }, 'Body'),
  'blocks/spotlight-card': (u) => h(R.SpotlightCard, { href: u }, 'Card'),
  'blocks/liquid-nav': (u) => h(R.LiquidNavbar, { items: [{ label: 'Home', href: u }, { label: 'Two' }] }),
  'blocks/glass-folder': (u) => h(R.GlassFolder, { label: 'Folder', defaultOpen: true, files: [{ name: 'Brief', href: u }, { name: 'Notes' }] }),
  'blocks/item-list': (u) => h(R.ItemList, { items: [{ id: 'a', name: 'A', href: u }] }),
  'blocks/sidebar-nav': (u) => h(R.SidebarNav, { groups: [{ id: 'g', items: [{ id: 'a', label: 'A', href: u }] }] }),
  'commerce/cart': (u) =>
    h(R.Cart, {
      lines: [{ id: 'a', name: 'A', unitPrice: 10, quantity: 1, image: img, href: u }],
      onQuantity: noop,
      onRemove: noop,
      shipping: 0,
      checkout: { label: 'Check out', href: u },
    }),
  'commerce/product-card': (u) => h(R.ProductCard, { product: { id: 'a', href: u, name: 'A', price: '$1', image: img } }),
  'content/pull-quote': (u) => h(R.PullQuote, { quote: 'Q', name: 'N', source: { href: u, label: 'Source' } }),
  'content/section-heading': (u) => h(R.SectionHeading, { title: 'T', link: { label: 'More', href: u } }),
  'marketing/audience-split': (u) => h(R.AudienceSplit, { title: 'T', doors: [{ title: 'D', body: 'B', href: u, linkLabel: 'Go' }] }),
  'marketing/breadcrumb': (u) => h(R.Breadcrumb, { items: [{ label: 'Home', href: u }, { label: 'Here' }] }),
  'marketing/case-study-card': (u) => h(R.CaseStudyCard, { study: { href: u, result: 'R', who: 'W', summary: 'S' } }),
  'marketing/cta-band': (u) => h(R.CtaBand, { title: 'T', primary: { label: 'One', href: u }, secondary: { label: 'Two', href: u } }),
  'marketing/customer-quote': (u) => h(R.CustomerQuote, { quote: 'Q', name: 'N', role: 'R', link: { label: 'Read', href: u } }),
  'marketing/feature-grid': (u) => h(R.FeatureGrid, { items: [{ title: 'T', body: 'B', link: { label: 'L', href: u } }] }),
  'marketing/feature-grid list': (u) => h(R.FeatureGrid, { layout: 'list', items: [{ title: 'T', body: 'B', link: { label: 'L', href: u } }] }),
  'marketing/feature-rows': (u) =>
    h(R.FeatureRows, { rows: [{ id: 'a', title: 'T', body: 'B', link: { label: 'L', href: u }, media: { ...img, width: 4, height: 3 } }] }),
  'marketing/logo-wall': (u) => h(R.LogoWall, { caption: 'C', items: [{ name: 'Acme', href: u }] }),
  'marketing/photo-hero': (u) => h(R.PhotoHero, { image: img, title: 'T', action: { label: 'Go', href: u } }),
  'marketing/topo-hero': (u) => h(R.TopoHero, { image: img, title: 'T', action: { label: 'Go', href: u } }),
  'marketing/plan-rows': (u) =>
    h(R.PlanRows, { plans: [{ id: 'a', name: 'A', blurb: 'B', price: { monthly: '$1', yearly: '$10' }, features: ['F'], cta: { label: 'Buy', href: u } }] }),
  'marketing/plan-table': (u) =>
    h(R.PlanTable, {
      caption: 'Plans',
      plans: [{ id: 'a', name: 'A', price: '$1', cta: { label: 'Buy', href: u } }],
      groups: [{ title: 'G', rows: [{ label: 'R', values: { a: true } }] }],
    }),
  'marketing/pricing-cards': (u) => h(R.PricingCards, { plans: [{ id: 'a', name: 'A', blurb: 'B', price: '$1', features: ['F'], cta: { label: 'Buy', href: u } }] }),
  'marketing/product-hero': (u) =>
    h(R.ProductHero, { title: 'T', lead: 'L', primary: { label: 'One', href: u }, secondary: { label: 'Two', href: u }, media: { ...img, width: 4, height: 3 } }),
  'marketing/site-footer': (u) =>
    h(R.SiteFooter, { brand: 'Brand', copyright: 'C', columns: [{ title: 'Col', links: [{ label: 'L', href: u }] }], legal: [{ label: 'Terms', href: u }] }),
  'marketing/site-header': (u) =>
    h(R.SiteHeader, {
      brand: 'Brand',
      brandHref: u,
      links: [{ label: 'L', href: u, items: [{ label: 'Sub', href: u }] }, { label: 'M', href: u }],
      signIn: { label: 'Sign in', href: u },
      action: { label: 'Start', href: u },
    }),
  'marketing/slim-footer': (u) => h(R.SlimFooter, { copyright: 'C', links: [{ label: 'L', href: u }] }),
  'marketing/inline-signup': (u) => h(R.InlineSignup, { title: 'T', label: 'Email', submitLabel: 'Join', action: u }),
  'marketing/split-form-hero': (u) =>
    h(R.SplitFormHero, { title: 'T', lead: 'L', field: { label: 'Email' }, submitLabel: 'Send', action: u, aside: 'A' }),
  'media/snap-carousel': (u) => h(R.SnapCarousel, { label: 'L', items: [{ id: 'a', image: img, title: 'T', href: u }] }),
}

for (const [name, render] of Object.entries(cases)) {
  for (const u of BAD_URLS) {
    let html = ''
    try {
      html = renderToStaticMarkup(render(u))
    } catch (e) {
      expect(false, `${name}: did not render (${e.message})`)
      continue
    }
    checkMarkup(name, html)
  }
  // A good URL still makes a link, so the gate is not passing because nothing links at all.
  const html = renderToStaticMarkup(render(OK))
  checkMarkup(name, html)
  expect(urlsIn(html).some((x) => x.value === OK), `${name}: a safe URL no longer renders as a link`)
}

// Icon titles are text, never markup.
const hostileTitle = '</title><image href="x" onerror="alert(1)"/><title>'
const icon = renderToStaticMarkup(h(R.Icon, { name: 'search', title: hostileTitle }))
checkMarkup('icons Icon title', icon)
expect(icon.includes('<title>&lt;/title&gt;&lt;image'), 'icons Icon: the title is not kept as escaped text')
expect(icon.includes('<circle'), 'icons Icon: the glyph is missing')
expect(!renderToStaticMarkup(h(R.Icon, { name: 'search' })).includes('<title'), 'icons Icon: a decorative icon has a title')

// The theme script keeps its storage key inside one string literal and inside its own <script> element.
const hostileKey = '</script><script>alert(1)</script>'
const script = R.appearanceInitScript(hostileKey)
expect(!/<\/script/i.test(script), 'appearance-picker: the init script can close its <script> element early')
expect(!script.includes('<'), 'appearance-picker: the init script carries a raw <')
{
  const read = []
  const stub = { getItem: (k) => (read.push(k), 'light') }
  const doc = { documentElement: { setAttribute: noop } }
  new Function('localStorage', 'matchMedia', 'document', script)(stub, () => ({ matches: false }), doc)
  expect(read.length === 1 && read[0] === hostileKey, 'appearance-picker: the init script no longer reads the key it was given')
}
const page = renderToStaticMarkup(h('script', { dangerouslySetInnerHTML: { __html: R.appearanceInitScript(hostileKey) } }))
expect((page.match(/<\/script/gi) || []).length === 1, 'appearance-picker: the script element closes more than once')

// The link check itself.
for (const u of BAD_URLS) expect(R.safeHref(u) === undefined, `safeHref passes ${JSON.stringify(u)}`)
for (const u of ['/pricing', 'pricing', './a:b', '#top', '?q=1', '//example.com/a', 'https://example.com', 'HTTP://example.com', 'mailto:hi@example.com', ''])
  expect(R.safeHref(u) === u, `safeHref refuses ${JSON.stringify(u)}`)
expect(R.safeHref(undefined) === undefined, 'safeHref turns undefined into a URL')

// Coverflow links only to a YouTube watch page it built from a checked id, never to the trailer URL it was given.
const ID = 'dQw4w9WgXcQ'
for (const u of [`https://www.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}`, `http://m.youtube.com/watch?v=${ID}&t=3`])
  expect(R.youtubeId(u) === ID, `youtubeId misses ${u}`)
for (const u of [`javascript://www.youtube.com/%0aalert(1)?v=${ID}`, `https://notyoutube.com/watch?v=${ID}`, `https://example.com/?v=${ID}`, 'https://youtu.be/short', ''])
  expect(R.youtubeId(u) === undefined, `youtubeId passes ${u}`)
const coverflow = fs.readFileSync(path.join(root, 'src/blocks/coverflow-carousel.tsx'), 'utf8')
expect(!/href=\{[^}]*trailerUrl/.test(coverflow), 'coverflow-carousel: a link points at the raw trailerUrl')

if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`INJECTION FAIL ${problems.length} of ${checks} checks`)
  process.exit(1)
}
console.log(`INJECTION OK ${checks} checks: ${Object.keys(cases).length} link cases, the icon title, the theme script and the trailer link`)
