'use client'

import * as React from 'react'
import { cn } from './_cn'

// Field. Wires a label, one control, a hint and an error together so the control is named and described:
// it clones the child with id, aria-describedby, aria-invalid and aria-required. Works with Input, Select,
// Textarea or any element that accepts those props. The error is plain text with a small danger mark, never a
// red box. Mark the optional fields instead of starring the required ones.

export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: React.ReactNode
  /** Exactly one control element. */
  children: React.ReactElement
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /** Shows "Optional" next to the label. */
  optional?: boolean
  optionalLabel?: string
  id?: string
}

export function Field({
  label,
  children,
  hint,
  error,
  required,
  optional,
  optionalLabel = 'Optional',
  id,
  className,
  ...props
}: FieldProps) {
  const reactId = React.useId()
  const controlId = id ?? (children.props as { id?: string }).id ?? `field-${reactId}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const own = (children.props as { 'aria-describedby'?: string })['aria-describedby']
  const describedBy = [own, hintId, errorId].filter(Boolean).join(' ') || undefined

  const control = React.cloneElement(children, {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    required,
  } as Record<string, unknown>)

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={controlId} className="text-sm font-medium text-text">
          {label}
        </label>
        {optional && !required && <span className="text-label text-text-subtle">{optionalLabel}</span>}
      </div>
      {control}
      {hint && (
        <p id={hintId} className="text-label text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-label text-text">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-danger"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
