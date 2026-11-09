import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Audience split: a question, then two or three doors, one per audience, each a whole link with a title
// that names the reader ("I run a store"), one sentence on what they get, and the place it leads.
// Follows patterns/audience-entry-split: equal height, hairline frame, a border change on hover and a
// visible focus ring, no icon, no lift, no glow. Order the doors by traffic, largest first.
// Original code, MIT.

export interface AudienceDoor {
  title: string
  body: string
  href: string
  /** Text at the bottom of the door, for example "See the seller guide". */
  linkLabel: string
}

export interface AudienceSplitProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: string
  doors: AudienceDoor[]
  /** A line under the doors for people who fit none, for example a contact link. */
  footer?: React.ReactNode
  as?: 'h2' | 'h3'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function AudienceSplit({ title, doors, footer, as: Heading = 'h2', className, ...props }: AudienceSplitProps) {
  const titleId = React.useId()
  const Door = Heading === 'h2' ? 'h3' : 'h4'
  return (
    <section aria-labelledby={titleId} className={cn('min-w-0', className)} {...props}>
      <Heading id={titleId} className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text', KEEP)}>
        {title}
      </Heading>
      <ul className={cn('m-0 mt-8 grid list-none gap-4 p-0', doors.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        {doors.map((d) => (
          <li key={d.href} className="min-w-0">
            <a
              href={safeHref(d.href)}
              className="group flex h-full flex-col rounded-xl border border-border p-6 outline-none transition-colors duration-press ease-out hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring lg:p-8"
            >
              <Door className={cn('text-title font-semibold text-text', KEEP)}>{d.title}</Door>
              <p className={cn('mt-2 flex-1 text-body text-text-muted', KEEP)}>{d.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-body font-medium text-text">
                {d.linkLabel}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-press ease-out group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {footer ? <p className={cn('mt-6 text-body text-text-muted', KEEP)}>{footer}</p> : null}
    </section>
  )
}
