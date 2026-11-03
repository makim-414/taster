'use client'

import * as React from 'react'
import { cn } from './_cn'
import { Stepper } from './stepper'
import { Button } from './button'

// Wizard. A short multi-step flow: the Stepper on top, one step's content at a time, Back and Next at the bottom.
// Each step can validate before moving on and show why it cannot; finished steps can be revisited from the
// stepper. When the step changes, focus moves to the new step's heading so screen readers announce it.
// Keep it to three to five steps; anything longer wants a checklist page instead.

export interface WizardStep {
  id: string
  title: string
  description?: string
  content: React.ReactNode
  /** Return a message to stay on this step, or null to continue. */
  validate?: () => string | null
}

export interface WizardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  steps: WizardStep[]
  onFinish: () => void
  backLabel?: string
  nextLabel?: string
  finishLabel?: string
  stepOfLabel?: (n: number, total: number) => string
}

export function Wizard({
  steps,
  onFinish,
  backLabel = 'Back',
  nextLabel = 'Continue',
  finishLabel = 'Finish',
  stepOfLabel = (n, t) => `Step ${n} of ${t}`,
  className,
  ...props
}: WizardProps) {
  const [index, setIndex] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const headRef = React.useRef<HTMLHeadingElement>(null)
  const moved = React.useRef(false)
  const step = steps[index]
  const last = index === steps.length - 1

  React.useEffect(() => {
    if (moved.current) headRef.current?.focus()
  }, [index])

  const go = (to: number) => {
    moved.current = true
    setError(null)
    setIndex(to)
  }
  const next = () => {
    const problem = step.validate?.() ?? null
    if (problem) {
      setError(problem)
      return
    }
    if (last) onFinish()
    else go(index + 1)
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-6', className)} {...props}>
      <Stepper steps={steps.map((s) => ({ id: s.id, label: s.title }))} current={index} onStepClick={(i) => go(i)} />
      <section aria-labelledby={`${step.id}-heading`} className="flex min-w-0 flex-col gap-4">
        <div>
          <div className="text-label text-text-subtle">{stepOfLabel(index + 1, steps.length)}</div>
          <h3 id={`${step.id}-heading`} ref={headRef} tabIndex={-1} className="mt-1 text-title font-semibold text-text outline-none">
            {step.title}
          </h3>
          {step.description && <p className="mt-1 text-sm text-text-muted">{step.description}</p>}
        </div>
        <div className="min-w-0">{step.content}</div>
        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}
      </section>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>
          {backLabel}
        </Button>
        <Button onClick={next}>{last ? finishLabel : nextLabel}</Button>
      </div>
    </div>
  )
}
