import * as React from 'react'
import { cn } from './_cn'

// Alert. A neutral callout surface with a hairline border.
// Tone only colors the small icon and title slot, never the background. No tinted full-width banners.

export type AlertTone = 'info' | 'warning' | 'danger'

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone
  title?: React.ReactNode
}

const TONE_ICON: Record<AlertTone, string> = {
  info: 'text-text',
  warning: 'text-warning',
  danger: 'text-danger',
}

const ICON_PATH: Record<AlertTone, React.ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
  warning: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  danger: (
    <>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2Z" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ tone = 'info', title, className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex gap-3 rounded-md border border-border bg-bg-elev p-4',
        className,
      )}
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
        className={cn('mt-0.5 flex-none', TONE_ICON[tone])}
      >
        {ICON_PATH[tone]}
      </svg>
      <div className="min-w-0">
        {title != null && (
          <div className="font-medium text-text">{title}</div>
        )}
        {children != null && (
          <div className={cn('text-sm text-text-muted', title != null && 'mt-1')}>
            {children}
          </div>
        )}
      </div>
    </div>
  ),
)
Alert.displayName = 'Alert'
