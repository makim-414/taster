import * as React from 'react'
import { cn } from '../blocks/_cn'

// FAQ groups: a longer question list split into named groups (Billing, Data, Account), with a filter field
// that narrows the list as you type and a count of what matched. For help pages and pricing pages where a
// single list of six questions has grown to thirty.
// Follows patterns/hairline-accordion-faq: native <details> rows separated by hairlines, a line chevron,
// the question as the button text, no icon per question, no card per question. Answers stay in the DOM,
// so in-page search and screen readers find them while closed; the filter matches answers too.
// Original code, MIT.

export interface FaqGroup {
  title: string
  items: {
    q: string
    a: React.ReactNode
    /** Plain text of the answer, for the filter when `a` is not a string. */
    text?: string
    /** Language of this question and answer when it differs from the page. */
    lang?: string
  }[]
}

export interface FaqGroupsProps extends React.HTMLAttributes<HTMLDivElement> {
  groups: FaqGroup[]
  filterLabel?: string
  filterPlaceholder?: string
  /** Shown when nothing matches. Say where to ask instead. */
  empty?: React.ReactNode
  as?: 'h2' | 'h3'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function norm(s: string) {
  return s.toLowerCase().normalize('NFKC')
}

export function FaqGroups({
  groups,
  filterLabel = 'Filter questions',
  filterPlaceholder = 'Type a word, for example refund',
  empty = 'No question matches. Try a shorter word.',
  as: Heading = 'h3',
  className,
  ...props
}: FaqGroupsProps) {
  const [query, setQuery] = React.useState('')
  const id = React.useId()
  const q = norm(query.trim())
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !q || norm(it.q).includes(q) || norm(it.text ?? (typeof it.a === 'string' ? it.a : '')).includes(q)),
    }))
    .filter((g) => g.items.length)
  const count = shown.reduce((n, g) => n + g.items.length, 0)
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-sm">
          <label htmlFor={id} className="mb-2 block text-label font-medium text-text-muted">
            {filterLabel}
          </label>
          <input
            id={id}
            type="search"
            value={query}
            placeholder={filterPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={`${id}-count`}
            className="h-11 w-full rounded-md border border-border-input bg-transparent px-3 text-body text-text outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring desk:h-9"
          />
        </div>
        <p id={`${id}-count`} aria-live="polite" className="text-label tabular-nums text-text-subtle">
          {q ? `${count} of ${total} questions` : `${total} questions`}
        </p>
      </div>

      {shown.length ? (
        <div className="mt-8 grid gap-10">
          {shown.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <Heading className={cn('text-label font-medium text-text-subtle', KEEP)}>{g.title}</Heading>
              <div className="mt-2 border-t border-border">
                {g.items.map((it) => (
                  <details key={it.q} lang={it.lang} className="group border-b border-border [&:not([open])>:not(summary)]:hidden" open={!!q && count <= 3}>
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-body font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span className={KEEP}>{it.q}</span>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-text-subtle transition-transform duration-dropdown ease-out group-open:rotate-180">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <div className={cn('max-w-[68ch] pb-5 text-body leading-[var(--lh-normal)] text-text-muted', KEEP)}>{it.a}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className={cn('mt-8 text-body text-text-muted', KEEP)}>{empty}</p>
      )}
    </div>
  )
}
