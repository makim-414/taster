import * as React from 'react'
import { cn } from './_cn'

// Input and Select with one shared field chrome: transparent surface, hairline border, focus ring.
// API follows shadcn/ui input and select (MIT).
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

const FIELD =
  'h-11 desk:h-9 w-full bg-transparent border border-border-input rounded-md px-3 text-sm text-text ' +
  'placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring outline-none ' +
  'disabled:opacity-50 disabled:pointer-events-none'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(FIELD, className)} {...props} />
  ),
)
Input.displayName = 'Input'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, disabled, ...props }, ref) => (
    <div className={cn('relative', disabled && 'opacity-50')}>
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          FIELD,
          'appearance-none pr-9 cursor-pointer disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle"
      >
        <path d="M5 9l7 7 7-7" />
      </svg>
    </div>
  ),
)
Select.displayName = 'Select'
