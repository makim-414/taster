'use client'

import * as React from 'react'
import { cn } from './_cn'

// Stepper. Where someone is in a fixed sequence: done steps, the current step (aria-current="step") and the steps
// still ahead. Done steps show an outlined check, the current one a filled number in the accent token, upcoming
// ones a hairline ring with the number; connectors fill in ink as steps complete. Plain numbers, no "01".
// Horizontal for three to five short steps, vertical for longer flows or steps with descriptions.
// Pass onStepClick to let people go back to a finished step; upcoming steps are never clickable.

export interface StepperStep {
  id: string
  label: string
  description?: string
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[]
  /** Index of the current step. steps.length means every step is done. */
  current: number
  orientation?: 'horizontal' | 'vertical'
  onStepClick?: (index: number) => void
  label?: string
  stateLabels?: { done: string; current: string; upcoming: string }
}

function Marker({ index, state }: { index: number; state: 'done' | 'current' | 'upcoming' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border text-label font-medium tabular-nums transition-colors duration-press',
        state === 'done' && 'border-text text-text',
        state === 'current' && 'border-transparent bg-accent text-accent-fg',
        state === 'upcoming' && 'border-border text-text-subtle',
      )}
    >
      {state === 'done' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4 10-10" />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  )
}

export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  onStepClick,
  label = 'Progress',
  stateLabels = { done: 'completed', current: 'current step', upcoming: 'not started' },
  className,
  ...props
}: StepperProps) {
  const vertical = orientation === 'vertical'
  return (
    <ol aria-label={label} className={cn(vertical ? 'flex flex-col' : 'flex w-full items-start', className)} {...props}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming'
        const last = i === steps.length - 1
        const clickable = Boolean(onStepClick) && state === 'done'
        const text = (
          <span className={cn('flex min-w-0 flex-col gap-0.5', vertical ? 'pt-0.5' : 'items-center text-center')}>
            <span className={cn('text-sm', state === 'upcoming' ? 'text-text-muted' : 'font-medium text-text')}>{s.label}</span>
            {s.description && (vertical || state === 'current') && (
              <span className={cn('text-label text-text-muted', !vertical && 'hidden sm:block')}>{s.description}</span>
            )}
            <span className="sr-only">, {stateLabels[state]}</span>
          </span>
        )
        const line = (on: boolean, hide: boolean) => (
          <span aria-hidden="true" className={cn('h-px flex-1', hide ? 'invisible' : on ? 'bg-text' : 'bg-border')} />
        )
        const inner = vertical ? (
          <span className="flex items-start gap-3">
            <Marker index={i} state={state} />
            {text}
          </span>
        ) : (
          <span className="flex w-full flex-col items-center gap-2">
            <span className="flex w-full items-center gap-1.5">
              {line(i <= current, i === 0)}
              <Marker index={i} state={state} />
              {line(i < current, last)}
            </span>
            {text}
          </span>
        )
        return (
          <li
            key={s.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn('relative', vertical ? cn('flex flex-col', !last && 'pb-6') : 'flex min-w-0 flex-1 flex-col')}
          >
            {vertical && !last && (
              <span aria-hidden="true" className={cn('absolute bottom-1 left-3 top-7 w-px', state === 'done' ? 'bg-text' : 'bg-border')} />
            )}
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick?.(i)}
                className="flex min-h-11 w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ol>
  )
}
