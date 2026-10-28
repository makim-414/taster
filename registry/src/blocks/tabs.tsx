import * as React from 'react'
import { cn } from './_cn'

// Tabs as a segmented control. The active tab is separated by lightness contrast only, no colored pill.

export interface TabItem {
  value: string
  label: string
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-bg-elev p-1',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'inline-flex h-11 desk:h-8 items-center justify-center rounded-sm px-3 text-sm font-medium',
              'tracking-[-0.01em] transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-bg text-text'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
