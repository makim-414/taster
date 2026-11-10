'use client'

import * as React from 'react'
import { cn } from './_cn'
import { Kbd } from './kbd'

// SearchField. A search box that filters a list on the page: leading search icon, a clear button once there is
// text, an optional one-key shortcut (default "/") that focuses it from anywhere outside another field, and a
// polite live count of results. For commands and places across the app use the command palette instead.

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name. Shown as the placeholder too unless one is given. */
  label: string
  /** A single key that focuses the field, shown as a hint while it is empty. Pass null to turn it off. */
  shortcut?: string | null
  /** Number of matches, announced politely. Leave undefined to say nothing. */
  resultCount?: number
  resultLabel?: (count: number) => string
  clearLabel?: string
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value,
      onValueChange,
      label,
      shortcut = '/',
      resultCount,
      resultLabel = (n) => (n === 1 ? '1 result' : `${n} results`),
      clearLabel = 'Clear search',
      placeholder,
      className,
      onKeyDown,
      ...props
    },
    forwarded,
  ) => {
    const inner = React.useRef<HTMLInputElement | null>(null)
    const setRef = (el: HTMLInputElement | null) => {
      inner.current = el
      if (typeof forwarded === 'function') forwarded(el)
      else if (forwarded) forwarded.current = el
    }

    React.useEffect(() => {
      if (!shortcut) return
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
        e.preventDefault()
        inner.current?.focus()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [shortcut])

    return (
      <div className={cn('relative w-full', className)}>
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
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={setRef}
          type="search"
          aria-label={label}
          placeholder={placeholder ?? label}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.preventDefault()
              onValueChange('')
            }
            onKeyDown?.(e)
          }}
          className={cn(
            'h-11 w-full rounded-md border border-border-input bg-transparent pl-9 pr-12 text-sm text-text desk:h-9',
            'placeholder:text-text-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onValueChange('')
                inner.current?.focus()
              }}
              aria-label={clearLabel}
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-md text-text-subtle outline-none desk:size-9',
                'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : shortcut ? (
            <span className="pr-3" aria-hidden="true">
              <Kbd>{shortcut}</Kbd>
            </span>
          ) : null}
        </div>
        {resultCount !== undefined && (
          <span className="sr-only" role="status" aria-live="polite">
            {value ? resultLabel(resultCount) : ''}
          </span>
        )}
      </div>
    )
  },
)
SearchField.displayName = 'SearchField'
