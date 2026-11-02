import * as React from 'react'
import { cn } from './_cn'

// Bracket label: a short category word beside a row's name, written as [ Blog ] instead of a pill.
// A pill with a border reads as a second button next to the name; brackets read as a note about it.
// The brackets are drawn for the eye only (aria-hidden), so a screen reader hears just the word, and a
// no-break space ties each bracket to the word so a bracket never ends a line on its own.
// Show it on every row, not only on hover: touch and keyboard never see hover text.

const HELD = ' '

export interface BracketLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The row has no category yet ("Unsorted"): one step fainter than a known category. */
  unknown?: boolean
}

export const BracketLabel = React.forwardRef<HTMLSpanElement, BracketLabelProps>(
  ({ unknown = false, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('text-caption whitespace-nowrap', unknown ? 'text-text-subtle' : 'text-text-muted', className)}
      {...props}
    >
      <span aria-hidden="true">[{HELD}</span>
      {children}
      <span aria-hidden="true">{HELD}]</span>
    </span>
  ),
)
BracketLabel.displayName = 'BracketLabel'
