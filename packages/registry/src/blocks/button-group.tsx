import * as React from 'react'
import { cn } from './_cn'

// ButtonGroup. Related actions that share one border, such as Previous, Today, Next on a calendar or Export and
// Copy link on a report. One container with a hairline, items split by hairlines, no gaps or separate shadows.
// Each item is a plain action; for a choice that stays selected use Tabs or a radio group instead.

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names the group for assistive tech. */
  label: string
}

export function ButtonGroup({ label, className, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-stretch divide-x divide-border overflow-hidden rounded-md border border-border', className)}
      {...props}
    />
  )
}

export interface ButtonGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon-only items must pass aria-label; they get a square 44px target on touch screens. */
  iconOnly?: boolean
}

export const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  ({ iconOnly, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-1.5 bg-transparent text-sm font-medium text-text outline-none desk:h-9',
        'transition-colors duration-press ease-out hover:bg-bg-elev active:bg-bg-sunken',
        'focus-visible:relative focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        iconOnly ? 'w-11 desk:w-9' : 'px-3',
        className,
      )}
      {...props}
    />
  ),
)
ButtonGroupItem.displayName = 'ButtonGroupItem'
