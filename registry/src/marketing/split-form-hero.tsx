import * as React from 'react'
import { cn } from '../blocks/_cn'

// Split form hero: the headline on one side and a single field with its button on the same side, a
// visual on the other. The field is the first action, so the hero asks for one value, not a form.
// Follows patterns/in-hero-form-flow: a real <form>, one field and one button, a helper line that says
// what happens next, aria-live on the part that changes, a fixed minimum height so the page below does
// not jump, and no fake success. Without `onSubmit` or `action` the button stays disabled and says so.
// Original code, MIT.

export type SplitFormStatus = 'idle' | 'sending' | 'done' | 'error'

export interface SplitFormHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'onSubmit'> {
  eyebrow?: string
  title: string
  lead: string
  field: {
    label: string
    name?: string
    type?: 'email' | 'url' | 'text' | 'tel'
    placeholder?: string
    autoComplete?: string
  }
  submitLabel: string
  /** What happens after submit and how long it takes. */
  helper?: string
  /** Called with the value. Resolve to show `doneMessage`, throw to show the error line. */
  onSubmit?: (value: string) => Promise<void> | void
  /** Native form action, used when there is no onSubmit. */
  action?: string
  /** Shown after a successful submit. Say the next step, not "Thanks!". */
  doneMessage?: (value: string) => React.ReactNode
  errorMessage?: string
  /** The visual on the other side: a screenshot, a sample result or a photo. */
  aside: React.ReactNode
  /** Put the visual on the left instead. */
  reverse?: boolean
  as?: 'h1' | 'h2'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const FIELD =
  'h-11 w-full min-w-0 rounded-md sm:w-auto sm:flex-1 border border-border-input bg-transparent px-3 text-body text-text outline-none ' +
  'placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger'
const SUBMIT =
  'inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-accent px-5 text-body font-medium text-accent-fg outline-none ' +
  'transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:pointer-events-none disabled:opacity-50'

export function SplitFormHero({
  eyebrow,
  title,
  lead,
  field,
  submitLabel,
  helper,
  onSubmit,
  action,
  doneMessage = () => 'Done. Check your inbox for the next step.',
  errorMessage = 'That did not go through. Check the value and try again.',
  aside,
  reverse = false,
  as: Heading = 'h1',
  className,
  ...props
}: SplitFormHeroProps) {
  const titleId = React.useId()
  const inputId = React.useId()
  const helpId = React.useId()
  const [value, setValue] = React.useState('')
  const [status, setStatus] = React.useState<SplitFormStatus>('idle')
  const statusRef = React.useRef<HTMLParagraphElement>(null)
  const wired = !!onSubmit || !!action

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    if (!onSubmit) return // native submit to `action`
    e.preventDefault()
    if (!e.currentTarget.reportValidity()) return
    setStatus('sending')
    try {
      await onSubmit(value)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  React.useEffect(() => {
    if (status === 'done' || status === 'error') statusRef.current?.focus()
  }, [status])

  return (
    <section aria-labelledby={titleId} className={cn('overflow-hidden', className)} {...props}>
      <div className="grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-16">
        <div className={cn('max-w-[520px]', reverse && 'lg:order-2')}>
          {eyebrow ? <p className={cn('mb-3 text-label font-medium text-text-muted', KEEP)}>{eyebrow}</p> : null}
          <Heading id={titleId} className={cn('text-h1 font-semibold leading-[var(--lh-tight)] tracking-[-0.01em] text-text text-balance', KEEP)}>
            {title}
          </Heading>
          <p className={cn('mt-4 text-title font-reg leading-[var(--lh-normal)] text-text-muted text-pretty', KEEP)}>{lead}</p>
          <div className="mt-8 min-h-[116px]">
            {status === 'done' ? (
              <p ref={statusRef} tabIndex={-1} role="status" className={cn('text-body text-text outline-none', KEEP)}>
                {doneMessage(value)}
              </p>
            ) : (
              <form action={action} method={action ? 'post' : undefined} onSubmit={handle} noValidate={false}>
                <label htmlFor={inputId} className="mb-2 block text-label font-medium text-text-muted">
                  {field.label}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id={inputId}
                    name={field.name ?? 'value'}
                    type={field.type ?? 'email'}
                    required
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete ?? (field.type === 'email' || !field.type ? 'email' : undefined)}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value)
                      if (status === 'error') setStatus('idle')
                    }}
                    aria-describedby={helpId}
                    aria-invalid={status === 'error' ? true : undefined}
                    className={FIELD}
                  />
                  <button type="submit" disabled={!wired || status === 'sending'} className={SUBMIT}>
                    {status === 'sending' ? 'Sending' : submitLabel}
                  </button>
                </div>
                <p id={helpId} ref={status === 'error' ? statusRef : undefined} tabIndex={-1} aria-live="polite" className={cn('mt-2 text-label text-text-subtle outline-none', KEEP)}>
                  {status === 'error' ? <span className="text-text">{errorMessage}</span> : !wired ? 'Not connected yet.' : helper}
                </p>
              </form>
            )}
          </div>
        </div>
        <div className={cn('min-w-0', reverse && 'lg:order-1')}>{aside}</div>
      </div>
    </section>
  )
}
