'use client'

import * as React from 'react'
import { cn } from './_cn'

// CheckboxGroup. A fieldset of checkboxes with an optional "select all" row that shows the mixed state
// (aria-checked="mixed" through the native indeterminate flag). On state fills with the accent token; each label is
// the hit area. Use it when several values can be kept at once; for one of many use RadioGroup.

export interface CheckboxOption {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

export interface CheckboxGroupProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  legend: React.ReactNode
  options: CheckboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  /** Adds a parent checkbox that selects or clears every enabled option. */
  selectAllLabel?: string
  hint?: React.ReactNode
}

function Box({ state, disabled }: { state: 'on' | 'off' | 'mixed'; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-press',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
        disabled && 'opacity-50',
        state === 'off' ? 'border-border-input bg-transparent text-transparent' : 'border-transparent bg-accent text-accent-fg',
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-3">
        {state === 'mixed' ? <path d="M6 12h12" /> : <path d="M5 13l4 4 10-10" />}
      </svg>
    </span>
  )
}

function Row({
  id,
  checked,
  mixed,
  disabled,
  onChange,
  label,
  description,
  strong,
}: {
  id: string
  checked: boolean
  mixed?: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  description?: React.ReactNode
  strong?: boolean
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(mixed)
  }, [mixed])
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 select-none items-start gap-3 py-2.5 text-sm desk:min-h-0 desk:py-1.5',
        // A disabled row keeps readable text (the reason is often in the description); only the box fades.
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <Box state={mixed ? 'mixed' : checked ? 'on' : 'off'} disabled={disabled} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn(disabled ? 'text-text-muted' : 'text-text', strong && 'font-medium')}>{label}</span>
        {description && <span className="text-label text-text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function CheckboxGroup({
  legend,
  options,
  value,
  onValueChange,
  selectAllLabel,
  hint,
  className,
  ...props
}: CheckboxGroupProps) {
  const reactId = React.useId()
  const hintId = hint ? `cbg-${reactId}-hint` : undefined
  const enabled = options.filter((o) => !o.disabled).map((o) => o.value)
  const chosen = enabled.filter((v) => value.includes(v))
  const all = enabled.length > 0 && chosen.length === enabled.length
  const some = chosen.length > 0 && !all

  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)} aria-describedby={hintId} {...props}>
      <legend className="mb-2 p-0 text-sm font-medium text-text">{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-2 text-label text-text-muted">
          {hint}
        </p>
      )}
      {selectAllLabel && (
        <div className="border-b border-border">
          <Row
            id={`cbg-${reactId}-all`}
            checked={all}
            mixed={some}
            onChange={() => {
              const keepDisabled = value.filter((v) => !enabled.includes(v))
              onValueChange(all ? keepDisabled : [...keepDisabled, ...enabled])
            }}
            label={selectAllLabel}
            strong
          />
        </div>
      )}
      <div className={cn('flex flex-col', selectAllLabel && 'pl-7')}>
        {options.map((o) => (
          <Row
            key={o.value}
            id={`cbg-${reactId}-${o.value}`}
            checked={value.includes(o.value)}
            disabled={o.disabled}
            onChange={(on) => onValueChange(on ? [...value, o.value] : value.filter((v) => v !== o.value))}
            label={o.label}
            description={o.description}
          />
        ))}
      </div>
    </fieldset>
  )
}
