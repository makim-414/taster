'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from './_cn'

// Drawer and bottom sheet. Built on @radix-ui/react-dialog, so focus is trapped, Escape and the scrim close it,
// and focus returns to the trigger. A side drawer suits a record's details or an edit form next to a list; a
// bottom sheet suits short choices on phones. Header, scrolling body and a fixed footer for the actions.
// It slides in on the drawer easing and --dur-modal; reduced motion turns the slide into an instant change.

export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close

export interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'right' | 'left' | 'bottom'
  closeLabel?: string
}

const SIDE = {
  right: { panel: 'inset-y-0 right-0 h-full w-full max-w-md border-l', hidden: 'translate-x-full' },
  left: { panel: 'inset-y-0 left-0 h-full w-full max-w-md border-r', hidden: '-translate-x-full' },
  bottom: { panel: 'inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-xl border-t', hidden: 'translate-y-full' },
}

export const DrawerContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DrawerContentProps>(
  ({ side = 'right', closeLabel = 'Close', className, children, ...props }, ref) => {
    const [entered, setEntered] = React.useState(false)
    React.useEffect(() => {
      const raf = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(raf)
    }, [])
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 transition-opacity duration-modal ease-out"
          style={{ background: 'var(--scrim)', opacity: entered ? 1 : 0 }}
        />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 flex flex-col border-border bg-bg-popover text-text shadow-pop outline-none',
            'transition-transform duration-modal ease-drawer motion-reduce:transition-none',
            SIDE[side].panel,
            entered ? 'translate-x-0 translate-y-0' : SIDE[side].hidden,
            className,
          )}
          {...props}
        >
          {side === 'bottom' && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border" />}
          {children}
          <DialogPrimitive.Close
            className={cn(
              'absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-text-subtle outline-none desk:size-9',
              'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  },
)
DrawerContent.displayName = 'DrawerContent'

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 flex-col gap-1 border-b border-border py-4 pl-5 pr-14', className)} {...props} />
}

export function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto p-5', className)} {...props} />
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-3', className)} {...props} />
}

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-title font-semibold text-text', className)} {...props} />
))
DrawerTitle.displayName = 'DrawerTitle'

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
))
DrawerDescription.displayName = 'DrawerDescription'
