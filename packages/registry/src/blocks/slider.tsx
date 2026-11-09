'use client'

import * as React from 'react'
import { cn } from './_cn'

// Slider. A native range input (so arrow keys, Page Up and Down, Home and End and touch all work) laid over a
// token-drawn track: neutral rail, accent fill, ink thumb. The value is printed beside the label with tabular
// figures and read out through aria-valuetext. Optional marks label a few stops under the track.

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'> {
  label: React.ReactNode
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Turns the number into display text, for example (v) => `${v} GB`. */
  format?: (value: number) => string
  marks?: number[]
  hint?: React.ReactNode
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, onValueChange, min = 0, max = 100, step = 1, format = String, marks, hint, id, disabled, className, ...props }, ref) => {
    const reactId = React.useId()
    const inputId = id ?? `slider-${reactId}`
    const hintId = hint ? `${inputId}-hint` : undefined
    const span = max - min || 1
    const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / span) * 100
    const p = pct(value)

    return (
      <div className={cn('flex w-full flex-col gap-1.5', disabled && 'opacity-50', className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
          <output htmlFor={inputId} className="text-sm tabular-nums text-text-muted">
            {format(value)}
          </output>
        </div>
        <div className="group relative h-11 desk:h-8">
          <input
            ref={ref}
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-valuetext={format(value)}
            aria-describedby={hintId}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className={cn(
              'absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none',
              'disabled:cursor-not-allowed',
              // The native parts stay in place for hit testing but draw nothing; the token track below is what shows.
              '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:opacity-0',
              '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0',
            )}
            {...props}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2">
            <div className="relative h-1.5 w-full rounded-pill bg-bg-sunken">
              <div className="absolute inset-y-0 left-0 rounded-pill bg-accent" style={{ width: `${p}%` }} />
              {marks?.map((m) => (
                <span key={m} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-text-subtle" style={{ left: `${pct(m)}%` }} />
              ))}
              <span
                className={cn(
                  'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-text',
                  'transition-transform duration-press ease-out group-active:scale-press',
                  'ring-offset-2 ring-offset-bg group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-ring',
                )}
                style={{ left: `${p}%` }}
              />
            </div>
          </div>
        </div>
        {marks && marks.length > 0 && (
          <div aria-hidden="true" className="relative mx-2 h-4 text-label tabular-nums text-text-subtle">
            {marks.map((m, i) => (
              <span
                key={m}
                className={cn('absolute top-0 whitespace-nowrap', i === 0 ? '' : i === marks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
                style={{ left: `${pct(m)}%` }}
              >
                {format(m)}
              </span>
            ))}
          </div>
        )}
        {hint && (
          <p id={hintId} className="text-label text-text-muted">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
Slider.displayName = 'Slider'
