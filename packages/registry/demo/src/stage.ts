// Stage mode: the demo page with one component on it, used by the gallery on the web, by the preview pictures and by
// preview_component. The address says which one (#only=blocks/button) and how it looks (#look=<json>). The web puts
// both after the #, so every frame asks for the same document and the browser downloads it once; ?only= and ?look=
// still work for the file:// callers. A parent page on the same origin can change the look without a reload by posting
// { type: 'taster-look', look }, and pause a frame it scrolled out of sight with { type: 'taster-pause', paused }.
export type Look = { theme?: 'light' | 'dark'; tokens?: Record<string, string> }

const fromHash = new URLSearchParams(location.hash.slice(1))
const params = fromHash.has('only') ? fromHash : new URLSearchParams(location.search)
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

// While paused, animation frames wait and running animations hold, so the frame keeps its state and costs nothing until
// it is back in sight. The frames asked for while paused run together on the first frame after it resumes.
const nativeFrame = requestAnimationFrame.bind(window)
const nativeCancel = cancelAnimationFrame.bind(window)
const waiting = new Map<number, FrameRequestCallback>()
const held = new Set<Animation>()
let paused = false
let nextHeld = 0

function setPaused(on: boolean) {
  if (on === paused) return
  paused = on
  if (on) {
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'running') { animation.pause(); held.add(animation) }
    }
    return
  }
  for (const animation of held) animation.play()
  held.clear()
  nativeFrame((time) => {
    if (paused) return
    const callbacks = [...waiting.values()]
    waiting.clear()
    for (const callback of callbacks) {
      try { callback(time) } catch (error) { reportError(error) } // one failing callback does not stop the rest, as with the browser's own
    }
  })
}

export function startStage() {
  window.requestAnimationFrame = (callback) => {
    if (!paused) return nativeFrame(callback)
    // Negative ids never collide with the browser's own, so cancelAnimationFrame can tell them apart.
    nextHeld -= 1
    waiting.set(nextHeld, callback)
    return nextHeld
  }
  window.cancelAnimationFrame = (id) => {
    if (!waiting.delete(id)) nativeCancel(id)
  }
  const raw = params.get('look')
  if (raw) {
    try { applyLook(JSON.parse(raw)) } catch { /* a broken address shows the default look */ }
  }
  addEventListener('message', (event) => {
    if (event.origin !== location.origin) return
    if (event.data?.type === 'taster-look') applyLook(event.data.look || {})
    if (event.data?.type === 'taster-pause') setPaused(event.data.paused === true)
  })
  if (parent === window) return
  const post = () => parent.postMessage({ type: 'taster-stage', only: ONLY, height: document.getElementById('stage')?.scrollHeight ?? 0 }, location.origin)
  new ResizeObserver(post).observe(document.body)
  post()
}
