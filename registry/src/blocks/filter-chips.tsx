'use client'

import * as React from 'react'
import { cn } from './_cn'

// FilterChips. A wrapping row of toggle chips that filter a list. Selected chips invert tone (accent fill),
// unselected stay quiet with a hairline. Each chip is a button with aria-pressed; counts sit in the label in the
// same ink, never in a colored bubble. "Clear" appears once something is selected.

export interface FilterChipOption {
  value: string
  label: string
  count?: number
}

export interface FilterChipsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Names the group for assistive tech, for example "Filter by status". */
  label: string
  options: FilterChipOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  /** Single choice: pressing a chip replaces the selection. */
  single?: boolean
  clearLabel?: string
}

export function FilterChips({
  label,
  options,
  value,
  onValueChange,
  single = false,
  clearLabel = 'Clear',
  className,
  ...props
}: FilterChipsProps) {
  const toggle = (v: string) => {
    const on = value.includes(v)
    if (single) onValueChange(on ? [] : [v])
    else onValueChange(on ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)} {...props}>
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o.value)}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 rounded-pill border px-3 text-sm outline-none desk:h-8',
              'transition-colors duration-press ease-out focus-visible:ring-2 focus-visible:ring-ring',
              on
                ? 'border-transparent bg-accent font-medium text-accent-fg'
                : 'border-border text-text-muted hover:border-text-subtle hover:text-text',
            )}
          >
            <span>{o.label}</span>
            {typeof o.count === 'number' && <span className="tabular-nums">{o.count}</span>}
          </button>
        )
      })}
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onValueChange([])}
          className={cn(
            'inline-flex h-11 items-center rounded-md px-2 text-sm text-text-muted underline underline-offset-4 outline-none desk:h-8',
            'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {clearLabel}
        </button>
      )}
    </div>
  )
}
