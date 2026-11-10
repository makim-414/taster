'use client'

import * as React from 'react'
import { cn } from './_cn'

// TagInput. Free text values kept as a list: type and press Enter or comma to add, paste a comma separated list,
// Backspace in the empty field removes the last one. Each tag is a button that removes itself, so it can be
// reached by keyboard and is a full size touch target. Additions and removals are announced politely.

export interface TagInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string[]
  onValueChange: (value: string[]) => void
  /** Accessible name of the text field. Pair with a visible label through Field or aria-labelledby. */
  label: string
  id?: string
  placeholder?: string
  max?: number
  /** Return a message to reject a tag, or null to accept it. */
  validate?: (tag: string) => string | null
  removeLabel?: (tag: string) => string
  disabled?: boolean
  'aria-describedby'?: string
}

export function TagInput({
  value,
  onValueChange,
  label,
  id,
  placeholder,
  max,
  validate,
  removeLabel = (t) => `Remove ${t}`,
  disabled,
  className,
  'aria-describedby': describedBy,
  ...props
}: TagInputProps) {
  const [draft, setDraft] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const reactId = React.useId()
  const errorId = `tags-${reactId}-error`
  const full = typeof max === 'number' && value.length >= max

  const commit = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const p of parts) {
      if (next.includes(p)) continue
      if (typeof max === 'number' && next.length >= max) {
        setError(`Up to ${max} tags`)
        break
      }
      const problem = validate?.(p) ?? null
      if (problem) {
        setError(problem)
        continue
      }
      next.push(p)
    }
    if (next.length !== value.length) {
      setError(null)
      setMessage(`Added ${next.slice(value.length).join(', ')}`)
      onValueChange(next)
    }
    setDraft('')
  }

  const remove = (tag: string) => {
    onValueChange(value.filter((t) => t !== tag))
    setMessage(`Removed ${tag}`)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)} {...props}>
      <div
        className={cn(
          'flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-md border border-border-input px-1.5 desk:min-h-9 desk:py-1',
          'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring',
          disabled && 'pointer-events-none opacity-50',
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus()
        }}
      >
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => remove(t)}
            aria-label={removeLabel(t)}
            className={cn(
              'inline-flex h-11 items-center gap-1 rounded-sm border border-border bg-bg-elev px-2 text-sm text-text outline-none desk:h-7',
              'transition-colors duration-press hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span>{t}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" className="text-text-subtle">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          disabled={disabled || full}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          placeholder={full ? '' : placeholder}
          onChange={(e) => {
            const v = e.target.value
            if (v.includes(',')) commit(v)
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1])
            }
          }}
          onBlur={() => commit(draft)}
          className="h-11 min-w-[8ch] flex-1 bg-transparent px-1.5 text-sm text-text outline-none placeholder:text-text-subtle desk:h-7"
        />
      </div>
      {error && (
        <p id={errorId} className="text-label text-text">
          {error}
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  )
}
