import * as React from 'react'
import { cn } from './_cn'

// ActivityFeed. Who did what and when, newest first, grouped under day headings (Today, Yesterday, a date).
// One thin neutral spine with a small marker per event, the actor in medium weight, the time in a real <time>
// element. Optional detail (a quote of a comment, a changed value) sits under the line, indented, not boxed.

export interface ActivityEvent {
  id: string
  actor: string
  /** The rest of the sentence after the actor, for example "moved the task to Review". */
  action: React.ReactNode
  /** Display time, for example "14:20" or "2 h ago". */
  time: string
  /** Machine readable time for <time dateTime>. */
  datetime?: string
  /** Day heading this event sits under, for example "Today". */
  day?: string
  detail?: React.ReactNode
}

export interface ActivityFeedProps extends React.HTMLAttributes<HTMLElement> {
  events: ActivityEvent[]
  label?: string
}

export function ActivityFeed({ events, label = 'Activity', className, ...props }: ActivityFeedProps) {
  const groups: { day: string | undefined; items: ActivityEvent[] }[] = []
  for (const e of events) {
    const last = groups[groups.length - 1]
    if (last && last.day === e.day) last.items.push(e)
    else groups.push({ day: e.day, items: [e] })
  }
  return (
    <section aria-label={label} className={cn('flex min-w-0 flex-col gap-5', className)} {...props}>
      {groups.map((g, gi) => (
        <section key={gi} aria-label={g.day}>
          {g.day && <h4 className="mb-2 text-label font-medium text-text-subtle">{g.day}</h4>}
          <ol className="relative ml-1 border-l border-border">
            {g.items.map((e) => (
              <li key={e.id} className="relative py-2 pl-5">
                <span aria-hidden="true" className="absolute -left-1 top-3.5 size-2 rounded-full border border-bg bg-text-subtle" />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm text-text-muted">
                    <span className="font-medium text-text">{e.actor}</span> {e.action}
                  </p>
                  <time dateTime={e.datetime} className="shrink-0 text-label tabular-nums text-text-subtle">
                    {e.time}
                  </time>
                </div>
                {e.detail && <div className="mt-1 text-sm text-text-muted">{e.detail}</div>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </section>
  )
}
