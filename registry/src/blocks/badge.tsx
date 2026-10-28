import * as React from 'react'
import { cn } from './_cn'

// Badge / Status chip. Thin neutral border, pill shape, text always neutral.
// Meaning color appears only on the small leading dot, and only for real outcomes: `up` and `down` use the
// page's --delta-up and --delta-down (set by a brand theme), which the AC-08 rule accepts. `warn` and `info` are
// states, not outcomes, so their dot stays neutral and the word carries the meaning. No filled tint backgrounds.

export type BadgeVariant = 'neutral' | 'up' | 'down' | 'warn' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  withDot?: boolean
}

const DOT: Record<BadgeVariant, string> = {
  neutral: 'bg-text-subtle',
  up: 'bg-delta-up',
  down: 'bg-delta-down',
  warn: 'bg-text-subtle',
  info: 'bg-text-subtle',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', withDot = true, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2 rounded-full',
        'border border-border bg-transparent',
        'text-xs font-medium text-text-muted whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {withDot && (
        <span className={cn('shrink-0 size-1.5 rounded-full', DOT[variant])} aria-hidden="true" />
      )}
      <span className="text-text">{children}</span>
    </span>
  ),
)
Badge.displayName = 'Badge'
