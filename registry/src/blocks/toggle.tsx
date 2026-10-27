import * as React from 'react'
import { cn } from './_cn'

// Checkbox and Switch. On state uses the accent token so a theme recolors it.
// API follows shadcn/ui checkbox and switch (MIT).
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-3 w-3"
  >
    <path d="M5 13l4 4 10-10" />
  </svg>
)

// ── Checkbox ─────────────────────────────────────────────────────────────────

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, checked, disabled, ...props }, ref) => {
    const reactId = React.useId()
    const inputId = id ?? reactId
    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex min-h-11 select-none items-center gap-2 text-sm text-text desk:min-h-0',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-md border border-border-input bg-transparent transition-colors',
              'text-transparent peer-checked:border-transparent peer-checked:bg-accent peer-checked:text-accent-fg',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
            )}
          >
            <CheckIcon />
          </span>
        </span>
        {label != null && <span>{label}</span>}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'

// ── Switch ───────────────────────────────────────────────────────────────────

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, id, checked, disabled, ...props }, ref) => {
    const reactId = React.useId()
    const inputId = id ?? reactId
    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex min-h-11 select-none items-center gap-2 text-sm text-text desk:min-h-0',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              'block h-5 w-9 rounded-full border border-border bg-transparent transition-colors',
              'peer-checked:border-transparent peer-checked:bg-accent',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
            )}
          />
          <span
            className={cn(
              'pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-text transition-transform',
              'peer-checked:translate-x-4 peer-checked:bg-accent-fg',
            )}
          />
        </span>
        {label != null && <span>{label}</span>}
      </label>
    )
  },
)
Switch.displayName = 'Switch'
