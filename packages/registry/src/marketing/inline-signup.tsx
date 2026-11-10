import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Inline signup: a band whose one job is to collect one address for one stated thing, such as early
// access, a waitlist or a release note you actually send. One field, one button, one line that says what
// will arrive and how often. The band is honest about its wiring: without `onSubmit` or `action` the
// button is disabled and the line says "Not connected yet"; after a send it says what happens next.
// Follows patterns/neutral-cta-band and patterns/in-hero-form-flow. Do not put it above the footer of
// every page (CMP-10): use it where a reader has just shown interest, once.
// Original code, MIT.

export interface InlineSignupProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'onSubmit'> {
  title: string
  /** What the reader gets and how often, for example "One email per release, about once a month." */
  body?: string
  label: string
  placeholder?: string
  submitLabel: string
  onSubmit?: (email: string) => Promise<void> | void
  action?: string
  doneMessage?: (email: string) => React.ReactNode
  errorMessage?: string
  /** Fine print under the field: what you store and how to leave. */
  note?: string
  as?: 'h2' | 'h3'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function InlineSignup({
  title,
  body,
  label,
  placeholder,
  submitLabel,
  onSubmit,
  action: rawAction,
  doneMessage = (e) => `Sent a confirmation to ${e}. Open it to finish.`,
  errorMessage = 'That address did not go through. Check it and try again.',
  note,
  as: Heading = 'h2',
  className,
  ...props
}: InlineSignupProps) {
  const titleId = React.useId()
  const inputId = React.useId()
  const noteId = React.useId()
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const doneRef = React.useRef<HTMLParagraphElement>(null)
  // A refused URL (blocks/_url.ts) counts as no action, so the form stays unwired instead of posting to this page.
  const action = safeHref(rawAction)
  const wired = !!onSubmit || !!action

  React.useEffect(() => {
    if (status === 'done') doneRef.current?.focus()
  }, [status])

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    if (!onSubmit) return
    e.preventDefault()
    if (!e.currentTarget.reportValidity()) return
    setStatus('sending')
    try {
      await onSubmit(email)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section aria-labelledby={titleId} className={cn('grid gap-6 border-y border-border py-10 lg:grid-cols-2 lg:items-start lg:gap-12', className)} {...props}>
      <div>
        <Heading id={titleId} className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text text-balance', KEEP)}>
          {title}
        </Heading>
        {body ? <p className={cn('mt-2 max-w-[48ch] text-body text-text-muted', KEEP)}>{body}</p> : null}
      </div>
      {status === 'done' ? (
        <p ref={doneRef} tabIndex={-1} role="status" className={cn('self-center text-body text-text outline-none', KEEP)}>
          {doneMessage(email)}
        </p>
      ) : (
        <form action={action} method={action ? 'post' : undefined} onSubmit={handle}>
          <label htmlFor={inputId} className="mb-2 block text-label font-medium text-text-muted">
            {label}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={inputId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={placeholder}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status === 'error') setStatus('idle')
              }}
              aria-describedby={noteId}
              aria-invalid={status === 'error' ? true : undefined}
              className="h-11 w-full min-w-0 rounded-md sm:w-auto sm:flex-1 border border-border-input bg-transparent px-3 text-body text-text outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger"
            />
            <button
              type="submit"
              disabled={!wired || status === 'sending'}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-accent px-5 text-body font-medium text-accent-fg outline-none transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending' : submitLabel}
            </button>
          </div>
          <p id={noteId} aria-live="polite" className={cn('mt-2 text-label text-text-subtle', KEEP)}>
            {status === 'error' ? <span className="text-text">{errorMessage}</span> : !wired ? 'Not connected yet.' : note}
          </p>
        </form>
      )}
    </section>
  )
}
