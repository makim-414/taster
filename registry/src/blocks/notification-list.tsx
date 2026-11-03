'use client'

import * as React from 'react'
import { cn } from './_cn'

// NotificationList. The body of a notification center: newest first, unread items in medium weight with a small
// neutral dot and the word "Unread" for screen readers, time on the right, "Mark all as read" in the header.
// Put it in a Popover or a Drawer; on its own it is a plain list. No colored icon per type, no badges on every row.

export interface NotificationItem {
  id: string
  title: string
  body?: string
  /** Display time, for example "5 min ago". */
  time: string
  /** Machine time for the <time> element. */
  datetime?: string
  unread?: boolean
}

export interface NotificationListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items: NotificationItem[]
  onSelect?: (id: string) => void
  onMarkAllRead?: () => void
  heading?: string
  markAllLabel?: string
  emptyLabel?: string
  unreadLabel?: string
}

export function NotificationList({
  items,
  onSelect,
  onMarkAllRead,
  heading = 'Notifications',
  markAllLabel = 'Mark all as read',
  emptyLabel = 'Nothing new. Updates about your work show up here.',
  unreadLabel = 'Unread',
  className,
  ...props
}: NotificationListProps) {
  const unread = items.filter((i) => i.unread).length
  const headingId = React.useId()
  return (
    <div className={cn('flex min-w-0 flex-col', className)} {...props}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border pb-1">
        <div id={headingId} className="text-sm font-medium text-text">
          {heading}
          {unread > 0 && <span className="ml-1.5 tabular-nums text-text-subtle">{unread}</span>}
        </div>
        {onMarkAllRead && unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className={cn(
              'inline-flex h-11 items-center rounded-md px-2 text-label text-text-muted outline-none desk:h-8',
              'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {markAllLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-sm text-text-muted">{emptyLabel}</p>
      ) : (
        <ul aria-labelledby={headingId} className="divide-y divide-border">
          {items.map((n) => {
            const content = (
              <>
                <span aria-hidden="true" className={cn('mt-2 size-1.5 shrink-0 rounded-full', n.unread ? 'bg-text' : 'bg-transparent')} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('text-sm', n.unread ? 'font-medium text-text' : 'text-text-muted')}>
                    {n.unread && <span className="sr-only">{unreadLabel}: </span>}
                    {n.title}
                  </span>
                  {n.body && <span className="text-label text-text-muted">{n.body}</span>}
                </span>
                <time dateTime={n.datetime} className="shrink-0 pt-0.5 text-label tabular-nums text-text-subtle">
                  {n.time}
                </time>
              </>
            )
            const cls = 'flex w-full items-start gap-3 px-1 py-3 text-left'
            return (
              <li key={n.id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(n.id)}
                    className={cn(
                      cls,
                      'min-h-11 rounded-md outline-none transition-colors duration-press hover:bg-bg-elev focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
