'use client'

import * as React from 'react'
import { cn } from './_cn'
import { useFocusTrap } from './use-hotkeys'

// CommandPalette. A command menu opened with mod+k. Tokens only, no external UI dependency.
// Items are defined by the caller, each item carries its own run() callback.

export interface CommandItem {
  id: string
  kind: string
  label: string
  hint?: string
  run: () => void
}

export interface CommandPaletteProps {
  items: CommandItem[]
  onClose: () => void
  placeholder?: string
}

export function CommandPalette({ items, onClose, placeholder = 'Search commands' }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('')
  const [hi, setHi] = React.useState(0)
  const dialogRef = React.useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => `${it.kind} ${it.label} ${it.hint ?? ''}`.toLowerCase().includes(q))
  }, [items, query])

  const clampedHi = Math.min(hi, Math.max(0, filtered.length - 1))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[clampedHi]?.run()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'var(--scrim)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed left-1/2 top-[12vh] z-50 w-[min(620px,94vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-bg-elev shadow-[var(--sh-pop)]"
        onKeyDown={onKeyDown}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHi(0)
          }}
          placeholder={placeholder}
          className="h-12 w-full border-b border-border bg-transparent px-4 text-base text-text outline-none placeholder:text-text-subtle"
        />
        <div className="max-h-[52vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-text-muted">No results</div>
          )}
          {filtered.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onMouseMove={() => setHi(i)}
              onClick={() => it.run()}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2 text-left text-sm outline-none',
                i === clampedHi ? 'bg-bg' : 'hover:bg-bg',
              )}
            >
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-text-subtle">
                {it.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-text">{it.label}</span>
              {it.hint && <span className="shrink-0 text-xs text-text-subtle">{it.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
