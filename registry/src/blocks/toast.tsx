'use client'

import * as React from 'react'
import { cn } from './_cn'

// Toasts. ToastProvider owns a stack in a polite live region at the bottom edge; useToast().toast({...}) adds one.
// A toast says what happened in a few words, can carry one follow-up action, and leaves on its own after
// `duration` ms. The timer pauses while the pointer is over the stack or focus is inside it, so nobody loses a
// message they are reading. Failures use role="alert" and stay until dismissed by default.
// The surface is the popover token with a hairline; tone colors only the small mark. Enter is a short fade and
// lift on the motion tokens, which reduced motion shortens to an instant change.
// ToastCard is the same surface without the provider, for inline previews and tests.

export type ToastTone = 'neutral' | 'success' | 'danger'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
  /** ms before it leaves. Defaults to 5000, or Infinity for danger. */
  duration?: number
}

interface ToastRecord extends ToastOptions {
  id: number
}

interface ToastApi {
  toast: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

function Mark({ tone }: { tone: ToastTone }) {
  if (tone === 'neutral') return null
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('mt-0.5 shrink-0', tone === 'success' ? 'text-success' : 'text-danger')}
    >
      {tone === 'success' ? (
        <path d="M5 13l4 4 10-10" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </>
      )}
    </svg>
  )
}

export interface ToastCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string
  description?: string
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
  onDismiss?: () => void
  dismissLabel?: string
}

export const ToastCard = React.forwardRef<HTMLDivElement, ToastCardProps>(
  ({ title, description, tone = 'neutral', action, onDismiss, dismissLabel = 'Dismiss', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border bg-bg-popover py-3 pl-4 pr-1 text-sm shadow-pop',
        className,
      )}
      {...props}
    >
      <Mark tone={tone} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="font-medium text-text">{title}</div>
        {description && <div className="mt-0.5 text-text-muted">{description}</div>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'inline-flex h-11 shrink-0 items-center rounded-md px-2 text-sm font-medium text-text underline underline-offset-4 outline-none desk:h-8',
            'focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-subtle outline-none desk:size-8',
            'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  ),
)
ToastCard.displayName = 'ToastCard'

function LiveToast({ t, paused, onDismiss }: { t: ToastRecord; paused: boolean; onDismiss: (id: number) => void }) {
  const [shown, setShown] = React.useState(false)
  const remaining = React.useRef(t.duration ?? (t.tone === 'danger' ? Infinity : 5000))
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  React.useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return
    const started = Date.now()
    const timer = window.setTimeout(() => onDismiss(t.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [paused, onDismiss, t.id])
  return (
    <li
      role={t.tone === 'danger' ? 'alert' : 'status'}
      className="transition-[opacity,transform] duration-dropdown ease-out"
      style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(var(--enter-offset))' }}
    >
      <ToastCard
        title={t.title}
        description={t.description}
        tone={t.tone}
        action={
          t.action && {
            label: t.action.label,
            onClick: () => {
              t.action?.onClick()
              onDismiss(t.id)
            },
          }
        }
        onDismiss={() => onDismiss(t.id)}
      />
    </li>
  )
}

export interface ToastProviderProps {
  children: React.ReactNode
  /** Most toasts on screen at once; older ones leave first. */
  max?: number
  label?: string
}

export function ToastProvider({ children, max = 3, label = 'Notifications' }: ToastProviderProps) {
  const [items, setItems] = React.useState<ToastRecord[]>([])
  const [paused, setPaused] = React.useState(false)
  const next = React.useRef(1)

  const dismiss = React.useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const toast = React.useCallback(
    (o: ToastOptions) => {
      const id = next.current++
      setItems((list) => [...list, { ...o, id }].slice(-max))
      return id
    },
    [max],
  )
  const api = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section aria-label={label} className="pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:w-96">
        <ol
          className="flex flex-col gap-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
          }}
        >
          {items.map((t) => (
            <LiveToast key={t.id} t={t} paused={paused} onDismiss={dismiss} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  )
}
