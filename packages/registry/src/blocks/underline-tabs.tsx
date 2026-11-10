'use client'

import * as React from 'react'
import { cn } from './_cn'

// UnderlineTabs. Text tabs on a hairline baseline for sibling views of one record (Overview, Activity, Settings).
// Full tabs pattern: role tablist, tab and tabpanel with ids, roving tabindex, Left and Right arrows, Home and End.
// Selection follows focus. The active tab is full ink with a 2px ink underline; counts are plain figures.
// For a two to four option mode switch inside a panel, use Tabs (blocks/tabs) instead.

export interface UnderlineTab {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

export interface UnderlineTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  tabs: UnderlineTab[]
  value: string
  onValueChange: (value: string) => void
  /** Names the tab list, for example "Project sections". */
  label: string
  /** Renders the panel for the active tab. Omit to render tabs only. */
  renderPanel?: (value: string) => React.ReactNode
}

export function UnderlineTabs({ tabs, value, onValueChange, label, renderPanel, className, ...props }: UnderlineTabsProps) {
  const base = React.useId()
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const enabled = tabs.filter((t) => !t.disabled)

  const move = (from: string, step: number | 'first' | 'last') => {
    const i = enabled.findIndex((t) => t.value === from)
    let next: UnderlineTab | undefined
    if (step === 'first') next = enabled[0]
    else if (step === 'last') next = enabled[enabled.length - 1]
    else next = enabled[(i + step + enabled.length) % enabled.length]
    if (!next) return
    onValueChange(next.value)
    refs.current[next.value]?.focus()
  }

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = t.value === value
          return (
            <button
              key={t.value}
              ref={(el) => {
                refs.current[t.value] = el
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.value}`}
              aria-selected={active}
              aria-controls={renderPanel ? `${base}-panel-${t.value}` : undefined}
              tabIndex={active ? 0 : -1}
              disabled={t.disabled}
              onClick={() => onValueChange(t.value)}
              onKeyDown={(e) => {
                const k = e.key
                if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
                  e.preventDefault()
                  move(t.value, k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : k === 'Home' ? 'first' : 'last')
                }
              }}
              className={cn(
                '-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm outline-none desk:h-10',
                'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                active ? 'border-text font-medium text-text' : 'border-transparent text-text-muted hover:text-text',
              )}
            >
              {t.label}
              {typeof t.count === 'number' && <span className="tabular-nums text-text-subtle">{t.count}</span>}
            </button>
          )
        })}
      </div>
      {renderPanel && (
        <div
          role="tabpanel"
          id={`${base}-panel-${value}`}
          aria-labelledby={`${base}-tab-${value}`}
          tabIndex={0}
          className="pt-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {renderPanel(value)}
        </div>
      )}
    </div>
  )
}
