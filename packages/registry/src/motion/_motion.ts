// Shared hooks for the motion components. No dependency. Copy this file with any of them.
import * as React from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

// True when the visitor asked for less motion. Re-renders when the setting changes.
export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false),
    () => false,
  )
}

// Becomes true the first time the element scrolls into view, then stays true.
// Without IntersectionObserver (old browsers, some test runners) it is true at once.
export function useInViewOnce<T extends Element>(ref: React.RefObject<T>, rootMargin = '0px', threshold = 0): boolean {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin, threshold, seen])
  return seen
}

// Injects a stylesheet once per id. Used for keyframes, so a component stays a single file.
export function useStyleOnce(id: string, css: string) {
  React.useInsertionEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = css
    document.head.appendChild(el)
  }, [id, css])
}
