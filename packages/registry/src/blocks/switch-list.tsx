'use client'

import * as React from 'react'
import { cn } from './_cn'

// SwitchList. Settings rows: a name and one line of description on the left, a switch on the right, hairline
// dividers between rows. The whole row is the label, so it is one large hit area. Each switch is a native checkbox
// with role="switch", named by the row title and described by the row description.

export interface SwitchListRow {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  disabled?: boolean
}

export interface SwitchListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  rows: SwitchListRow[]
  onCheckedChange: (id: string, checked: boolean) => void
  /** Heading for the group, rendered as the group's accessible name. */
  heading?: React.ReactNode
}

export function SwitchList({ rows, onCheckedChange, heading, className, ...props }: SwitchListProps) {
  const reactId = React.useId()
  const headingId = heading ? `sw-${reactId}-heading` : undefined
  return (
    <div role="group" aria-labelledby={headingId} className={cn('min-w-0', className)} {...props}>
      {heading && (
        <div id={headingId} className="pb-2 text-sm font-medium text-text">
          {heading}
        </div>
      )}
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => {
          const id = `sw-${reactId}-${r.id}`
          return (
            <li key={r.id}>
              <label
                htmlFor={id}
                className={cn(
                  'flex min-h-11 items-center justify-between gap-4 py-3',
                  r.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn('text-sm', r.disabled ? 'text-text-muted' : 'text-text')}>{r.label}</span>
                  {r.description && (
                    <span id={`${id}-desc`} className="text-label text-text-muted">
                      {r.description}
                    </span>
                  )}
                </span>
                {/* A disabled row keeps readable text (the reason is in the description); only the switch fades. */}
                <span className={cn('relative inline-flex shrink-0', r.disabled && 'opacity-50')}>
                  <input
                    id={id}
                    type="checkbox"
                    role="switch"
                    checked={r.checked}
                    disabled={r.disabled}
                    aria-describedby={r.description ? `${id}-desc` : undefined}
                    onChange={(e) => onCheckedChange(r.id, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-5 w-9 rounded-pill border border-border bg-transparent transition-colors duration-press',
                      'peer-checked:border-transparent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                    )}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-text transition-transform duration-press ease-out',
                      'peer-checked:translate-x-4 peer-checked:bg-accent-fg',
                    )}
                  />
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
