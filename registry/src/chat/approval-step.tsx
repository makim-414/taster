import * as React from 'react'
import { cn } from '../blocks/_cn'

// Approval step: the assistant stops and asks before it acts. One question in a hairline card inside the
// thread, two to five options that each say what will happen ("Send to 240 customers"), the recommended
// one drawn as the solid button only when the assistant recommends it, a "Something else" field, and a
// way out. Focus moves to the card when it appears (unless the person is typing), and once answered the
// card collapses to a plain line that records the choice ("You chose: Send to 240 customers").
// Follows patterns/ask-human-step: role="group" labelled by the question, 44px buttons, no modal, no
// timeout that picks for the person, no green or red pills (AC-04), no ghost outline for the recommended
// answer (AC-16), no confetti.
// Original code, MIT.

export interface ApprovalOption {
  id: string
  /** The action in plain words, with its consequence. */
  label: string
  /** One line under the label, for example what it costs or what it changes. */
  detail?: string
  recommended?: boolean
}

export interface ApprovalStepProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  question: string
  /** Why the assistant is asking, one sentence. */
  context?: string
  options: ApprovalOption[]
  /** Show a free text answer. Default true. */
  allowOther?: boolean
  otherLabel?: string
  onAnswer: (answer: { optionId: string | null; text?: string }) => void
  /** Ends the run without choosing. */
  onCancel?: () => void
  cancelLabel?: string
  /** Shown while waiting, above the card. */
  waitingLabel?: string
  autoFocus?: boolean
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const BTN =
  'inline-flex min-h-11 w-full flex-col items-start justify-center rounded-md px-4 py-2.5 text-left outline-none transition-[opacity,colors,transform] duration-press ease-out ' +
  'active:scale-press focus-visible:ring-2 focus-visible:ring-ring sm:w-auto'

export function ApprovalStep({
  question,
  context,
  options,
  allowOther = true,
  otherLabel = 'Something else',
  onAnswer,
  onCancel,
  cancelLabel = 'Cancel the run',
  waitingLabel = 'Waiting for your answer',
  autoFocus = true,
  className,
  ...props
}: ApprovalStepProps) {
  const qid = React.useId()
  const card = React.useRef<HTMLDivElement>(null)
  const [other, setOther] = React.useState('')
  const [done, setDone] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!autoFocus) return
    const a = document.activeElement
    const typing = a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || (a as HTMLElement).isContentEditable)
    if (!typing) card.current?.focus({ preventScroll: true })
  }, [autoFocus])

  function choose(o: ApprovalOption) {
    setDone(o.label)
    onAnswer({ optionId: o.id })
  }

  if (done) {
    return (
      <p className={cn('text-body text-text-muted', KEEP, className)} role="status">
        You chose: <span className="text-text">{done}</span>
      </p>
    )
  }

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <p className="mb-2 text-label text-text-subtle">{waitingLabel}</p>
      <div ref={card} tabIndex={-1} role="group" aria-labelledby={qid} className="rounded-xl border border-border p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <p id={qid} className={cn('text-title font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>
          {question}
        </p>
        {context ? <p className={cn('mt-1 text-body text-text-muted', KEEP)}>{context}</p> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o)}
              className={cn(BTN, o.recommended ? 'bg-accent text-accent-fg hover:opacity-90' : 'border border-border text-text hover:border-text-subtle')}
            >
              <span className={cn('text-body font-medium', KEEP)}>{o.label}</span>
              {o.detail ? <span className={cn('text-label', o.recommended ? 'opacity-80' : 'text-text-muted', KEEP)}>{o.detail}</span> : null}
            </button>
          ))}
        </div>
        {allowOther ? (
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              const t = other.trim()
              if (!t) return
              setDone(t)
              onAnswer({ optionId: null, text: t })
            }}
          >
            <label htmlFor={`${qid}-other`} className="sr-only">
              {otherLabel}
            </label>
            <input
              id={`${qid}-other`}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder={otherLabel}
              className="h-11 w-full min-w-0 rounded-md sm:w-auto sm:flex-1 border border-border-input bg-transparent px-3 text-body text-text outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!other.trim()}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-border px-4 text-body font-medium text-text outline-none hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Send
            </button>
          </form>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 inline-flex h-11 items-center rounded-sm text-label text-text-muted underline underline-offset-4 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:h-8"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
