'use client'

import * as React from 'react'
import { cn } from './_cn'

// OtpInput. A one-time code split into single digit boxes. The first box asks the browser for the code
// (autocomplete="one-time-code"), pasting a full code fills every box, Backspace walks back, arrow keys move.
// Each box is named "Digit 2 of 6" inside a group named by `label`. onComplete fires once every box is filled.

export interface OtpInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string
  value: string
  onValueChange: (value: string) => void
  length?: number
  onComplete?: (code: string) => void
  disabled?: boolean
  invalid?: boolean
  digitLabel?: (index: number, length: number) => string
}

export function OtpInput({
  label,
  value,
  onValueChange,
  length = 6,
  onComplete,
  disabled,
  invalid,
  digitLabel = (i, n) => `Digit ${i + 1} of ${n}`,
  className,
  ...props
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([])
  const chars = Array.from({ length }, (_, i) => value[i] ?? '')

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onValueChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  return (
    <div role="group" aria-label={label} className={cn('flex gap-2', className)} {...props}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          value={c}
          disabled={disabled}
          aria-label={digitLabel(i, length)}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '')
            if (!typed) return
            if (typed.length > 1) {
              const clean = set(value.slice(0, i) + typed)
              focus(clean.length)
              return
            }
            const arr = chars.slice()
            arr[i] = typed
            const clean = set(arr.join(''))
            focus(Math.min(i + 1, clean.length))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              const arr = chars.slice()
              if (arr[i]) {
                arr[i] = ''
                set(arr.join('').slice(0, i) + arr.slice(i + 1).join(''))
              } else if (i > 0) {
                arr[i - 1] = ''
                set(arr.slice(0, i - 1).join('') + arr.slice(i).join(''))
                focus(i - 1)
              }
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              focus(i - 1)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              focus(i + 1)
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const clean = set(e.clipboardData.getData('text'))
            focus(clean.length)
          }}
          className={cn(
            'h-12 w-11 rounded-md border bg-transparent text-center text-title tabular-nums text-text outline-none',
            'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            invalid ? 'border-danger' : c ? 'border-text-subtle' : 'border-border-input',
          )}
        />
      ))}
    </div>
  )
}
