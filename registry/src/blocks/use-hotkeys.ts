'use client'

import * as React from 'react'

// Keyboard hooks, React only, no dependency.
// useHotkeys: mod+k (works while typing), two-key chords like 'g q', single keys (ignored while typing).
// useFocusTrap: cycles Tab inside a modal. useListNavigation: j/k and arrow keys over a list.

export type HotkeyHandler = (e: KeyboardEvent) => void

const isTyping = (el: EventTarget | null): boolean => {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

export function useHotkeys(bindings: Record<string, HotkeyHandler>, enabled = true): void {
  const ref = React.useRef(bindings)
  ref.current = bindings

  React.useEffect(() => {
    if (!enabled) return
    let chordPrefix: string | null = null
    let chordTimer: ReturnType<typeof setTimeout> | null = null

    const clearChord = () => {
      chordPrefix = null
      if (chordTimer) clearTimeout(chordTimer)
      chordTimer = null
    }

    const onKey = (e: KeyboardEvent) => {
      const map = ref.current
      const key = e.key.toLowerCase()

      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const binding = map[`mod+${key}`]
        if (binding) {
          e.preventDefault()
          binding(e)
          return
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping(e.target)) return

      if (chordPrefix) {
        const combo = `${chordPrefix} ${key}`
        clearChord()
        const binding = map[combo]
        if (binding) {
          e.preventDefault()
          binding(e)
          return
        }
      }

      if (map[key]) {
        e.preventDefault()
        map[key](e)
        return
      }
      const startsChord = Object.keys(map).some((k) => k.startsWith(`${key} `))
      if (startsChord) {
        chordPrefix = key
        chordTimer = setTimeout(clearChord, 800)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearChord()
    }
  }, [enabled])
}

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active = true): void {
  React.useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const selector =
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement
      if (e.shiftKey && activeEl === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKey, true)
    return () => node.removeEventListener('keydown', onKey, true)
  }, [ref, active])
}

export function useListNavigation({
  length,
  onOpen,
  enabled = true,
}: {
  length: number
  onOpen?: (index: number) => void
  enabled?: boolean
}): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (index > length - 1) setIndex(Math.max(0, length - 1))
  }, [length, index])

  React.useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          setIndex((i) => Math.min(length - 1, i + 1))
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          setIndex((i) => Math.max(0, i - 1))
          break
        case 'Home':
          e.preventDefault()
          setIndex(0)
          break
        case 'End':
          e.preventDefault()
          setIndex(length - 1)
          break
        case 'Enter':
          if (onOpen) {
            e.preventDefault()
            onOpen(index)
          }
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, length, index, onOpen])

  return [index, setIndex]
}
