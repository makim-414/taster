// Stage mode: the demo page with one component on it, used by the gallery on the web, by the preview pictures and by
// preview_component. The address says which one (?only=blocks/button) and how it looks (?look=<json>). A parent page
// on the same origin can change the look without a reload by posting { type: 'taster-look', look }.
export type Look = { theme?: 'light' | 'dark'; tokens?: Record<string, string> }

const params = new URLSearchParams(location.search)
export const ONLY = params.get('only')

// The brand has to beat :root[data-theme="light"] too, and reach nested .theme-dark and .theme-light scopes, or a light
// page keeps its ink buttons and a dark banner drops the color. Same selector as engine/brand.mjs writes.
const SCOPES = ':root,:root[data-theme],.theme-dark,.theme-light'
const SAFE_NAME = /^--[\w-]+$/
const SAFE_VALUE = /^[^{};<>]*$/

export function applyLook(look: Look) {
  const root = document.documentElement
  if (look.theme === 'light' || look.theme === 'dark') root.dataset.theme = look.theme
  let style = document.getElementById('stage-look')
  if (!style) {
    style = document.createElement('style')
    style.id = 'stage-look'
    document.head.appendChild(style)
  }
  const lines = Object.entries(look.tokens || {})
    .filter(([name, value]) => SAFE_NAME.test(name) && typeof value === 'string' && SAFE_VALUE.test(value))
    .map(([name, value]) => `${name}:${value}`)
  style.textContent = lines.length ? `${SCOPES}{${lines.join(';')}}` : ''
  // Canvas components read colors when the theme attribute changes; tell them the tokens changed as well.
  root.style.setProperty('--stage-look', String(Date.now()))
}

export function startStage() {
  const raw = params.get('look')
  if (raw) {
    try { applyLook(JSON.parse(raw)) } catch { /* a broken address shows the default look */ }
  }
  addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.type !== 'taster-look') return
    applyLook(event.data.look || {})
  })
  if (parent === window) return
  const post = () => parent.postMessage({ type: 'taster-stage', only: ONLY, height: document.getElementById('stage')?.scrollHeight ?? 0 }, location.origin)
  new ResizeObserver(post).observe(document.body)
  post()
}
