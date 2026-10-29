'use client'

import * as React from 'react'
import { cn } from './_cn'

// MasterDetail. A list pane next to a detail pane. From the md breakpoint both panes show side by side; below it
// only one pane shows at a time, and the detail pane gets a Back button that returns to the list. When the detail
// opens on a narrow screen, focus moves to its heading so keyboard and screen reader users land on the new content.
// The panes are separated by one hairline, not two cards.

export interface MasterDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  list: React.ReactNode
  /** The open item. Null shows `emptyDetail` on wide screens and the list on narrow ones. */
  detail: React.ReactNode | null
  /** Heading text of the open item, used for the focus target and the detail region name. */
  detailTitle?: string
  onBack: () => void
  listLabel: string
  emptyDetail?: React.ReactNode
  backLabel?: string
}

export function MasterDetail({
  list,
  detail,
  detailTitle,
  onBack,
  listLabel,
  emptyDetail,
  backLabel = 'Back',
  className,
  ...props
}: MasterDetailProps) {
  const listRef = React.useRef<HTMLElement>(null)
  const headRef = React.useRef<HTMLHeadingElement>(null)
  const open = detail != null

  React.useEffect(() => {
    // Only move focus when the list pane is hidden, that is on a narrow screen.
    if (open && listRef.current && listRef.current.offsetParent === null) headRef.current?.focus()
  }, [open, detailTitle])

  return (
    <div className={cn('grid min-h-0 w-full md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]', className)} {...props}>
      <section
        ref={listRef}
        aria-label={listLabel}
        className={cn('min-h-0 min-w-0 overflow-y-auto md:border-r md:border-border', open ? 'hidden md:block' : 'block')}
      >
        {list}
      </section>
      <section
        aria-label={detailTitle ?? undefined}
        className={cn('min-h-0 min-w-0 overflow-y-auto', open ? 'block' : 'hidden md:block')}
      >
        {open ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-2 md:hidden">
              <button
                type="button"
                onClick={onBack}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted outline-none',
                  'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                {backLabel}
              </button>
            </div>
            {detailTitle && (
              <h3 ref={headRef} tabIndex={-1} className="px-5 pt-5 text-title font-semibold text-text outline-none">
                {detailTitle}
              </h3>
            )}
            <div className="min-w-0 p-5">{detail}</div>
          </div>
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center p-6 text-sm text-text-muted">{emptyDetail}</div>
        )}
      </section>
    </div>
  )
}
