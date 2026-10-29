import * as React from 'react'
import { cn } from '../blocks/_cn'

// Footnotes: numbered references in the text and the matching notes at the end, linked both ways. A
// reference is a real link to its note with the number as text and a label for screen readers; each note
// ends with a link back to where it was cited. Numbers come from the order of `notes`, so moving a note
// renumbers every reference without editing the text.
// Follows patterns/long-form-prose: notes in the same face one step smaller, muted, under a hairline.
// Use FootnoteRef inside Prose or any paragraph, and Footnotes once after the body.
// Original code, MIT.

export interface FootnoteItem {
  id: string
  content: React.ReactNode
}

const Ctx = React.createContext<{ order: string[]; prefix: string }>({ order: [], prefix: 'fn' })

export interface FootnotesProviderProps {
  notes: FootnoteItem[]
  /** Prefix for element ids, unique per article. Default "fn". */
  prefix?: string
  children: React.ReactNode
}

/** Wrap the article so references and the list share the numbering. */
export function FootnotesProvider({ notes, prefix = 'fn', children }: FootnotesProviderProps) {
  const value = React.useMemo(() => ({ order: notes.map((n) => n.id), prefix }), [notes, prefix])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export interface FootnoteRefProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  id: string
  /** Read before the number, for example "Note". */
  label?: string
}

export function FootnoteRef({ id, label = 'Note', className, ...props }: FootnoteRefProps) {
  const { order, prefix } = React.useContext(Ctx)
  const n = order.indexOf(id) + 1
  if (n < 1) return null
  // The link sits inline in its sentence (raised with vertical-align, no <sup> wrapper), so it counts as
  // part of the line of text for touch target rules.
  return (
    <a
      id={`${prefix}-ref-${id}`}
      href={`#${prefix}-${id}`}
      className={cn(
        'ml-0.5 rounded-sm px-0.5 align-super text-[0.75em] font-medium leading-none tabular-nums text-text no-underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span className="sr-only">{label} </span>
      {n}
    </a>
  )
}

export interface FootnotesProps extends React.HTMLAttributes<HTMLElement> {
  notes: FootnoteItem[]
  title?: string
  backLabel?: string
}

export function Footnotes({ notes, title = 'Notes', backLabel = 'Back to text', className, ...props }: FootnotesProps) {
  const { prefix } = React.useContext(Ctx)
  const titleId = `${prefix}-title`
  return (
    <section aria-labelledby={titleId} className={cn('mt-12 max-w-[65ch] border-t border-border pt-6', className)} {...props}>
      <h2 id={titleId} className="text-body font-semibold text-text">
        {title}
      </h2>
      <ol className="m-0 mt-3 grid list-none gap-3 p-0">
        {notes.map((n, i) => (
          <li key={n.id} id={`${prefix}-${n.id}`} className="grid scroll-mt-16 grid-cols-[2ch_minmax(0,1fr)] gap-3 text-body leading-[var(--lh-normal)] text-text-muted">
            <span className="tabular-nums text-text-subtle">{i + 1}.</span>
            <span className="break-keep [overflow-wrap:break-word]">
              {n.content}{' '}
              <a
                href={`#${prefix}-ref-${n.id}`}
                className="rounded-sm text-text underline underline-offset-4 outline-none hover:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {backLabel}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
