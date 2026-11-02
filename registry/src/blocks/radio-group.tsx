'use client'

import * as React from 'react'
import { cn } from './_cn'

// RadioGroup. Native radios in a fieldset, so arrow keys, form submit and screen readers work without extra code.
// Two looks: "list" (a ring and a label per row) and "cards" (option cards with a description). A chosen card gets
// a stronger border in ink, not a tint or a colored glow. The whole row or card is the hit area.

export interface RadioOption {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

export interface RadioGroupProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  legend: React.ReactNode
  /** Hide the legend visually but keep it for assistive tech. */
  hideLegend?: boolean
  options: RadioOption[]
  value: string
  onValueChange: (value: string) => void
  name?: string
  variant?: 'list' | 'cards'
  hint?: React.ReactNode
}

export function RadioGroup({
  legend,
  hideLegend,
  options,
  value,
  onValueChange,
  name,
  variant = 'list',
  hint,
  className,
  ...props
}: RadioGroupProps) {
  const reactId = React.useId()
  const groupName = name ?? `radio-${reactId}`
  const hintId = hint ? `${groupName}-hint` : undefined

  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)} aria-describedby={hintId} {...props}>
      <legend className={cn('mb-2 p-0 text-sm font-medium text-text', hideLegend && 'sr-only')}>{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-3 text-label text-text-muted">
          {hint}
        </p>
      )}
      <div className={cn(variant === 'cards' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-col')}>
        {options.map((o) => {
          const id = `${groupName}-${o.value}`
          const checked = o.value === value
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                'relative flex select-none items-start gap-3 text-sm',
                o.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                variant === 'cards'
                  ? cn(
                      'rounded-md border p-4 transition-colors duration-press',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      checked ? 'border-text' : 'border-border hover:border-text-subtle',
                    )
                  : 'min-h-11 py-2.5 desk:min-h-0 desk:py-1.5',
              )}
            >
              <input
                id={id}
                type="radio"
                name={groupName}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onValueChange(o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-press',
                  o.disabled && 'opacity-50',
                  checked ? 'border-accent' : 'border-border-input',
                  variant === 'list' && 'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                )}
              >
                <span className={cn('size-2 rounded-full bg-accent transition-opacity duration-press', checked ? 'opacity-100' : 'opacity-0')} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn(o.disabled ? 'text-text-muted' : 'text-text', checked && variant === 'cards' && 'font-medium')}>{o.label}</span>
                {o.description && <span className="text-label text-text-muted">{o.description}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
