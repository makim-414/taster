import * as React from 'react'
import { cn } from './_cn'

// EmptyState. What stands in for missing content: nothing yet (first use), no results for a search or filter,
// a failure, or missing permission. One short heading, one sentence on why and what to do, one action and an
// optional second. No illustration, no icon in a colored circle, no exclamation marks. Left aligned by default so
// it reads like the rest of the screen; `centered` for a whole empty page.
// Errors and permission problems say the reason and a way forward (retry, request access), never just "Oops".

export type EmptyStateKind = 'first-use' | 'no-results' | 'error' | 'no-access'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  kind?: EmptyStateKind
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  centered?: boolean
  headingLevel?: 2 | 3 | 4
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ kind = 'first-use', title, description, action, secondaryAction, centered = false, headingLevel = 3, className, ...props }, ref) => {
    const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
    return (
      <div
        ref={ref}
        data-empty-kind={kind}
        role={kind === 'error' ? 'alert' : undefined}
        className={cn('flex flex-col gap-1 py-8', centered ? 'items-center text-center' : 'items-start', className)}
        {...props}
      >
        <H className="text-title font-semibold text-text">{title}</H>
        {description && <p className="max-w-prose text-sm text-text-muted">{description}</p>}
        {(action || secondaryAction) && (
          <div className={cn('mt-3 flex flex-wrap items-center gap-2', centered && 'justify-center')}>
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    )
  },
)
EmptyState.displayName = 'EmptyState'
