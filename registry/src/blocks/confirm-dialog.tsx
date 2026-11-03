'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from './_cn'

// ConfirmDialog. Asks before something that cannot be undone. The body says exactly what disappears and what
// stays; for irreversible actions `confirmText` asks the person to type a name before the button wakes up.
// Focus starts on Cancel, the dialog is an alertdialog, and while onConfirm's promise runs the button says so and
// the dialog cannot be dismissed. The destructive button is outlined in the danger token, not a red slab.

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** What goes, what stays, and whether it can be undone. */
  description: React.ReactNode
  confirmLabel?: string
  pendingLabel?: string
  cancelLabel?: string
  /** If set, the person must type this exactly to enable the confirm button. */
  confirmText?: string
  confirmPrompt?: (text: string) => React.ReactNode
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting...',
  cancelLabel = 'Cancel',
  confirmText,
  confirmPrompt = (t) => (
    <>
      Type <span className="font-medium text-text">{t}</span> to confirm.
    </>
  ),
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const inputId = React.useId()
  const ready = !confirmText || typed === confirmText

  React.useEffect(() => {
    if (!open) {
      setTyped('')
      setError(null)
      setPending(false)
    }
  }, [open])

  const run = async () => {
    if (!ready || pending) return
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Nothing was deleted.')
    } finally {
      setPending(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50" style={{ background: 'var(--scrim)' }} />
        <DialogPrimitive.Content
          role="alertdialog"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            cancelRef.current?.focus()
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4',
            'rounded-lg border border-border bg-bg-popover p-6 text-text shadow-pop outline-none',
          )}
        >
          <div className="flex flex-col gap-2">
            <DialogPrimitive.Title className="text-title font-semibold text-text">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <div className="text-sm text-text-muted">{description}</div>
            </DialogPrimitive.Description>
          </div>
          {confirmText && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={inputId} className="text-sm text-text-muted">
                {confirmPrompt(confirmText)}
              </label>
              <input
                id={inputId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') run()
                }}
                className={cn(
                  'h-11 w-full rounded-md border border-border-input bg-transparent px-3 text-sm text-text desk:h-9',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              />
            </div>
          )}
          {error && <p className="text-sm text-text">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                className={cn(
                  'inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-text outline-none desk:h-9',
                  'transition-colors duration-press hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                )}
              >
                {cancelLabel}
              </button>
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={run}
              disabled={!ready || pending}
              aria-busy={pending || undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-md border border-danger px-4 text-sm font-medium text-danger outline-none desk:h-9',
                'transition-[colors,transform] duration-press ease-out active:scale-press',
                'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
