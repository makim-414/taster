import * as React from 'react'
import { cn } from './_cn'

// Spinner. A small outlined ring for work with no known length, always with words: the label is visible by
// default ("Loading reports") and is the status text for screen readers either way. Neutral ink on a hairline
// track, no colored arc, no glow. With reduced motion the ring stops turning and the words carry the state.
// For work with a known length use Progress (blocks/progress).

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  size?: 'sm' | 'md'
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ label = 'Loading', hideLabel = false, size = 'sm', className, ...props }, ref) => {
    const px = size === 'sm' ? 16 : 20
    return (
      <div ref={ref} role="status" className={cn('inline-flex items-center gap-2 text-sm text-text-muted', className)} {...props}>
        <svg
          width={px}
          height={px}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 animate-spin motion-reduce:animate-none"
        >
          <circle cx="12" cy="12" r="9" stroke="var(--border)" strokeWidth={2.5} />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
        <span className={cn(hideLabel && 'sr-only')}>{label}</span>
      </div>
    )
  },
)
Spinner.displayName = 'Spinner'
