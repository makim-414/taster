'use client'

import * as React from 'react'
import { useFocusTrap } from './use-hotkeys'

// ShortcutsCheatsheet. A keyboard help sheet. Groups are defined by the caller.

export interface ShortcutRow {
  keys: string[]
  label: string
}

export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

export interface ShortcutsCheatsheetProps {
  groups: ShortcutGroup[]
  onClose: () => void
  title?: string
  /** Name of the close button for screen readers. */
  closeLabel?: string
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-bg-sunken px-1.5 py-0.5 text-xs text-text">
      {children}
    </kbd>
  )
}

export function ShortcutsCheatsheet({ groups, onClose, title = 'Keyboard shortcuts', closeLabel = 'Close' }: ShortcutsCheatsheetProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  // The trap moves focus into the sheet on open and back to the opener on close.
  useFocusTrap(dialogRef)
  const titleId = React.useId()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 z-50 w-[min(560px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-popover p-6 shadow-[var(--sh-pop)] outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="m-0 text-base font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:size-9"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-2 text-xs font-medium text-text-subtle">{g.title}</div>
              <div className="divide-y divide-border-soft">
                {g.rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm text-text-muted">{r.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {r.keys.map((k, ki) => (
                        <Key key={ki}>{k}</Key>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
