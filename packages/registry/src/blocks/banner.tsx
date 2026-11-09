'use client'

import * as React from 'react'
import { cn } from './_cn'

// Banner. A page level message that stays until the condition is gone or the person dismisses it: a trial ending,
// a billing problem, scheduled maintenance. It runs edge to edge under the top bar with hairlines above and below
// on the raised surface, never a tinted yellow or blue band. Tone colors only the small mark. Danger banners are
// announced (role="alert"); the others are a status region.
// For a message inside the content use Alert (blocks/alert); for a short note after an action use a toast.

export type BannerTone = 'info' | 'warning' | 'danger'

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: BannerTone
  title?: React.ReactNode
  /** One follow-up, for example a "Update billing" button or link. */
  action?: React.ReactNode
  onDismiss?: () => void
  dismissLabel?: string
}

const MARK: Record<BannerTone, { cls: string; path: React.ReactNode }> = {
  info: {
    cls: 'text-text-muted',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5h.01" />
      </>
    ),
  },
  warning: {
    cls: 'text-warning',
    path: (
      <>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  },
  danger: {
    cls: 'text-danger',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </>
    ),
  },
}

export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ tone = 'info', title, action, onDismiss, dismissLabel = 'Dismiss', className, children, ...props }, ref) => (
    <div
      ref={ref}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex w-full items-start gap-3 border-y border-border bg-bg-elev py-2 pl-4 pr-1 sm:items-center', className)}
      {...props}
    >
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
        className={cn('mt-3 shrink-0 sm:mt-0', MARK[tone].cls)}
      >
        {MARK[tone].path}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-x-4 gap-y-1 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          {title != null && <span className="font-medium text-text">{title} </span>}
          {children != null && <span className="text-text-muted">{children}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-subtle outline-none desk:size-9',
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
Banner.displayName = 'Banner'
