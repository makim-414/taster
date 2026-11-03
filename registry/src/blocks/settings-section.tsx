import * as React from 'react'
import { cn } from './_cn'

// SettingsPage and SettingsSection. The settings layout: a page title, then sections that each put a name and one
// or two lines of explanation in a narrow left column and the controls in a wider right column. Sections are
// separated by one hairline and spacing, not by boxes, so a long settings page stays one surface. Below the md
// breakpoint the columns stack. An optional footer row holds the section's own save action.

export interface SettingsPageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Page level actions, top right. */
  actions?: React.ReactNode
}

export function SettingsPage({ title, description, actions, className, children, ...props }: SettingsPageProps) {
  return (
    <div className={cn('w-full min-w-0', className)} {...props}>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="min-w-0">
          <h2 className="text-h2 font-semibold tracking-tight text-text">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-sm text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="border-t border-border">{children}</div>
    </div>
  )
}

export interface SettingsSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
}

export function SettingsSection({ title, description, footer, className, children, ...props }: SettingsSectionProps) {
  const reactId = React.useId()
  const headingId = `settings-${reactId}`
  return (
    <section
      aria-labelledby={headingId}
      className={cn('grid gap-4 border-b border-border py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 id={headingId} className="text-title font-semibold text-text">
          {title}
        </h3>
        {description && <p className="mt-1 max-w-prose text-sm text-text-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {children}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{footer}</div>}
      </div>
    </section>
  )
}
